'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace, shortText, validUuid } from '@/lib/workspace';
import type { DemoCopy } from '@/lib/demo-engine';
const issueTags=['layout','visuals','generic_copy','missing_content','navigation','mobile','other'];

export async function rateDemo(form:FormData) {
 const {supabase,organizationId,user}=await requireWorkspace(true);
 const id=shortText(form.get('demo_id'),64), rating=Number(form.get('rating'));
 if(!validUuid(id) || !Number.isInteger(rating) || rating<1 || rating>5) throw new Error('Choose a rating between 1 and 5.');
 const {data:demo}=await supabase.from('demo_sites').select('id,revision_no,template,visual_variant')
   .eq('id',id).eq('organization_id',organizationId).single();
 if(!demo) throw new Error('Demo not found.');
 const tags=Array.from(new Set(form.getAll('issues').map(String))).filter(t=>issueTags.includes(t));
 const notes=shortText(form.get('notes'),1200);
 const {error}=await supabase.from('demo_feedback').upsert({
    organization_id:organizationId,demo_id:id,user_id:user.id,
    revision_no:demo.revision_no,template:demo.template,visual_variant:demo.visual_variant,
    rating,issue_tags:tags,notes
 },{onConflict:'demo_id,user_id,revision_no'});
 if(error) throw new Error('Cannot save feedback: '+error.message);
 revalidatePath('/app/demos/'+id);revalidatePath('/app/demos');
 redirect('/app/demos/'+id+'?saved=rating');
}

export async function saveDemoCopy(form:FormData) {
 const {supabase,organizationId}=await requireWorkspace(true);
 const id=shortText(form.get('demo_id'),64);
 const revision=Number(form.get('revision_no'));
 if(!validUuid(id)||!Number.isInteger(revision)||revision<1) throw new Error('Invalid demo/version.');
 const {data:demo}=await supabase.from('demo_sites').select('id,draft_content,revision_no')
   .eq('id',id).eq('organization_id',organizationId).single();
 if(!demo) throw new Error('Demo not found.');
 const old=demo.draft_content as DemoCopy;
 // Editing copy is human-controlled. No automated claims, testimonials, phone numbers or credentials.
 const content:DemoCopy={
   ...old,
   brand:shortText(form.get('brand'),140),
   eyebrow:shortText(form.get('eyebrow'),130),
   headline:shortText(form.get('headline'),200),
   description:shortText(form.get('description'),800),
   primaryAction:shortText(form.get('primaryAction'),65),
   secondaryAction:shortText(form.get('secondaryAction'),65),
   services:shortText(form.get('services'),1000).split('\n').map(x=>x.trim()).filter(Boolean).slice(0,6),
 };
 if(!content.brand||!content.headline) throw new Error('Business name and headline are required.');
 const {error}=await supabase.rpc('save_demo_revision',{
   p_demo_id:id,p_expected_revision:revision,p_content:content,
 });
 if(error) throw new Error('Could not save version: '+error.message);
 revalidatePath('/app/demos/'+id);revalidatePath('/app/demos'); 
 redirect('/app/demos/'+id+'?saved=copy');
}
