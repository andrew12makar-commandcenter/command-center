'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace, shortText, validUuid } from '@/lib/workspace';

const templates=['landscaping','medical','universal'] as const;
type Template=typeof templates[number];

function draftFor(name:string,city:string|null,category:string|null,template:Template){
  // Never invent service offerings, years of experience, ratings, or credentials.
  const tag:Record<Template,string>={
    landscaping:'Thoughtful outdoor spaces, built around your goals',
    medical:'An easier way for patients to get in touch',
    universal:'A clearer way to discover and contact your business'
  };
  return {
    brand:name,eyebrow:city||'Local services',
    headline:tag[template],
    description:`Explore how a modern website could present ${name} to prospective customers. Service descriptions, credentials and contact details require client confirmation.`,
    primaryAction:'Contact the business',
    secondaryAction:'Explore services',
    services:['Service offering to confirm','Service offering to confirm','Service offering to confirm'],
    disclaimer:'Concept demo only. This website is not affiliated with or approved by the business unless expressly confirmed.',
    category:category||'Services',
  };
}

export async function createDemo(form:FormData){
  const {supabase,organizationId}=await requireWorkspace(true);
  const id=shortText(form.get('business_id'),64);
  const template=shortText(form.get('template')) as Template;
  if(!validUuid(id)||!templates.includes(template)) throw new Error('Choose a valid business and template.');
  const {data:b}=await supabase.from('businesses').select('id,name,city,category')
    .eq('id',id).eq('organization_id',organizationId).maybeSingle();
  if(!b) throw new Error('Business not found.');
  const {data,error}=await supabase.from('demo_sites').insert({
    organization_id:organizationId,business_id:id,template,status:'draft',
    draft_content:draftFor(b.name,b.city,b.category,template),
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
  const {error}=await supabase.from('demo_sites').insert(businesses.map(b=>({
    organization_id:organizationId,business_id:b.id,template,status:'draft',
    draft_content:draftFor(b.name,b.city,b.category,template),
  })));
  if(error) throw new Error('Batch creation failed: '+error.message);
  revalidatePath('/app');revalidatePath('/app/demos');
  redirect('/app/demos?created='+businesses.length);
}
