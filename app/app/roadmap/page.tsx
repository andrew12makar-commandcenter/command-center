import Link from 'next/link';
import {ArrowRight,ArrowUpRight,Check,ChevronRight,Flag,Target,Clock3,AlertTriangle} from 'lucide-react';
import {requireWorkspace} from '@/lib/workspace';
import {getProjectProgress} from '@/lib/project-roadmap-server';
import {findStep} from '@/lib/project-roadmap';
import {updateRoadmapStep} from './actions';
import type {TrackedProject} from '@/lib/project-roadmap';

type SearchParams={project?:string};
function ProjectOverview({project,editable}: {project:TrackedProject;editable:boolean}){
 const current=project.current;
 return <section id={project.id} className="scroll-mt-7">
  <div className="relative overflow-hidden rounded-[24px] border border-[#2a4b57] bg-[radial-gradient(circle_at_92%_12%,#23546380,transparent_35%),linear-gradient(150deg,#162c38,#101a26)] p-6 shadow-[0_20px_70px_#00000024] sm:p-9">
   <p className="text-[10px] font-bold uppercase tracking-[.21em] text-[#88c7d4]">{project.id==='seo'?'VENTURE 01':'VENTURE 02'} / BUILD TARGET</p>
   <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
    <div><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{project.name}</h2>
     <p className="mt-2 max-w-2xl text-sm leading-6 text-[#abc2cd]">{project.goal}</p></div>
    <span className="rounded-xl border border-white/[.12] bg-white/[.04] px-4 py-2 text-xs text-[#c1d5de]">{project.target}</span>
   </div>
   <div className="mt-7 flex items-end justify-between gap-5">
    <p className="text-xs text-[#a9c6cf]">{project.completed} of {project.total} confirmed checkpoints</p>
    <p className="text-2xl font-semibold tabular-nums text-[#eafafd]">{project.percent}%</p>
   </div>
   <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#354d57]" role="progressbar" aria-valuemin={0}
    aria-valuemax={100} aria-valuenow={project.percent} aria-label={project.name+' milestones'}>
    <div className="h-full rounded-full bg-gradient-to-r from-[#54a8bc] to-[#a2f3ed]" style={{width:String(project.percent)+'%'}}/>
   </div>
   <div className="mt-6 rounded-xl border border-[#396373] bg-[#142f3b]/80 p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
    <div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#89d5dc]">{current?.status==='in_progress'?'Currently in progress':'Next priority'}</p>
     <p className="mt-1.5 text-sm font-semibold">{current?.title??'Every checkpoint is complete'}</p>
     <p className="mt-1 text-xs leading-5 text-[#a8c0ca]">{current?.definition??'Review the evidence and define the next development cycle.'}</p></div>
    {current&&<Link href={current.href} className="mt-3 inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-[#a5e7ef] hover:text-white sm:mt-0">
     Open workspace <ArrowUpRight size={14}/></Link>}
   </div>
   <div className="mt-3 grid gap-3 sm:grid-cols-2">
    <div className="rounded-xl border border-[#335461] bg-[#102833] p-4">
     <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#8db6c4]">After this</p>
     <p className="mt-2 text-sm font-medium text-[#dbeef4]">{project.next?.title??'No queued checkpoints'}</p>
    </div>
    <div className="rounded-xl border border-[#3b4850] bg-[#18232b] p-4">
     <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#b7a98b]">Blockers</p>
     <p className="mt-2 text-sm font-medium text-[#dbe4e7]">{project.blocked.length===0?'No blockers recorded':project.blocked.length+' checkpoint(s) blocked'}</p>
    </div>
   </div>
  </div>
  <div className="mt-6 space-y-5">
   {project.stages.map((stage,stageIndex)=>{
    const done=stage.completed===stage.total;
    return <section key={stage.id} className="overflow-hidden rounded-[20px] border border-[#293f4a] bg-[#111e28]">
     <div className="flex items-start gap-4 border-b border-[#293f4a] p-5 sm:p-6">
      <div className={'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold '+(done?'border-[#457b71] bg-[#184438] text-[#a9eed1]':'border-[#3f6472] bg-[#18323f] text-[#91d3dc]')}>
       {done?<Check size={17}/>:String(stageIndex+1).padStart(2,'0')}
      </div>
      <div className="min-w-0 flex-1">
       <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{stage.title}</h3>
        <span className="text-xs tabular-nums text-[#95b1bf]">{stage.completed}/{stage.total} complete</span>
       </div>
       <p className="mt-1.5 text-sm leading-6 text-[#94afbb]">{stage.summary}</p>
      </div>
     </div>
     <ol className="divide-y divide-[#253a45]">
      {stage.steps.map((item,i)=>{
       const complete=item.status==='completed';
       const blocked=item.status==='blocked';
       const isCurrent=current?.id===item.id;
       return <li key={item.id} id={item.id} className={'scroll-mt-6 px-5 py-5 sm:px-6 '+(isCurrent?'bg-[#142f3a]':'')}>
        <div className="flex items-start gap-3">
         <div className={'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border '+(complete?'border-[#5d9885] bg-[#24493f] text-[#beefdb]':isCurrent?'border-[#8bdae1] bg-[#25505a] text-[#d8fcff]':'border-[#475c67] text-[#7895a2]')}>
          {complete?<Check size={14}/>:blocked?<AlertTriangle size={13}/>:isCurrent?<ArrowRight size={13}/>:<span className="text-[10px]">{i+1}</span>}
         </div>
         <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
           <div><h4 className={'text-sm font-semibold leading-5 '+(complete?'text-[#c6d6dc]':'text-white')}>{item.title}</h4>
            <p className="mt-1.5 max-w-2xl text-xs leading-[1.7] text-[#a3bac5]">{item.definition}</p></div>
           <span className={'text-[10px] font-semibold uppercase tracking-[.09em] '+(complete?'text-[#9bceb8]':isCurrent?'text-[#8fe0e8]':'text-[#8ca4ae]')}>
            {complete?'Completed':blocked?'Blocked':item.status==='in_progress'?'In progress':isCurrent?'Now':'Upcoming'}
           </span>
          </div>
          {item.evidence&&<p className="mt-2 text-xs leading-5 text-[#8caeb3]">{complete?'Basis':blocked?'Blocker':'Update'}: {item.evidence}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-4">
           <Link href={item.href} className="inline-flex items-center gap-1 text-xs font-medium text-[#9ce2e8] hover:text-white">
            Open related work <ChevronRight size={13}/>
           </Link>
           {editable&&<details className="group min-w-0 text-xs text-[#8faab7]">
            <summary className="cursor-pointer select-none text-[#b1c8d1] hover:text-white">Update status</summary>
            <form action={updateRoadmapStep} className="mt-3 min-w-0 max-w-lg rounded-xl border border-[#34515e] bg-[#0b1b25] p-4">
             <input type="hidden" name="step_id" value={item.id}/>
             <label className="block text-xs font-semibold text-[#d3e9ee]">Milestone state
              <select name="status" defaultValue={item.status} className="mt-2 text-sm">
               <option value="pending">Queued</option>
               <option value="in_progress">In progress</option>
               <option value="blocked">Blocked</option>
               <option value="completed">Completed</option>
              </select>
             </label>
             <label className="mt-3 block text-xs font-semibold text-[#d3e9ee]">Verification, blocker, or next action
              <textarea name="evidence_note" rows={3} maxLength={1200}
               defaultValue={item.evidence??''} className="mt-2 text-sm"
               placeholder="State what was verified or what needs attention."/>
             </label>
             <p className="mt-2 text-[11px] leading-5 text-[#92aebb]">Completed and blocked items require specific evidence. Every saved change appears in the audit history.</p>
             <button type="submit" className="mt-3 rounded-lg border border-[#4c9bad] bg-[#1b4550] px-4 py-2 text-xs font-semibold text-white hover:bg-[#255f6d]">Save progress</button>
            </form>
           </details>}
          </div>
         </div>
        </div>
       </li>;
      })}
     </ol>
    </section>;
   })}
  </div>
 </section>;
}
export default async function RoadmapPage({searchParams}:{searchParams:Promise<SearchParams>}){
 const {supabase,organizationId,role}=await requireWorkspace();
 const {projects,availability,activity}=await getProjectProgress(supabase,organizationId);
 const params=await searchParams;
 const selected=['seo','mcat'].includes(params.project??'')?params.project:'';
 const shown=selected?projects.filter(p=>p.id===selected):projects;
 const editable=availability==='ready'&&['owner','admin','editor'].includes(role);
 return <main className="mx-auto max-w-6xl">
  <div className="flex flex-wrap items-start justify-between gap-4">
   <div><p className="kicker">Command Center / Living roadmap</p>
    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">The build, one milestone at a time.</h1>
    <p className="muted mt-3 max-w-3xl text-sm leading-7">The local-business engine and MCAT software each have a current focus, a next priority, blockers, and a verified record of what changed. Checkpoint percentages are not predictions of commercial success.</p>
   </div>
   <Link href="/app" className="btn text-xs"><Target size={15} className="mr-2"/>Mission Control</Link>
  </div>
  <nav className="my-7 flex flex-wrap gap-2" aria-label="Select roadmap project">
   {[['','Both ventures'],['seo','Local Business'],['mcat','MCAT Platform']].map(([key,label])=>
    <Link key={key} href={'/app/roadmap'+(key?'?project='+key:'')}
     aria-current={selected===key?'page':undefined}
     className={'rounded-xl border px-4 py-2.5 text-xs font-semibold transition '+(selected===key?'border-[#7bd4df] bg-[#19414c] text-[#e8fcff]':'border-[#2b4652] text-[#a2c0ca] hover:border-[#5f9ba8] hover:text-white')}>
     {label}</Link>)}
  </nav>
  {availability!=='ready'&&<div role="status" className="mb-7 rounded-xl border border-[#987846] bg-[#2a251c] p-5 text-sm leading-6 text-[#eed8b0]">
   {availability==='setup_required'?
    'Roadmap is currently read-only. Run roadmap migrations 0004 and then 0005 once in your EXISTING business Command Center Supabase project. Never rerun previous migrations or use the Campus2Care database.':
    'Saved progress could not be loaded. The source-controlled roadmap is shown without editing; no progress was changed.'}
  </div>}
  <div className="space-y-12">{shown.map(project=><ProjectOverview key={project.id} project={project} editable={editable}/>)}</div>
  <section aria-label="Recent roadmap updates" className="mt-12 rounded-[20px] border border-[#293f4a] bg-[#111e28] p-6 sm:p-7">
   <div className="flex items-center gap-3"><Clock3 size={18} className="text-[#9bdfe7]"/>
    <div><p className="kicker">Activity history</p><h2 className="mt-1 text-lg font-semibold">What changed</h2></div>
   </div>
   <div className="mt-5 divide-y divide-[#263945]">
    {activity.filter(a=>!selected||findStep(a.step_id)?.project.id===selected).map((entry,i)=>
     <div key={entry.step_id+entry.changed_at+i} className="flex flex-wrap justify-between gap-3 py-3 text-sm">
      <div><p className="font-medium">{findStep(entry.step_id)?.step.title??'Retired checkpoint'}</p>
       <p className="mt-1 text-xs leading-5 text-[#9db3bf]">{entry.evidence_note||'No note supplied'}</p></div>
      <div className="text-right"><p className="text-xs font-semibold capitalize text-[#b0dce0]">{entry.status.replaceAll('_',' ')}</p>
       <time dateTime={entry.changed_at} className="mt-1 block text-[11px] text-[#7f9aa7]">{new Date(entry.changed_at).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'America/New_York'})} ET</time>
      </div>
     </div>)}
    {activity.filter(a=>!selected||findStep(a.step_id)?.project.id===selected).length===0&&
     <p className="py-4 text-sm text-[#8eacb9]">No manually confirmed progress changes yet. Source-controlled milestones are visible above, but are not presented as activity history.</p>}
   </div>
  </section>
  <div className="mt-10 flex items-start gap-3 rounded-2xl border border-[#293e49] bg-[#101b25] p-5 text-xs leading-6 text-[#92aeb8]">
   <Flag size={16} className="mt-1 shrink-0 text-[#8fd5df]"/>
   <p>Progress is based on code-verified starting milestones and explicit operator confirmations. GitHub commits, local database activity or background scans do not silently close commercial milestones. An active checkpoint stays active until explicitly updated; confirmed blockers and completions update the next available priority. Code development does not run autonomously in the background.</p>
  </div>
 </main>;
}
