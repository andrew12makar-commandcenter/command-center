'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomUUID } from 'node:crypto';
import { requireWorkspace, shortText, validUuid, webUrl } from '@/lib/workspace';
import { parseCsv, normalizedHeader } from '@/lib/csv';
import {classifyWebPresence,validateBusinessWebsite,discoveredProfile} from '@/lib/web-presence';
import {collectAllPages,potentialMatches,streetFromRaw,postcodeFromRaw,researchServiceArea,type BusinessIdentity} from '@/lib/lead-identity';
import {validateCampaignInput} from '@/lib/discovery-campaigns';
import {resolveCampaign} from '@/lib/discovery-campaigns-server';
import {OPPORTUNITIES,CONFIDENCES,NEXT_ACTIONS,qualifyStagedRow,type Qualification} from '@/lib/prospect-qualification';
import type {TargetService} from '@/lib/discovery-campaigns';

const STAGES = ['not_contacted','contacted','visited','proposal_sent','won','lost'];
const OPERATIONS = ['unknown','operating','opening','closed'];
const ACTIVITIES = ['note','call','email','visit','meeting','proposal','status'];

function followUp(s:string): string | null {
  if(!s) return null;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) throw new Error('Invalid follow-up date.');
  return s;
}

function scoreInput(s:string): number|null {
  if(!s) return null;
  const n=Number(s);
  if(!Number.isInteger(n) || n<0 || n>100) throw new Error('Score must be an integer from 0 to 100.');
  return n;
}

export async function createLead(form: FormData) {
  const { supabase, organizationId } = await requireWorkspace(true);
  const name=shortText(form.get('name'));
  if(name.length<2) throw new Error('Please enter the business name.');
  const priority_score=scoreInput(shortText(form.get('priority_score'),4));
  const score_rationale=shortText(form.get('score_rationale'),500);
  if(priority_score!==null && score_rationale.length<8) throw new Error('Provide evidence for the opportunity score.');
  const { data, error } = await supabase.from('businesses').insert({
    organization_id:organizationId,name,category:shortText(form.get('category')),
    city:shortText(form.get('city')),street_address:shortText(form.get('street_address')),
    postal_code:shortText(form.get('postal_code')),service_area:shortText(form.get('service_area')),
    website_url:validateBusinessWebsite(shortText(form.get('website_url'),1024)),phone:shortText(form.get('phone')),
    contact_name:shortText(form.get('contact_name')),contact_email:shortText(form.get('contact_email')),
    google_business_url:webUrl(form.get('google_business_url')),
    notes:shortText(form.get('notes'),3000),priority_score,score_rationale,
    verification_status:'unverified',pipeline_status:'not_contacted',
  }).select('id').single();
  if(error || !data) throw new Error('Unable to save lead: '+(error?.message??'unknown error'));
  revalidatePath('/app');
  revalidatePath('/app/leads');
  redirect('/app/leads/'+data.id);
}

