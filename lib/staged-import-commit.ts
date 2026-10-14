// The same database-write routine is used by the signed-in Next.js action
// and isolated Supabase Auth/PostgREST integration tests. No service-role
// privileges are used here: callers supply their authenticated user client.
import type {SupabaseClient} from '@supabase/supabase-js';
import {importRecoveryDecision,missingImportEvidence,deterministicSourceId} from './staged-import-recovery.ts';

export type StagedImportRow={
 id:string;name:string|null;review_status:string;matched_business_id:string|null;
};
export type StagedSource={
 source_url:string;source_type:string;raw_name:string|null;
 raw_address:string|null;registration_number:string|null;confidence:'pending';
};
export type ImportPhase='before_business'|'after_business'|'after_claim'|'before_sources'|'after_sources'|'before_completion';
export type ImportCommitInput={
 supabase:SupabaseClient;organizationId:string;row:StagedImportRow;
 baseRecord:Record<string,unknown>;qualifiedRecord?:Record<string,unknown>;
 evidence:StagedSource[];onPhase?:(phase:ImportPhase)=>Promise<void>|void;
};
async function runHook(onPhase:ImportCommitInput['onPhase'],phase:ImportPhase){
 if(onPhase)await onPhase(phase);
}

export async function commitStagedImport({
 supabase,organizationId,row,baseRecord,qualifiedRecord={},evidence,onPhase
}:ImportCommitInput):Promise<{businessId:string;resumed:boolean}>{
 if(row.review_status!=='pending')throw Error('Staged row is not pending.');
 // Prefer a real single-transaction PostgreSQL RPC when it is installed.
 // ONLY the missing-function PostgREST error permits the legacy compatible
 // recovery path. SQL permission/constraint errors must never be retried as
 // separate writes, otherwise an atomic rejection could be bypassed.
 // Fault hooks intentionally exercise the older staged fallback in CI.
 if(!onPhase){
  const atomicEvidence=evidence.map(x=>({
   ...x,id:deterministicSourceId(row.id,x.source_type,x.source_url)
  }));
  const {data:atomic,error:atomicError}=await supabase.rpc('commit_staged_import_atomic',{
   p_row_id:row.id,p_organization_id:organizationId,
   p_business:baseRecord,p_qualification:qualifiedRecord,
   p_sources:atomicEvidence
  });
  if(!atomicError){
   const first=Array.isArray(atomic)?atomic[0]:atomic;
   if(!first?.business_id)throw Error('Atomic import returned no CRM business ID');
   return {businessId:first.business_id as string,resumed:Boolean(first.resumed)};
  }
  if(atomicError.code!=='PGRST202'){
   throw Error('Atomic staged import rejected: '+atomicError.message);
  }
 }
 const recoveryId=row.matched_business_id||row.id;
 const {data:linkedBusiness,error:linkError}=await supabase.from('businesses')
  .select('id,name').eq('organization_id',organizationId).eq('id',recoveryId).maybeSingle();
 if(linkError)throw Error('Cannot verify previous CRM import; refusing to create a duplicate: '+linkError.message);
 const decision=importRecoveryDecision(row,linkedBusiness);
 if(decision==='blocked')throw Error('Staged import is blocked by a missing or mismatched CRM link.');
 const resumed=decision==='resume';
 let businessId:string;
 if(resumed){businessId=linkedBusiness!.id;}
 else{
  await runHook(onPhase,'before_business');
  let {data:created,error}=await supabase.from('businesses')
   .insert({id:row.id,...baseRecord,...qualifiedRecord}).select('id').single();
  if(error&&/column|schema cache/i.test(error.message)){
   // Migration 0007 may not yet be applied in the user's live instance.
   ({data:created,error}=await supabase.from('businesses')
    .insert({id:row.id,...baseRecord}).select('id').single());
  }
  if(error&&/duplicate key|unique constraint/i.test(error.message)){
   throw Error('This staged row already created a CRM record. Reload and resume instead of inserting another.');
  }
  if(error||!created)throw Error('CRM insert failed: '+(error?.message||'no record returned'));
  businessId=created.id;
  await runHook(onPhase,'after_business');
 }
 if(!row.matched_business_id){
  const {data:claimed,error:claimError}=await supabase.from('lead_import_rows')
   .update({matched_business_id:businessId})
   .eq('id',row.id).eq('organization_id',organizationId)
   .eq('review_status','pending').is('matched_business_id',null)
   .select('id').maybeSingle();
  if(claimError)throw Error('CRM business '+businessId+' exists; staging recovery link write failed: '+claimError.message);
  if(!claimed){
   // The caller may have read an earlier snapshot while another request
   // successfully saved the recovery link. Accept only an exact match still
   // awaiting completion, never a different CRM record or finished row.
   const {data:latest,error:readError}=await supabase.from('lead_import_rows')
    .select('matched_business_id,review_status')
    .eq('id',row.id).eq('organization_id',organizationId).maybeSingle();
   if(readError||!latest)throw Error('CRM business '+businessId+' exists; unable to verify staged recovery row.');
   if(latest.review_status!=='pending')throw Error('Staged row is not pending; it was already reviewed or imported.');
   if(latest.matched_business_id!==businessId){
    throw Error('CRM business '+businessId+' exists; staged link points elsewhere. Reload and review.');
   }
  }
 }
 await runHook(onPhase,'after_claim');
 const desired=evidence.map(x=>({
  ...x,id:deterministicSourceId(row.id,x.source_type,x.source_url),
  business_id:businessId,organization_id:organizationId
 }));
 const present:{source_type:string;source_url:string|null}[]=[];
 for(const item of desired){
  const {data:found,error:lookupError}=await supabase.from('business_sources')
   .select('source_type,source_url').eq('organization_id',organizationId)
   .eq('business_id',businessId).eq('source_type',item.source_type)
   .eq('source_url',item.source_url).limit(1);
  if(lookupError)throw Error('Cannot verify prior source evidence for '+businessId+': '+lookupError.message);
  if(found?.length)present.push(...found);
 }
 const missing=missingImportEvidence(desired,present);
 await runHook(onPhase,'before_sources');
 if(missing.length){
  const {error:srcError}=await supabase.from('business_sources').insert(missing);
  if(srcError)throw Error('CRM business '+businessId+' exists but source evidence remains incomplete: '+srcError.message);
 }
 await runHook(onPhase,'after_sources');
 await runHook(onPhase,'before_completion');
 const {data:completed,error:completeError}=await supabase.from('lead_import_rows')
  .update({review_status:'imported'}).eq('id',row.id)
  .eq('organization_id',organizationId).eq('review_status','pending')
  .eq('matched_business_id',businessId).select('id').maybeSingle();
 if(completeError||!completed)throw Error(
  'CRM business '+businessId+' exists but final staged-row update failed. Review or resume.');
 return {businessId,resumed};
}
