'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace, shortText, validUuid } from '@/lib/workspace';
import {
  createDraft, derivePreferences, templates, variants,
  type Template, type Variant, type FeedbackSample,
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
export async function createDemo(form:FormData) {
  const {supabase,organizationId,user}=await requireWorkspace(true);
  const id=shortText(form.get('business_id'),64);
  const template=shortText(form.get('template')) as Template;
  if(!validUuid(id)||!templates.includes(template)) throw new Error('Choose a valid business and template.');
  const {data:b}=await supabase.from('businesses').select('id,name,city,category')
    .eq('id',id).eq('organization_id',organizationId).maybeSingle();
  if(!b) throw new Error('Business not found.');
  const preference=await learnPreferences(supabase,organizationId,user.id,template);
  const requested=shortText(form.get('visual_variant'));
  const variant:Variant=variants.includes(requested as Variant)?requested as Variant:preference.variant;
  const design={...preference,variant};
  const {data,error}=await supabase.from('demo_sites').insert({
    organization_id:organizationId,business_id:id,template,visual_variant:variant,status:'draft',
    draft_content:createDraft(b.name,b.city,b.category,template,design),
  }).select('id').single();
  if(error||!data) throw new Error(error?.message??'Demo could not be saved.');
  revalidatePath('/app');revalidatePath('/app/demos');revalidatePath('/app/leads/'+id);
  redirect('/app/demos/'+data.id);
}
export async function createDemoBatch(form:FormData) {
  const {supabase,organizationId,user}=await requireWorkspace(true);
  const ids=Array.from(new Set(form.getAll('business_ids').map(x=>String(x)))).filter(validUuid);
  const template=shortText(form.get('template')) as Template;
  if(ids.length<1||ids.length>20||!templates.includes(template)) throw new Error('Choose 1–20 prospects and a template.');
  const {data:businesses,error:findError}=await supabase.from('businesses')
    .select('id,name,city,category').eq('organization_id',organizationId).in('id',ids);
  if(findError||businesses?.length!==ids.length) throw new Error('One or more businesses were not found in your organization.');
  const preference=await learnPreferences(supabase,organizationId,user.id,template);
  const requested=shortText(form.get('visual_variant'));
  const variant:Variant=variants.includes(requested as Variant)?requested as Variant:preference.variant;
  const design={...preference,variant};
  const {error}=await supabase.from('demo_sites').insert(businesses.map(b=>({
    organization_id:organizationId,business_id:b.id,template,visual_variant:variant,status:'draft',
    draft_content:createDraft(b.name,b.city,b.category,template,design),
  })));
  if(error) throw new Error('Batch creation failed: '+error.message);
  revalidatePath('/app');revalidatePath('/app/demos');
  redirect('/app/demos?created='+businesses.length);
}