export async function updateLead(form: FormData) {
  const { supabase, organizationId, user } = await requireWorkspace(true);
  const id=shortText(form.get('id'),64);
  if(!validUuid(id)) throw new Error('Invalid lead ID.');
  const stage=shortText(form.get('pipeline_status'));
  if(!STAGES.includes(stage)) throw new Error('Invalid pipeline stage.');
  const operational_status=shortText(form.get('operational_status'));
  if(!OPERATIONS.includes(operational_status)) throw new Error('Invalid operating status.');
  const priority_score=scoreInput(shortText(form.get('priority_score'),4));
  const score_rationale=shortText(form.get('score_rationale'),500);
  if(priority_score!==null && score_rationale.length<8) throw new Error('Opportunity scores need an evidence-based rationale.');
  const { data: prior } = await supabase.from('businesses')
    .select('pipeline_status,website_url').eq('id',id).eq('organization_id',organizationId).single();
  if(!prior) throw new Error('Lead not found.');
  const website_url=validateBusinessWebsite(shortText(form.get('website_url'),1024));
  const previousPresence=classifyWebPresence(prior.website_url);
  if((previousPresence.kind==='social'||previousPresence.kind==='listing')&&
     website_url!==prior.website_url)throw new Error('Move the existing social/directory profile into research evidence before changing the website field. This prevents losing the recorded URL.');
  const { error } = await supabase.from('businesses').update({
    pipeline_status:stage,operational_status,
    category:shortText(form.get('category'),180),
    ...(operational_status !== 'operating' ? {verification_status:'pending'} : {}),
    priority_score,score_rationale,
    next_follow_up_on:followUp(shortText(form.get('next_follow_up_on'),10)),
    contact_name:shortText(form.get('contact_name')),
    contact_email:shortText(form.get('contact_email')),
    website_url,
    google_business_url:webUrl(form.get('google_business_url')),
    notes:shortText(form.get('notes'),3000),
    updated_at:new Date().toISOString(),
    ...(stage!==prior.pipeline_status && ['contacted','visited','proposal_sent','won'].includes(stage) ? {last_contact_at:new Date().toISOString()}:{}),
  }).eq('id',id).eq('organization_id',organizationId);
  if(error) throw new Error(error.message);
  if(prior.pipeline_status!==stage) {
    const {error: activityError}=await supabase.from('business_activities').insert({
      organization_id:organizationId,business_id:id,actor_id:user.id,
      activity_type:'status',details:'Pipeline changed from '+prior.pipeline_status+' to '+stage,
    });
    if(activityError) throw new Error('Pipeline updated, but activity logging failed: '+activityError.message);
  }
  revalidatePath('/app');revalidatePath('/app/leads');revalidatePath('/app/leads/'+id);
  redirect('/app/leads/'+id);
}

export async function addActivity(form: FormData) {
  const { supabase, organizationId, user }=await requireWorkspace(true);
  const id=shortText(form.get('business_id'),64);
  const activity_type=shortText(form.get('activity_type'));
  const details=shortText(form.get('details'),1800);
  if(!validUuid(id) || !ACTIVITIES.includes(activity_type) || !details) throw new Error('Complete the activity form.');
  const {error}=await supabase.from('business_activities').insert({
    organization_id:organizationId,business_id:id,actor_id:user.id,activity_type,details,
  });
  if(error) throw new Error(error.message);
  revalidatePath('/app/leads/'+id);
  redirect('/app/leads/'+id);
}

export async function addSource(form: FormData) {
  const { supabase, organizationId }=await requireWorkspace(true);
  const id=shortText(form.get('business_id'),64);
  const source_url=webUrl(form.get('source_url'));
  if(!validUuid(id) || !source_url) throw new Error('A link to the original evidence is required.');
  const sourceKind=classifyWebPresence(source_url).kind;
  const evidenceType=sourceKind==='social'||sourceKind==='listing'?'social_profile':shortText(form.get('source_type'))||'public_record';
  const {error}=await supabase.from('business_sources').insert({
    organization_id:organizationId,business_id:id,
    source_url,source_type:evidenceType,
    agency:shortText(form.get('agency')),registration_number:shortText(form.get('registration_number')),
    raw_name:shortText(form.get('raw_name')),raw_address:shortText(form.get('raw_address')),
    confidence:'pending',
  });
  if(error) throw new Error(error.message);
  revalidatePath('/app/leads/'+id);
  redirect('/app/leads/'+id);
}

