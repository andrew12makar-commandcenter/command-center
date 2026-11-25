import 'server-only';
import type {requireWorkspace} from '@/lib/workspace';
import {summarizeRoadmap,type RoadmapRecord,type MilestoneStatus} from '@/lib/project-roadmap';

type WorkspaceClient=Awaited<ReturnType<typeof requireWorkspace>>['supabase'];
export type ProgressAvailability='ready'|'setup_required'|'unavailable';
export type RoadmapActivity={step_id:string;status:MilestoneStatus;evidence_note:string;changed_at:string};

export async function getProjectProgress(supabase:WorkspaceClient,organizationId:string){
 const [progress,history]=await Promise.all([
  supabase.from('project_roadmap_progress').select('step_id,status,evidence_note,updated_at').eq('organization_id',organizationId),
  supabase.from('project_roadmap_activity').select('step_id,status,evidence_note,changed_at')
   .eq('organization_id',organizationId).order('changed_at',{ascending:false}).limit(8)
 ]);
 const errors=[progress.error,history.error].filter(Boolean);
 const missing=errors.some(e=>e?.code==='42P01'||e?.code==='PGRST205'||
  /project_roadmap_(progress|activity).*(schema cache|does not exist)/i.test(e?.message??''));
 const availability:ProgressAvailability=!errors.length?'ready':missing?'setup_required':'unavailable';
 return {projects:summarizeRoadmap((progress.data??[]) as RoadmapRecord[]),
  activity:(history.data??[]) as RoadmapActivity[],availability};
}
