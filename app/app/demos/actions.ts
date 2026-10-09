'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace, shortText, validUuid } from '@/lib/workspace';
import { chooseVariant, createDraft, templates, variants, type Template, type Variant, type FeedbackSample } from '@/lib/demo-engine';

async function getVariant(
  supabase: Awaited<ReturnType<typeof requireWorkspace>>['supabase'],
  organizationId:string, template:Template, requested:string
):Promise<Variant> {
  if(variants.includes(requested as Variant)) return requested as Variant;
  const {data,error}=await supabase.from('demo_feedback')
    .select('demo_id,user_id,visual_variant,rating')
    .eq('organization_id',organizationId).eq('template',template)
    .order('created_at',{ascending:false}).limit(500);
  if(error) throw new Error('Unable to read design feedback: '+error.message);
  return chooseVariant((data??[]) as FeedbackSample[]);
}
export async function createDemo(form:FormData){
  const {supabase,organizationId}=await requireWorkspace(true);
  const id=shortText(form.get('business_id'),64);
  const template=shortText(form.get('template')) as Template;
  if(!validUuid(id)||!templates.includes(template)) throw new Error('Choose a valid business and template.');
  const {data:b}=await supabase.from('businesses').select('id,name,city,category')
    .eq('id',id).eq('organization_id',organizationId).maybeSingle();
  if(!b) throw new Error('Business not found.');
  const variant=await getVariant(supabase,organizationId,template,shortText(form.get('visual_variant')));
  const {data,error}=await supabase.from('demo_sites').insert({
    organization_id:organizationId,business_id:id,template,visual_variant:variant,status:'draft',
    draft_content:createDraft(b.name,b.city,b.category,template),
  }).select('id').single();
  if(error||!data) throw new Error(error?.message??'Demo could not be saved.');
  revalidatePath('/app');revalidatePath('/app/demos');revalidatePath('/app/leads/'+id);
  redirect('/app/demos/'+data.id);
}

export async function createDemoBatch(form:FormData){
  const {supabase,organizationId}=await requireWorkspace(true);
  const ids=Array.from(new Set(form.getAll('business_ids').map(x=>String(x)))).filter(validUuid);
  const template=shortText(form.get('template')) as Template;
  if(ids.length<1||ids.length>20||!templates.includes(template)) throw new Error('Choose 1–20 prospects and a template.');
  const {data:businesses,error:findError}=await supabase.from('businesses')
    .select('id,name,city,category').eq('organization_id',organizationId).in('id',ids);
  if(findError||businesses?.length!==ids.length) throw new Error('One or more businesses were not found in your organization.');
  const variant=await getVariant(supabase,organizationId,template,shortText(form.get('visual_variant')));
  const {error}=await supabase.from('demo_sites').insert(businesses.map(b=>({
    organization_id:organizationId,business_id:b.id,template,visual_variant:variant,status:'draft',
    draft_content:createDraft(b.name,b.city,b.category,template),
  })));
  if(error) throw new Error('Batch creation failed: '+error.message);
  revalidatePath('/app');revalidatePath('/app/demos');
  redirect('/app/demos?created='+businesses.length);
}