// Profiles are useful public-presence research, not independent verification
// of the registered company or its current operating status.
export async function moveProfileFromWebsite(form:FormData){
 const {supabase,organizationId}=await requireWorkspace(true);
 const id=shortText(form.get('business_id'),64);
 if(!validUuid(id))throw new Error('Invalid business ID.');
 const {data:business,error}=await supabase.from('businesses')
  .select('id,name,website_url').eq('id',id).eq('organization_id',organizationId).maybeSingle();
 if(error||!business)throw new Error('Business not found.');
 const presence=classifyWebPresence(business.website_url);
 if((presence.kind!=='social'&&presence.kind!=='listing')||!presence.url)
  throw new Error('This record does not contain a social or directory profile in its website field.');
 const {data:existing,error:readError}=await supabase.from('business_sources').select('id')
  .eq('business_id',id).eq('organization_id',organizationId).eq('source_url',presence.url).limit(1);
 if(readError)throw new Error('Could not check existing profile evidence: '+readError.message);
 if(!existing?.length){
  const {error:saveError}=await supabase.from('business_sources').insert({
   organization_id:organizationId,business_id:id,source_url:presence.url,
   source_type:'social_profile',raw_name:business.name,confidence:'pending'
  });
  if(saveError)throw new Error('Could not preserve social profile: '+saveError.message);
 }
 const {data:updated,error:updateError}=await supabase.from('businesses')
  .update({website_url:null,updated_at:new Date().toISOString()})
  .eq('id',id).eq('organization_id',organizationId).eq('website_url',business.website_url)
  .select('id').maybeSingle();
 if(updateError||!updated)throw new Error('Profile evidence saved, but website field was not changed. Reload before retrying.');
 revalidatePath('/app/leads/'+id);revalidatePath('/app/leads');
 revalidatePath('/app/intelligence');revalidatePath('/app/opportunities');
 redirect('/app/leads/'+id);
}

export async function confirmSource(form: FormData) {
  const {supabase,organizationId}=await requireWorkspace(true);
  const id=shortText(form.get('business_id'),64), sourceId=shortText(form.get('source_id'),64);
  if(!validUuid(id)||!validUuid(sourceId)) throw new Error('Invalid source.');
  const {data:source,error:readError}=await supabase.from('business_sources')
    .select('source_type,source_url').eq('id',sourceId).eq('business_id',id)
    .eq('organization_id',organizationId).maybeSingle();
  if(readError||!source)throw new Error('Original evidence was not found.');
  const kind=classifyWebPresence(source.source_url).kind;
  if(source.source_type==='social_profile'||kind==='social'||kind==='listing')
    throw new Error('Social profiles and third-party listings cannot verify business identity or operating status. Attach an independent source.');
  const {error}=await supabase.from('business_sources').update({
    confidence:'matched',verified_at:new Date().toISOString(),
  }).eq('id',sourceId).eq('business_id',id).eq('organization_id',organizationId);
  if(error) throw new Error(error.message);
  revalidatePath('/app/leads/'+id);
  redirect('/app/leads/'+id);
}

export async function markVerified(form: FormData) {
  const {supabase,organizationId}=await requireWorkspace(true);
  const id=shortText(form.get('business_id'),64);
  if(!validUuid(id)) throw new Error('Invalid lead ID.');
  const {data:lead}=await supabase.from('businesses').select('operational_status')
    .eq('id',id).eq('organization_id',organizationId).maybeSingle();
  if(lead?.operational_status!=='operating') throw new Error('Confirm that the business is currently operating before marking verified.');
  const {data:matchedSources,error:sourceError}=await supabase.from('business_sources')
    .select('source_type,source_url')
    .eq('business_id',id).eq('organization_id',organizationId).eq('confidence','matched').limit(1000);
  if(sourceError)throw new Error('Could not check business source verification.');
  const independentMatch=(matchedSources??[]).some(source=>
    source.source_type!=='social_profile'&&
    !['social','listing'].includes(classifyWebPresence(source.source_url).kind));
  if(!independentMatch)throw new Error('A social account or directory listing alone cannot verify the operating business. Review and match an independent source first.');
  const {error}=await supabase.from('businesses').update({
    verification_status:'verified',last_checked_at:new Date().toISOString(),updated_at:new Date().toISOString()
  }).eq('id',id).eq('organization_id',organizationId);
  if(error) throw new Error(error.message);
  revalidatePath('/app');revalidatePath('/app/leads');revalidatePath('/app/leads/'+id);
  redirect('/app/leads/'+id);
}

