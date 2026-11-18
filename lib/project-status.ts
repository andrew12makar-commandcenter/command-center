// Read-only implementation tracker shared by Claude, ChatGPT and Codex.
// Source of truth: docs/prospect-discovery-status.json (version-controlled).
// Never place secrets, credentials, customer data or environment values in it.
export const TRACKER_STATUSES=['not_started','in_progress','blocked','ready_for_review','complete'] as const;
export type TrackerStatus=typeof TRACKER_STATUSES[number];
export const TRACKER_AGENTS=['Claude','ChatGPT','Codex'] as const;
export type TrackerAgent=typeof TRACKER_AGENTS[number];
export type TrackerTest={command:string;result:string;ran_at:string};
export type TrackerMilestone={
 id:string;title:string;status:TrackerStatus;responsible_agent:TrackerAgent;
 safe_for_other_agent_to_edit:boolean;completed:string[];in_progress:string[];remaining:string[];
 files_changed:string[];commit:string|null;
};
export type ProjectStatus={
 project:string;branch:string;worktree:string;current_milestone:string;overall_status:TrackerStatus;
 last_updated:string;responsible_agent:TrackerAgent;safe_for_other_agent_to_edit:boolean;
 latest_commit:{sha:string;message:string}|null;next_action:string;
 blockers:string[];known_limitations:string[];manual_steps:string[];
 tests:TrackerTest[];milestones:TrackerMilestone[];
};
const text=(v:unknown,max=600)=>typeof v==='string'?v.slice(0,max):'';
const list=(v:unknown,max=60)=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string').slice(0,max).map(x=>x.slice(0,600)):[];
const status=(v:unknown):TrackerStatus=>TRACKER_STATUSES.includes(v as TrackerStatus)?v as TrackerStatus:'not_started';
const agent=(v:unknown):TrackerAgent=>TRACKER_AGENTS.includes(v as TrackerAgent)?v as TrackerAgent:'Claude';
export function normalizeProjectStatus(raw:unknown):ProjectStatus{
 const r=(raw&&typeof raw==='object'?raw:{}) as Record<string,unknown>;
 const commit=r.latest_commit&&typeof r.latest_commit==='object'?r.latest_commit as Record<string,unknown>:null;
 return {
  project:text(r.project,120)||'Unnamed project',branch:text(r.branch,200),worktree:text(r.worktree,300),
  current_milestone:text(r.current_milestone,120),overall_status:status(r.overall_status),
  last_updated:text(r.last_updated,40),responsible_agent:agent(r.responsible_agent),
  safe_for_other_agent_to_edit:r.safe_for_other_agent_to_edit===true,
  latest_commit:commit&&text(commit.sha,40)?{sha:text(commit.sha,40),message:text(commit.message,200)}:null,
  next_action:text(r.next_action,800),blockers:list(r.blockers),known_limitations:list(r.known_limitations),
  manual_steps:list(r.manual_steps),
  tests:Array.isArray(r.tests)?r.tests.slice(-40).map(t=>{
   const x=(t&&typeof t==='object'?t:{}) as Record<string,unknown>;
   return {command:text(x.command,300),result:text(x.result,400),ran_at:text(x.ran_at,40)};
  }):[],
  milestones:Array.isArray(r.milestones)?r.milestones.slice(0,20).map(m=>{
   const x=(m&&typeof m==='object'?m:{}) as Record<string,unknown>;
   return {id:text(x.id,20),title:text(x.title,160),status:status(x.status),responsible_agent:agent(x.responsible_agent),
    safe_for_other_agent_to_edit:x.safe_for_other_agent_to_edit===true,completed:list(x.completed),
    in_progress:list(x.in_progress),remaining:list(x.remaining),files_changed:list(x.files_changed,120),
    commit:text(x.commit,40)||null};
  }):[]
 };
}
export function statusLabel(s:TrackerStatus):string{
 return s==='not_started'?'Not started':s==='in_progress'?'In progress':s==='blocked'?'Blocked':
  s==='ready_for_review'?'Ready for review':'Complete';
}
