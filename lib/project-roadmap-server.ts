import 'server-only';
import type {requireWorkspace} from '@/lib/workspace';
import {summarizeRoadmap,type RoadmapRecord} from '@/lib/project-roadmap';

type WorkspaceClient=Awaited<ReturnType<typeof requireWorkspace>>['supabase'];
export type ProgressAvailability='ready'|'setup_required'|'unavailable';

export async function getProjectProgress(supabase:WorkspaceClient,organizationId:string){
 const {data,error}=await supabase.from('project_roadmap_progress')
  .select('step_id,status,evidence_note,updated_at').eq('organization_id',organizationId);
 if(error){
  const migrationMissing=error.code==='42P01'||error.code==='PGRST205'||
   /project_roadmap_progress.+(schema cache|does not exist)/i.test(error.message);
  return {projects:summarizeRoadmap(),availability:
   (migrationMissing?'setup_required':'unavailable') as ProgressAvailability};
 }
 return {projects:summarizeRoadmap((data??[]) as RoadmapRecord[]),
  availability:'ready' as ProgressAvailability};
}