export async function stageCsv(form: FormData) {
  const {supabase,organizationId,user}=await requireWorkspace(true);
  const file=form.get('csv_file');
  if(!(file instanceof File) || !file.size || file.size>750_000) redirect('/app/leads/import?error=file');
  let rows:string[][];
  try {rows=parseCsv(await file.text());} catch{redirect('/app/leads/import?error=parse');}
  if(rows.length<2 || rows.length>501) redirect('/app/leads/import?error=length');
  const headers=rows[0].map(normalizedHeader);
  const pick=(obj:Record<string,string>,keys:string[])=>keys.map(k=>obj[k]??'').find(Boolean)??'';
  // Campaign attribution is optional for CSV intake; without one, behavior is unchanged.
  const existingCampaign=shortText(form.get('campaign_id'),64);
  const newCampaignName=shortText(form.get('campaign_name'),120);
  const campaign=existingCampaign||newCampaignName?await resolveCampaign(supabase,organizationId,user.id,existingCampaign,
    existingCampaign?null:validateCampaignInput({name:newCampaignName,target_area:form.get('target_area'),industry:'any',
      keyword:form.get('target_industry'),target_service:form.get('target_service'),discovery_source:'csv_import'})):null;
  const batchId=randomUUID();
  const entries=rows.slice(1).map((row,i)=>{
    const raw_data:Record<string,string>={};
    headers.forEach((h,j)=>{if(h)raw_data[h]=String(row[j]??'').slice(0,2000)});
    const name=pick(raw_data,['businessname','companyname','name','business']).slice(0,180);
    const city=pick(raw_data,['city','town','municipality']).slice(0,180);
    const recordedWebsite=pick(raw_data,['website','websiteurl','url']).slice(0,1024);
  const presence=classifyWebPresence(recordedWebsite);
  const website_url=presence.kind==='website'?presence.url||'':'';
  if(presence.kind==='social'||presence.kind==='listing')raw_data.discovered_social_profile_url=presence.url||'';
    const source_url=pick(raw_data,['sourceurl','recordurl','registryurl','evidenceurl']).slice(0,1024);
    return {
      organization_id:organizationId,submitted_by:user.id,batch_id:batchId,row_number:i+2,
      name,city,category:pick(raw_data,['category','industry','type']).slice(0,180),
      website_url,phone:pick(raw_data,['phone','phonenumber','telephone']).slice(0,120),
      source_url,source_type:pick(raw_data,['sourcetype','source','registry']).slice(0,120),
      raw_data,review_status:name.length<2?'invalid':'pending',
      ...(campaign?{campaign_id:campaign.id}:{})
    };
  });
  const {error}=await supabase.from('lead_import_rows').insert(entries);
  if(error) throw new Error('Unable to stage file: '+error.message);
  revalidatePath('/app/leads/import');
  redirect('/app/leads/import?staged='+entries.length);
}

