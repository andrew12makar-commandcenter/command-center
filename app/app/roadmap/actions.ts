'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireWorkspace,shortText} from '@/lib/workspace';
import {findStep} from '@/lib/project-roadmap';

// Completion is an explicit owner/editor confirmation, never a guessed result
// from a saved draft, passing commit or an automated background task.
export async function updateRoadmapStep(form:FormData){
 const {supabase,organizationId,user}=await requireWorkspace(true);
 const id=shortText(form.get('step_id'),100);
 const selection=findStep(id);
 const status=shortText(form.get('status'),20);
 const note=shortText(form.get('evidence_note'),1200);
 if(!selection||!['completed','pending','in_progress','blocked'].includes(status))
  throw new Error('Choose a valid roadmap milestone.');
 if((status==='completed'||status==='blocked')&&note.length<12)
  throw new Error('Describe the completion evidence or reason for the blocker (12 characters minimum).');
 const {error}=await supabase.from('project_roadmap_progress').upsert({
  organization_id:organizationId,step_id:id,status,
  evidence_note:note,updated_by:user.id,updated_at:new Date().toISOString()
 },{onConflict:'organization_id,step_id'});
 if(error)throw new Error('Could not save milestone. Apply migrations 0004 and 0005 to the business Supabase project and retry.');
 revalidatePath('/app','layout');
 revalidatePath('/app/roadmap');
 redirect('/app/roadmap?project='+selection.project.id+'#'+id);
}
