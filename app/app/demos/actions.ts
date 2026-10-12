'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace, shortText, validUuid } from '@/lib/workspace';
import {resolveDemoTemplate} from '@/lib/business-classification';
import {currentAudit,type OpportunityBusiness,type AuditRecord} from '@/lib/opportunity-board';
import {buildSalesBrief} from '@/lib/sales-brief';
import type {AuditFindings} from '@/lib/website-intelligence';
import {
  createDraft, derivePreferences, templates, variants,
  type Template, type Variant, type FeedbackSample, type DemoCopy,
} from '@/lib/demo-engine';

// This query runs for every generated site. The last rating is visible immediately;
// there is no minimum-review threshold or delayed batch job.
async function learnPreferences(
  supabase: Awaited<ReturnType<typeof requireWorkspace>>['supabase'],
  organizationId:string,userId:string,template:Template
){
  const {data,error}=await supabase.from('demo_feedback')
    .select('demo_id,user_id,template,visual_variant,rating,issue_tags,notes,created_at')
    .eq('organization_id',organizationId).eq('user_id',userId)
    .order('created_at',{ascending:false}).limit(200);
  if(error) throw new Error('Could not read saved design preferences: '+error.message);
  return derivePreferences((data??[]) as FeedbackSample[],template);
}
function withEvidence(
 b:OpportunityBusiness,audits:AuditRecord[],draft:DemoCopy
):DemoCopy{
 const recent=currentAudit(b,audits);
 const brief=buildSalesBrief(b.name,recent?{
  status:recent.status,website_url:recent.website_url,assessed_at:recent.assessed_at,
  findings:recent.findings as Partial<AuditFindings>|null
 }:null);
 return {...draft,internalBuildPlan:{
  sourceAssessmentDate:brief.assessedAt,
  confidence:brief.confidence,
  goals:brief.designGoals
 }};
}

export async function createDemo(form:FormData) {
  const {supabase,organizationId,user}=await requireWorkspace(true);
  const id=shortText(form.get('business_id'),64);
  const requestedTemplate=shortText(form.get('template'));
  if(!validUuid(id)||!['auto',...templates].includes(requestedTemplate)) throw new Error('Choose a valid business and template.');
  const {data:b}=await supabase.from('businesses').select('id,name,city,category,service_area,website_url,verification_status,operational_status,pipeline_status,priority_score,phone,contact_email')
    .eq('id',id).eq('organization_id',organizationId).maybeSingle();
  if(!b) throw new Error('Business not found.');
  const {template}=resolveDemoTemplate(b.name,b.category,requestedTemplate);
  const preference=await learnPreferences(supabase,organizationId,user.id,template);
  const requested=shortText(form.get('visual_variant'));
  const variant:Variant=variants.includes(requested as Variant)?requested as Variant:preference.variant;
  const design={...preference,variant};
  const {data:audits,error:auditError}=await supabase.from('website_assessments')
    .select('business_id,website_url,status,assessed_at,findings')
    .eq('organization_id',organizationId).eq('business_id',id)
    .order('assessed_at',{ascending:false}).limit(25);
  if(auditError)throw new Error('Could not read existing website evidence. Demo creation aborted.');
  const copy=withEvidence(b as OpportunityBusiness,(audits??[]) as AuditRecord[],
    createDraft(b.name,b.city,b.category,template,design));
  const {data,error}=await supabase.from('demo_sites').insert({
    organization_id:organizationId,business_id:id,template,visual_variant:variant,status:'draft',
    draft_content:copy,
  }).select('id').single();
  if(error||!data) throw new Error(error?.message??'Demo could not be saved.');
  revalidatePath('/app');revalidatePath('/app/demos');revalidatePath('/app/leads/'+id);
  redirect('/app/demos/'+data.id);
}
export async function createDemoBatch(form:FormData) {
  const {supabase,organizationId,user}=await requireWorkspace(true);
  const ids=Array.from(new Set(form.getAll('business_ids').map(x=>String(x)))).filter(validUuid);
  const requestedTemplate=shortText(form.get('template'));
  if(ids.length<1||ids.length>20||!['auto',...templates].includes(requestedTemplate)) throw new Error('Choose 1–20 prospects and a template.');
  const {data:businesses,error:findError}=await supabase.from('businesses')
    .select('id,name,city,category,service_area,website_url,verification_status,operational_status,pipeline_status,priority_score,phone,contact_email').eq('organization_id',organizationId).in('id',ids);
  if(findError||businesses?.length!==ids.length) throw new Error('One or more businesses were not found in your organization.');
  // Match each business independently. A mixed batch must never paint a medical practice as a landscaper.
  const matched=businesses.map(b=>({...b,template:resolveDemoTemplate(b.name,b.category,requestedTemplate).template}));
  const {data:audits,error:auditError}=await supabase.from('website_assessments')
    .select('business_id,website_url,status,assessed_at,findings')
    .eq('organization_id',organizationId).in('business_id',ids)
    .order('assessed_at',{ascending:false}).limit(1000);
  if(auditError||audits?.length===1000)throw new Error('Website evidence could not be completely read; demo batch aborted.');
  const byBusiness=new Map<string,AuditRecord[]>();
  for(const audit of (audits??[]) as AuditRecord[]){
    const group=byBusiness.get(audit.business_id)||[];
    group.push(audit);byBusiness.set(audit.business_id,group);
  }
  const prefs=new Map<Template,Awaited<ReturnType<typeof learnPreferences>>>();
  for(const template of new Set(matched.map(b=>b.template))){
    prefs.set(template,await learnPreferences(supabase,organizationId,user.id,template));
  }
  const requested=shortText(form.get('visual_variant'));
  const {error}=await supabase.from('demo_sites').insert(matched.map(b=>{
    const preference=prefs.get(b.template)!;
    const variant:Variant=variants.includes(requested as Variant)?requested as Variant:preference.variant;
    const design={...preference,variant};
    return {
      organization_id:organizationId,business_id:b.id,template:b.template,visual_variant:variant,status:'draft',
      draft_content:withEvidence(b as OpportunityBusiness,byBusiness.get(b.id)||[],
        createDraft(b.name,b.city,b.category,b.template,design)),
    };
  }));
  if(error) throw new Error('Batch creation failed: '+error.message);
  revalidatePath('/app');revalidatePath('/app/demos');
  redirect('/app/demos?created='+businesses.length);
}