export async function approveImportedRow(form: FormData) {
  const {supabase,organizationId}=await requireWorkspace(true);
  const id=shortText(form.get('row_id'),64);
  if(!validUuid(id)) throw new Error('Invalid staging row.');
  const {data: row,error:readError}=await supabase.from('lead_import_rows')
    .select('*').eq('id',id).eq('organization_id',organizationId).eq('review_status','pending').maybeSingle();
  if(readError || !row) throw new Error('Staged row is no longer pending.');
  if(!row.name || row.name.length<2) throw new Error('No business name.');
  if(row.triage_status==='disqualified')throw new Error('This candidate is disqualified. Restore it to review before importing.');
  // Check every CRM page. Comparing only the first 1,000 silently loses duplicates at scale.
  const candidates=await collectAllPages<BusinessIdentity>(async (from,to)=>{
    const {data,error}=await supabase.from('businesses')
      .select('id,name,city,street_address,postal_code,phone,website_url')
      .eq('organization_id',organizationId).order('created_at',{ascending:true})
      .order('id',{ascending:true}).range(from,to);
    return {data,error};
  });
  const matches=potentialMatches(row,candidates,10);
  // Even an identical name in the same city may be a different storefront or branch.
  // Require deliberate acknowledgement instead of silently deleting it as a duplicate.
  if(matches.length && form.get('confirm_distinct')!=='yes'){
    throw new Error('Similar businesses exist in your CRM. Review the linked records and confirm that this is a separate business before importing.');
  }
  let website_url:string|null,source_url:string|null;
  try {website_url=webUrl(row.website_url);source_url=webUrl(row.source_url);}
  catch {throw new Error('The staged website/source URL is invalid. Correct the CSV and re-import.');}
  const raw=(row.raw_data??{}) as Record<string,unknown>;
  const street_address=streetFromRaw(raw),postal_code=postcodeFromRaw(raw);
  const service_area=researchServiceArea(raw);
  const socialUrl=discoveredProfile((row.raw_data??{}) as Record<string,unknown>,row.website_url);
  const officialWebsite=validateBusinessWebsite(website_url&&classifyWebPresence(website_url).kind==='website'?website_url:null);
  // Carry the deterministic qualification (or the operator's overrides) into the CRM.
  // priority_score is never set here; it stays a manual, evidence-backed CRM field.
  let campaignService:TargetService|null=null;
  if(row.campaign_id){
    const {data:campaign}=await supabase.from('discovery_campaigns').select('target_service')
      .eq('organization_id',organizationId).eq('id',row.campaign_id).maybeSingle();
    campaignService=(campaign?.target_service as TargetService|undefined)??null;
  }
  const q=qualifyStagedRow(row,{targetService:campaignService,duplicateWarning:false});
  const carried=qualificationColumns(q,row.campaign_id??null);
  const rawText=(keys:string[])=>keys.map(k=>raw[k]).find((v):v is string=>typeof v==='string'&&v.trim().length>0)?.trim().slice(0,180)||null;
  let gbpUrl:string|null=null;
  try{gbpUrl=webUrl(rawText(['googlebusinessurl','gbpurl','googlebusinessprofile','googlemapsurl']));}catch{gbpUrl=null;}
  const contact={
    ...(rawText(['email','contactemail'])?{contact_email:rawText(['email','contactemail'])}:{}),
    ...(rawText(['contactname','owner','ownername'])?{contact_name:rawText(['contactname','owner','ownername'])}:{}),
    ...(gbpUrl?{google_business_url:gbpUrl}:{}),
  };
  const baseRecord={
    organization_id:organizationId,name:row.name,city:row.city||null,category:row.category,
    phone:row.phone,website_url:officialWebsite,verification_status:source_url?'pending':'unverified',
    ...(street_address?{street_address}:{}),...(postal_code?{postal_code}:{}),
    ...(service_area?{service_area}:{}),...contact
  };
  let {data:business,error}=await supabase.from('businesses').insert({...baseRecord,...carried}).select('id').single();
  if(error&&/column|schema cache/i.test(error.message)){
    // Migration 0007 not applied yet: keep the existing import path working without the new fields.
    ({data:business,error}=await supabase.from('businesses').insert(baseRecord).select('id').single());
  }
  if(error||!business)throw new Error(error?.message??'Failed to insert business');
  const evidence=[];
  if(source_url)evidence.push({
    organization_id:organizationId,business_id:business.id,
    source_url,source_type:row.source_type||'csv_import',raw_name:row.name,
    raw_address:street_address||null,
    registration_number:typeof raw.external_id==='string'?raw.external_id:null,
    confidence:'pending'
  });
  if(socialUrl&&socialUrl!==source_url)evidence.push({
    organization_id:organizationId,business_id:business.id,
    source_url:socialUrl,source_type:'social_profile',raw_name:row.name,
    raw_address:null,registration_number:null,confidence:'pending'
  });
  if(evidence.length){
    const {error:srcError}=await supabase.from('business_sources').insert(evidence);
    if(srcError)throw new Error('Business created, but evidence insert failed: '+srcError.message);
  }
  const {error:updateError}=await supabase.from('lead_import_rows')
    .update({review_status:'imported',matched_business_id:business.id})
    .eq('id',id).eq('organization_id',organizationId).eq('review_status','pending');
  if(updateError)throw new Error('Business created, but staging update failed: '+updateError.message);
  revalidatePath('/app');revalidatePath('/app/leads');revalidatePath('/app/leads/import');revalidatePath('/app/opportunities');
  redirect(form.get('open_crm')==='yes'?'/app/leads/'+business.id:queueReturn(form));
}

