// Real Supabase Auth + PostgREST integration tests. Runs only against the
// Docker stack started from this checkout. Never fetches production data.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {commitStagedImport} from '../lib/staged-import-commit.ts';

const endpoint=process.env.CC_TEST_SUPABASE_URL;
const anon=process.env.CC_TEST_SUPABASE_ANON_KEY;
const serviceKey=process.env.CC_TEST_SUPABASE_SERVICE_KEY;
if(process.env.CC_ISOLATED_DB!=='YES')throw Error('Refusing DB tests without explicit isolated flag.');
let origin;try{origin=new URL(endpoint);}catch{throw Error('Missing isolated Supabase URL.');}
if(!['localhost','127.0.0.1','::1'].includes(origin.hostname)||
 ![54321,8000].includes(Number(origin.port)))throw Error('Refusing nonlocal Supabase endpoint.');
if(!anon||!serviceKey||anon===serviceKey)throw Error('Missing local Supabase anon/service keys.');
const options={auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}};
const admin=createClient(endpoint,serviceKey,options);
const publicClient=()=>createClient(endpoint,anon,options);
const label=(s)=>{process.stdout.write('PASS isolated: '+s+'\n');};
const expectOk=(result,label)=>{if(result.error)throw Error(label+': '+result.error.message);return result.data;};
const password='LocalOnlyPass-A9!'+randomUUID().slice(0,8);

async function user(role){
 const email='isolated-'+role+'-'+randomUUID().slice(0,8)+'@example.invalid';
 const created=expectOk(await admin.auth.admin.createUser({email,password,email_confirm:true}),role+' user');
 const client=publicClient();
 const auth=expectOk(await client.auth.signInWithPassword({email,password}),role+' sign in');
 assert.equal(auth.user?.id,created.user.id,'local GoTrue must issue a user session');
 assert.ok(auth.session?.access_token,'signed-in JWT required');
 return {id:created.user.id,client};
}
const owner=await user('owner'),viewer=await user('viewer'),outside=await user('outside'),editor=await user('editor');
const orgA=expectOk(await admin.from('organizations').insert({name:'Isolated Organization A'}).select('id').single(),'org A').id;
const orgB=expectOk(await admin.from('organizations').insert({name:'Isolated Organization B'}).select('id').single(),'org B').id;
expectOk(await admin.from('organization_members').insert([
 {organization_id:orgA,user_id:owner.id,role:'owner'},
 {organization_id:orgA,user_id:viewer.id,role:'viewer'},
 {organization_id:orgA,user_id:editor.id,role:'editor'},
 {organization_id:orgB,user_id:outside.id,role:'owner'}
]),'membership seed');
label('GoTrue sign-in issued actual authenticated JWTs for owner, editor, viewer and second organization');

async function staged(name,org=orgA,submittedBy=owner.id){
 const id=randomUUID();
 const row=expectOk(await admin.from('lead_import_rows').insert({
  id,organization_id:org,submitted_by:submittedBy,batch_id:randomUUID(),
  row_number:1,name,city:'Brighton',category:'amenity:dentist',
  source_type:'public_directory',source_url:'https://example.org/record/'+id,
  raw_data:{street:'21 Cambridge St',postcode:'02135'},review_status:'pending'
 }).select('id,name,matched_business_id,review_status').single(),'stage '+name);
 return row;
}
const payload=(row,client=owner.client,org=orgA)=>({
 supabase:client,organizationId:org,row,
 baseRecord:{organization_id:org,name:row.name,city:'Brighton',
  category:'amenity:dentist',verification_status:'pending'},
 qualifiedRecord:{primary_opportunity:'website_design',evidence_confidence:'low'},
 evidence:[{source_url:'https://example.org/lead/'+row.id,source_type:'public_directory',
  raw_name:row.name,raw_address:'21 Cambridge St',registration_number:null,confidence:'pending'},
  {source_url:'https://example.org/social/'+row.id,source_type:'social_profile',
   raw_name:row.name,raw_address:null,registration_number:null,confidence:'pending'}]
});
async function countRecords(row){
 const business=expectOk(await admin.from('businesses').select('id').eq('organization_id',orgA).eq('id',row.id),'CRM count');
 const sources=expectOk(await admin.from('business_sources').select('id,source_type,source_url').eq('organization_id',orgA).eq('business_id',row.id),'source count');
 const queue=expectOk(await admin.from('lead_import_rows').select('review_status,matched_business_id').eq('id',row.id).single(),'staging count');
 return {business,sources,queue};
}
async function assertCompletedExactlyOnce(row){
 const v=await countRecords(row);
 assert.equal(v.business.length,1,'exactly one CRM business');
 assert.equal(v.sources.length,2,'exactly two distinct evidence sources');
 assert.equal(new Set(v.sources.map(x=>x.id)).size,2);
 assert.equal(v.queue.review_status,'imported');
 assert.equal(v.queue.matched_business_id,row.id);
}

