import Link from 'next/link';
import raw from '@/docs/prospect-discovery-status.json';
import {normalizeProjectStatus,statusLabel,type TrackerStatus} from '@/lib/project-status';

export const dynamic='force-dynamic';
// Read-only view of docs/prospect-discovery-status.json. Edit the file in the repository, not here.
const tone:Record<TrackerStatus,string>={
 not_started:'text-[#8fa9b5]',in_progress:'text-cyan-200',blocked:'text-amber-200',
 ready_for_review:'text-violet-200',complete:'text-emerald-200'
};
export default function ProjectStatusPage(){
 const s=normalizeProjectStatus(raw);
 return <main className="max-w-6xl">
  <p className="kicker">Shared implementation tracker · read-only</p>
  <h1 className="mt-3 text-4xl font-semibold">{s.project}</h1>
  <p className="muted mt-3 max-w-3xl text-sm leading-6">Claude and ChatGPT coordinate through <code>docs/prospect-discovery-status.json</code> and <code>docs/prospect-discovery-handoff.md</code>. This page mirrors the committed file at build time.</p>
  <section className="panel mt-7 grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-4">
   <div><p className="muted text-xs">Overall status</p><p className={'mt-2 text-lg font-semibold '+tone[s.overall_status]}>{statusLabel(s.overall_status)}</p></div>
   <div><p className="muted text-xs">Current milestone</p><p className="mt-2 text-lg font-semibold">{s.current_milestone||'—'}</p></div>
   <div><p className="muted text-xs">Responsible agent</p><p className="mt-2 text-lg font-semibold">{s.responsible_agent}</p><p className="muted text-xs">{s.safe_for_other_agent_to_edit?'Safe for another agent to edit':'Do not edit concurrently'}</p></div>
   <div><p className="muted text-xs">Last updated</p><p className="mt-2 text-sm font-semibold">{s.last_updated?new Date(s.last_updated).toLocaleString('en-US',{timeZone:'America/New_York'}):'—'}</p></div>
   <div className="sm:col-span-2"><p className="muted text-xs">Branch</p><p className="mt-1 break-all font-mono text-xs">{s.branch}</p><p className="muted mt-1 break-all text-xs">{s.worktree}</p></div>
   <div className="sm:col-span-2"><p className="muted text-xs">Latest commit</p><p className="mt-1 break-all font-mono text-xs">{s.latest_commit?s.latest_commit.sha.slice(0,10)+' · '+s.latest_commit.message:'None recorded'}</p></div>
  </section>
  <section className="panel mt-6 p-6">
   <p className="kicker">Exact next action</p><p className="mt-3 text-sm leading-6">{s.next_action||'—'}</p>
   {s.blockers.length>0&&<div className="mt-4"><p className="text-sm font-semibold text-amber-200">Blockers</p><ul className="mt-2 list-disc pl-5 text-sm">{s.blockers.map(x=><li key={x}>{x}</li>)}</ul></div>}
   {s.manual_steps.length>0&&<div className="mt-4"><p className="text-sm font-semibold">Manual steps for the owner</p><ul className="mt-2 list-disc pl-5 text-sm leading-6">{s.manual_steps.map(x=><li key={x}>{x}</li>)}</ul></div>}
  </section>
  <section className="mt-6 space-y-4">{s.milestones.map(m=><details key={m.id} className="panel p-5" open={m.status==='in_progress'||m.status==='blocked'}>
   <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
    <span className="font-semibold">{m.id} · {m.title}</span>
    <span className={'text-xs font-semibold '+tone[m.status]}>{statusLabel(m.status)} · {m.responsible_agent}{m.commit?' · '+m.commit.slice(0,8):''}</span>
   </summary>
   <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
    {([['Completed',m.completed],['In progress',m.in_progress],['Remaining',m.remaining]] as const).map(([label,items])=><div key={label}>
     <p className="muted text-xs">{label}</p>
     {items.length?<ul className="mt-2 list-disc space-y-1 pl-5 leading-5">{items.map(x=><li key={x}>{x}</li>)}</ul>:<p className="muted mt-2 text-xs">—</p>}
    </div>)}
   </div>
   {m.files_changed.length>0&&<p className="muted mt-4 break-all font-mono text-[11px] leading-5">{m.files_changed.join(' · ')}</p>}
   <p className="muted mt-2 text-xs">{m.safe_for_other_agent_to_edit?'Safe for another agent to edit.':'Owned by '+m.responsible_agent+'; coordinate before editing.'}</p>
  </details>)}</section>
  <section className="panel mt-6 overflow-x-auto">
   <div className="p-6"><p className="kicker">Tests run</p></div>
   <table><thead><tr><th>Command</th><th>Result</th><th>When</th></tr></thead>
   <tbody>{s.tests.map((t,i)=><tr key={i}><td className="font-mono text-xs">{t.command}</td><td className="text-sm">{t.result}</td><td className="muted text-xs">{t.ran_at?new Date(t.ran_at).toLocaleString('en-US',{timeZone:'America/New_York'}):''}</td></tr>)}</tbody></table>
  </section>
  <section className="panel mt-6 p-6">
   <p className="kicker">Known limitations</p>
   <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">{s.known_limitations.map(x=><li key={x}>{x}</li>)}</ul>
  </section>
  <p className="muted mt-5 text-xs"><Link className="text-cyan-300 underline" href="/app/discovery">Prospect Discovery</Link> · <Link className="text-cyan-300 underline" href="/app/roadmap">Build Roadmap</Link></p>
 </main>;
}