export async function skipImportedRow(form:FormData){
  const {supabase,organizationId}=await requireWorkspace(true);
  const id=shortText(form.get('row_id'),64);
  if(!validUuid(id)) throw new Error('Invalid staging row.');
  const {error}=await supabase.from('lead_import_rows').update({review_status:'skipped'})
    .eq('id',id).eq('organization_id',organizationId).eq('review_status','pending');
  if(error) throw new Error(error.message);
  revalidatePath('/app/leads/import');
  redirect(queueReturn(form));
}

// Explicitly link an already-known business instead of manufacturing a second CRM record.
export async function linkImportedDuplicate(form:FormData){
 const {supabase,organizationId}=await requireWorkspace(true);
 const id=shortText(form.get('row_id'),64),businessId=shortText(form.get('matched_business_id'),64);
 if(!validUuid(id)||!validUuid(businessId))throw new Error('Invalid staging or business record.');
 if(form.get('confirm_same')!=='yes')throw Error('Confirm that the staged record and CRM record refer to the same business.');
 const [{data:row,error:rowError},{data:business,error:businessError}]=await Promise.all([
  supabase.from('lead_import_rows').select('*').eq('organization_id',organizationId)
    .eq('id',id).eq('review_status','pending').maybeSingle(),
  supabase.from('businesses').select('id,name,city,street_address,postal_code,phone,website_url')
    .eq('organization_id',organizationId).eq('id',businessId).maybeSingle()
 ]);
 if(rowError||businessError||!row||!business)throw Error('The pending row or CRM business could not be found.');
 const matches=potentialMatches(row,[business]);
 if(!matches.length)throw Error('These records do not share the same normalized business name. Verify them manually before linking.');
 const sourceUrl=webUrl(row.source_url);
 if(sourceUrl){
  const {data:prior,error:sourceError}=await supabase.from('business_sources').select('id')
    .eq('organization_id',organizationId).eq('business_id',businessId).eq('source_url',sourceUrl).limit(1);
  if(sourceError)throw Error('Could not check existing provenance: '+sourceError.message);
  if(!prior?.length){
   const raw=(row.raw_data??{}) as Record<string,unknown>;
   const {error:insertError}=await supabase.from('business_sources').insert({
    organization_id:organizationId,business_id:businessId,source_url:sourceUrl,
    source_type:row.source_type||'csv_import',raw_name:row.name,
    raw_address:streetFromRaw(raw)||null,
    registration_number:typeof raw.external_id==='string'?raw.external_id:null,
    confidence:'pending'
   });
   if(insertError)throw Error('Could not preserve new provenance: '+insertError.message);
  }
 }
 const {error}=await supabase.from('lead_import_rows').update({
  review_status:'duplicate',matched_business_id:businessId
 }).eq('organization_id',organizationId).eq('id',id).eq('review_status','pending');
 if(error)throw Error('Could not mark staged record as duplicate: '+error.message);
 if(row.campaign_id){
  // Fill gaps only; never overwrite a CRM record's existing campaign or qualification.
  await supabase.from('businesses').update({campaign_id:row.campaign_id})
   .eq('organization_id',organizationId).eq('id',businessId).is('campaign_id',null);
 }
 revalidatePath('/app');revalidatePath('/app/leads');revalidatePath('/app/leads/import');
 revalidatePath('/app/leads/'+businessId);
 redirect('/app/leads/'+businessId);
}