// Every fault occurs after real database operations using an AUTHENTICATED
// (never service-role) client. The admin client is used only to seed/inspect.
for(const fault of ['after_business','after_claim','after_sources','before_completion']){
 const row=await staged('Fault '+fault);
 await assert.rejects(commitStagedImport({...payload(row),
  onPhase:phase=>{if(phase===fault)throw Error('Injected test failure: '+fault);}}),
 /Injected test failure/);
 let partial=await countRecords(row);
 assert.equal(partial.business.length,1);
 assert.equal(partial.queue.review_status,'pending');
 const resumed=await commitStagedImport({...payload(row)});
 assert.equal(resumed.businessId,row.id);
 assert.equal(resumed.resumed,true);
 await assertCompletedExactlyOnce(row);
 label('fault recovery at '+fault+' without a duplicate business or source');
}
const normal=await staged('Successful import');
const complete=await commitStagedImport(payload(normal));
assert.equal(complete.resumed,false);
await assertCompletedExactlyOnce(normal);
await assert.rejects(commitStagedImport(payload(normal)),/not pending/);
label('normal import completes and completed row is not importable twice');

// A real database CHECK-constraint rejection, not a synthetic network throw:
// partial CRM creation and staging claim must be recoverable after fixing the
// evidence payload. This proves the normal PostgREST error branch.
const constraintRow=await staged('Source check constraint failure');
const validConstraint=payload(constraintRow);
const badConstraint={...validConstraint,evidence:validConstraint.evidence.map(x=>({...x,confidence:'rejected_not_allowed'}))};
await assert.rejects(commitStagedImport(badConstraint),/source evidence remains incomplete/);
const constraintPartial=await countRecords(constraintRow);
assert.equal(constraintPartial.business.length,1);
assert.equal(constraintPartial.sources.length,0);
assert.equal(constraintPartial.queue.review_status,'pending');
assert.equal(constraintPartial.queue.matched_business_id,constraintRow.id);
const constraintFixed=await commitStagedImport(validConstraint);
assert.equal(constraintFixed.resumed,true);
await assertCompletedExactlyOnce(constraintRow);
label('actual PostgreSQL evidence CHECK-constraint failure recovers without duplicate CRM or sources');

// Two authenticated editors submitting the exact same row in parallel.
const shared=await staged('Concurrency probe');
const race=await Promise.allSettled([
 commitStagedImport(payload(shared,owner.client)),
 commitStagedImport(payload(shared,editor.client))
]);
const afterRace=await countRecords(shared);
assert.equal(afterRace.business.length,1,'parallel create cannot create a second business');
if(afterRace.queue.review_status==='pending')await commitStagedImport(payload(shared));
await assertCompletedExactlyOnce(shared);
assert.ok(race.every(x=>x.status==='fulfilled'||x.status==='rejected'));
label('parallel authenticated writers converge on one CRM and two evidence rows');

// True Postgres RLS under different signed-in roles and organizations.
const cannotWrite=await viewer.client.from('businesses').insert({
 organization_id:orgA,name:'Viewer cannot create'
}).select('id');
assert.ok(cannotWrite.error,'viewer INSERT must be rejected by RLS');
const crossRead=expectOk(await outside.client.from('businesses').select('id').eq('id',normal.id),'cross-org read');
assert.equal(crossRead.length,0,'org B cannot read org A lead');
const crossStage=expectOk(await outside.client.from('lead_import_rows').select('id').eq('organization_id',orgA),'cross-org stage read');
assert.equal(crossStage.length,0,'org B cannot read org A staging');
const crossSource=expectOk(await outside.client.from('business_sources').select('id').eq('business_id',normal.id),'cross-org evidence read');
assert.equal(crossSource.length,0,'org B cannot read org A source evidence');
const forbidden=await outside.client.from('business_sources').insert({
 id:randomUUID(),organization_id:orgB,business_id:normal.id,
 source_type:'illicit',source_url:'https://example.org/cross-org',confidence:'pending'
});
assert.ok(forbidden.error,'cross-org source INSERT denied');
const viewStage=await viewer.client.from('lead_import_rows').update({review_status:'skipped'}).eq('id',shared.id).select('id');
assert.ok(viewStage.error||!viewStage.data?.length,'viewer may not update staging');
const anonRead=await publicClient().from('businesses').select('id').eq('id',normal.id);
assert.ok(anonRead.error||!anonRead.data?.length,'anonymous role may not read private CRM');
label('PostgreSQL RLS blocks viewer writes, unauthenticated reads and cross-organization access');

// An authorized user must not be allowed to spoof a different organization.
const otherRow=await staged('Other organization',orgB,outside.id);
await assert.rejects(commitStagedImport(payload(otherRow,owner.client,orgB)),
 /CRM insert failed|permission|row-level security|blocked|Cannot verify/i);
const outsiderOwn=await commitStagedImport({...payload(otherRow,outside.client,orgB)});
assert.equal(outsiderOwn.businessId,otherRow.id);
label('org A editor cannot write org B while org B owner can');

process.stdout.write('PASS: isolated signed-in Supabase Auth and PostgREST import verification complete.\n');
