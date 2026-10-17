import Link from 'next/link';
import {ArrowUpRight,Check,Target} from 'lucide-react';
import status from '@/docs/prospect-discovery-status.json';
import {summarizeRoadmap} from '@/lib/project-roadmap';

type SearchParams={project?:string};
const projects=summarizeRoadmap();

export default async function TrackerPage({searchParams}:{searchParams:Promise<SearchParams>}){
 const params=await searchParams;
 const selected=params.project==='seo'||params.project==='mcat'?params.project:null;
 const visible=selected?projects.filter(project=>project.id===selected):projects;
 const goal=status.agent_goal_anchor;
 return <main className="shell min-h-screen px-5 py-8 text-white sm:px-8 lg:px-12 lg:py-12">
  <div className="mx-auto max-w-6xl">
   <div className="flex flex-wrap items-start justify-between gap-5">
    <div><p className="kicker">Command Center · read-only project tracker</p>
     <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Keep the work pointed at the goal.</h1>
     <p className="muted mt-3 max-w-3xl text-sm leading-7">This page loads from the project plan included in this checkout, so it stays visible when the sales database is not connected.</p></div>
    <Link href="/app" className="inline-flex items-center gap-2 rounded-xl border border-[#385563] px-4 py-2.5 text-sm font-medium text-[#bfe8ed] hover:bg-[#152a35]">Command Center <ArrowUpRight size={15}/></Link>
   </div>

   <section className="mt-7 rounded-2xl border border-cyan-300/25 bg-[linear-gradient(145deg,#15313b,#111c26)] p-6 sm:p-8">
    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-cyan-200"><Target size={15}/> Chat goal mirror</p>
    <h2 className="mt-4 max-w-4xl text-lg font-semibold leading-8 sm:text-xl">{goal.objective}</h2>
    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#9fbac4]">
     <span>{status.project}</span><span>Mirrored {goal.last_synced}</span><span>Read-only</span>
    </div>
    <p className="mt-5 max-w-4xl border-t border-white/10 pt-4 text-xs leading-6 text-[#9fb4bc]">The chat goal and this website do not sync automatically. This is a dated copy inside the project tracker that provides a visible backup; update it when the goal changes. The agent should check both before choosing the next task.</p>
   </section>

   <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
    <article className="rounded-2xl border border-[#2b414b] bg-[#101c25] p-6">
     <p className="kicker">Current checkpoint</p>
     <p className="mt-3 text-sm leading-7 text-[#d7e6eb]">{status.current_milestone}</p>
     <p className="kicker mt-6">Next action</p>
     <p className="mt-3 text-sm leading-7 text-[#b2c6ce]">{status.next_action}</p>
    </article>
    <article className="rounded-2xl border border-[#2b414b] bg-[#101c25] p-6">
     <p className="kicker">Open constraints</p>
     <ul className="mt-3 space-y-3 text-sm leading-6 text-[#b2c6ce]">
      {status.blockers.map(item=><li key={item} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300"/>{item}</li>)}
     </ul>
     <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-[#8fa8b2]">No prospect outreach, CRM imports, or production updates are made from this tracker.</p>
    </article>
   </section>

   <div className="mt-9 flex flex-wrap items-end justify-between gap-4">
    <div><p className="kicker">Build roadmap</p><h2 className="mt-2 text-2xl font-semibold">Verified checkpoints</h2></div>
    <nav aria-label="Filter roadmap" className="flex gap-2 text-xs">
     <Link href="/tracker" className="rounded-lg border border-[#34515c] px-3 py-2 text-[#c0d7df] hover:bg-[#152833]">All</Link>
     <Link href="/tracker?project=seo" className="rounded-lg border border-[#34515c] px-3 py-2 text-[#c0d7df] hover:bg-[#152833]">Local business</Link>
     <Link href="/tracker?project=mcat" className="rounded-lg border border-[#34515c] px-3 py-2 text-[#c0d7df] hover:bg-[#152833]">MCAT</Link>
    </nav>
   </div>
   <div className="mt-4 space-y-5">
    {visible.map(project=><section key={project.id} id={'project-'+project.id} className="scroll-mt-6 overflow-hidden rounded-2xl border border-[#2b414b] bg-[#101c25]">
     <div className="border-b border-[#2b414b] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">{project.name}</h3><p className="muted mt-1 text-xs">{project.subtitle}</p></div><span className="text-sm font-semibold tabular-nums text-cyan-100">{project.percent}% · {project.completed}/{project.total}</span></div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9fb6bf]">{project.goal}</p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#293f49]"><div className="h-full rounded-full bg-cyan-300" style={{width:project.percent+'%'}}/></div>
     </div>
     <div className="divide-y divide-[#263942]">
      {project.stages.map(stage=><details key={stage.id} className="group" open={stage.steps.some(item=>item.status==='in_progress'||item.status==='blocked')}>
       <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6"><span className="font-medium">{stage.title}</span><span className="text-xs text-[#93aeb8]">{stage.completed}/{stage.total} complete</span></summary>
       <ol className="divide-y divide-[#263942] border-t border-[#263942] bg-[#0d171f]">
        {stage.steps.map(item=><li key={item.id} id={item.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 sm:px-6">
         <div className="max-w-4xl"><p className="flex items-center gap-2 text-sm font-medium text-[#d6e4e8]">{item.status==='completed'&&<Check size={14} className="text-emerald-300"/>}{item.title}</p><p className="mt-1.5 text-xs leading-5 text-[#96adb6]">{item.definition}</p>{item.evidence&&<p className="mt-1.5 text-xs leading-5 text-[#85a9b4]">Evidence: {item.evidence}</p>}</div>
         <span className="text-[10px] font-semibold uppercase tracking-wider text-[#91b9c3]">{item.status.replace('_',' ')}</span>
        </li>)}
       </ol>
      </details>)}
     </div>
    </section>)}
   </div>
   <p className="muted mt-6 text-xs">Tracker source: local roadmap definitions and prospect-discovery status bundled with this build. Updates from other checkouts or chat goals appear only after they are deliberately mirrored here.</p>
  </div>
 </main>;
}