// ---- Prospect Research Queue triage (deliberate, per-row operator decisions) ----
function qualificationColumns(q:Qualification,campaignId:string|null){
 return {
  campaign_id:campaignId,primary_opportunity:q.primaryOpportunity,evidence_confidence:q.evidenceConfidence,
  next_action:q.nextAction,qualification_rationale:q.reasons.join(' ').slice(0,1200)||q.rationale,
 };
}
const TRIAGE_ACTIONS={shortlist:'shortlisted',hold:'held',disqualify:'disqualified',restore:'review_needed'} as const;
function queueReturn(form:FormData):string{
 const raw=shortText(form.get('return_to'),600);
 return raw.startsWith('/app/leads/import')&&!raw.startsWith('//')?raw:'/app/leads/import';
}
export async function triageStagedRow(form:FormData){
 const {supabase,organizationId}=await requireWorkspace(true);
 const id=shortText(form.get('row_id'),64);
 const action=shortText(form.get('triage'),20) as keyof typeof TRIAGE_ACTIONS;
 if(!validUuid(id)||!Object.hasOwn(TRIAGE_ACTIONS,action))throw new Error('Choose a valid staged record and action.');
 const reason=shortText(form.get('disqualification_reason'),500);
 if(action==='disqualify'&&reason.length<8)throw new Error('Record the evidence-backed reason for disqualifying (at least 8 characters).');
 const {data,error}=await supabase.from('lead_import_rows').update({
  triage_status:TRIAGE_ACTIONS[action],
  disqualification_reason:action==='disqualify'?reason:null,
 }).eq('id',id).eq('organization_id',organizationId).eq('review_status','pending').select('id').maybeSingle();
 if(error)throw new Error('Could not update the research status. Has migration 0007 been applied? '+error.message);
 if(!data)throw new Error('This staged record is no longer pending review.');
 revalidatePath('/app/leads/import');
 redirect(queueReturn(form));
}
export async function updateStagedQualification(form:FormData){
 const {supabase,organizationId}=await requireWorkspace(true);
 const id=shortText(form.get('row_id'),64);
 if(!validUuid(id))throw new Error('Invalid staged record.');
 const pick=<T extends string>(name:string,list:readonly T[]):T|null=>{
  const v=shortText(form.get(name),40);
  if(!v)return null;
  if(!list.includes(v as T))throw new Error('Invalid value for '+name.replaceAll('_',' ')+'.');
  return v as T;
 };
 const {data,error}=await supabase.from('lead_import_rows').update({
  primary_opportunity_override:pick('primary_opportunity_override',OPPORTUNITIES),
  evidence_confidence_override:pick('evidence_confidence_override',CONFIDENCES),
  next_action_override:pick('next_action_override',NEXT_ACTIONS),
 }).eq('id',id).eq('organization_id',organizationId).eq('review_status','pending').select('id').maybeSingle();
 if(error)throw new Error('Could not save the qualification. Has migration 0007 been applied? '+error.message);
 if(!data)throw new Error('This staged record is no longer pending review.');
 revalidatePath('/app/leads/import');
 redirect(queueReturn(form));
}

// CRM qualification: blank means "derive from recorded evidence". Never touches priority_score.
export async function updateBusinessQualification(form:FormData){
 const {supabase,organizationId}=await requireWorkspace(true);
 const id=shortText(form.get('business_id'),64);
 if(!validUuid(id))throw new Error('Invalid business.');
 const pick=<T extends string>(name:string,list:readonly T[]):T|null=>{
  const v=shortText(form.get(name),40);
  if(!v)return null;
  if(!list.includes(v as T))throw new Error('Invalid value for '+name.replaceAll('_',' ')+'.');
  return v as T;
 };
 const note=shortText(form.get('qualification_rationale'),1200);
 const {error}=await supabase.from('businesses').update({
  primary_opportunity:pick('primary_opportunity',OPPORTUNITIES),
  evidence_confidence:pick('evidence_confidence',CONFIDENCES),
  next_action:pick('next_action',NEXT_ACTIONS),
  qualification_rationale:note||null,
  updated_at:new Date().toISOString(),
 }).eq('id',id).eq('organization_id',organizationId);
 if(error)throw new Error('Could not save qualification. Has migration 0007 been applied? '+error.message);
 revalidatePath('/app/leads/'+id);revalidatePath('/app/opportunities');revalidatePath('/app/leads/'+id+'/pitch');
 redirect('/app/leads/'+id+'#qualification');
}
