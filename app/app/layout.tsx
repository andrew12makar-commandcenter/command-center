import Link from 'next/link';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { signOut } from '@/app/login/actions';
import { LayoutDashboard, Building2, Upload, PanelsTopLeft, ShieldCheck, ScanSearch, Activity, Target, ListChecks, ClipboardList, PlayCircle } from 'lucide-react';
import {requireWorkspace} from '@/lib/workspace';
import {getProjectProgress} from '@/lib/project-roadmap-server';
import RoadmapSidebar from '@/components/roadmap-sidebar';
import {summarizeRoadmap} from '@/lib/project-roadmap';

const links=[
  {href:'/app',icon:LayoutDashboard,label:'Mission Control'},
  {href:'/app/roadmap',icon:ListChecks,label:'Build Roadmap'},
  {href:'/app/leads',icon:Building2,label:'Business CRM'},
  {href:'/app/discovery',icon:ScanSearch,label:'Prospect Discovery'},
  {href:'/app/intelligence',icon:Activity,label:'Website Intelligence'},
  {href:'/app/opportunities',icon:Target,label:'Opportunity Board'},
  {href:'/app/leads/import',icon:Upload,label:'Lead intake'},
  {href:'/app/demos',icon:PanelsTopLeft,label:'Demo studio'},
  {href:'/app/project-status',icon:ClipboardList,label:'Agent Checkpoints'},
  {href:'/app/rehearsal',icon:PlayCircle,label:'Lead Intake Rehearsal'},
];

export default async function PrivateLayout({children}:{children:React.ReactNode}){
  if(!hasSupabaseConfig()) return <div className="shell min-h-screen lg:flex">
    <aside className="w-full shrink-0 border-b border-[#243745] bg-[#0b141d] px-5 py-7 lg:sticky lg:top-0 lg:h-screen lg:w-[286px] lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <Link href="/tracker" className="flex items-center gap-3 font-semibold tracking-wide"><div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-200">◉</div><span className="text-sm">COMMAND CENTER</span></Link>
      <p className="kicker mt-5 text-[10px]">LOCAL PROGRESS VIEW</p>
      <RoadmapSidebar projects={summarizeRoadmap()} availability="setup_required" planHref="/tracker"/>
      <p className="mt-6 border-t border-[#233440] pt-4 text-xs leading-5 text-[#8fadb8]">Project progress is available offline. CRM, prospect intake, and saved updates need the workspace connection.</p>
    </aside>
    <main className="min-w-0 flex-1 px-5 py-8 lg:px-12 lg:py-12">
      <section className="mx-auto max-w-3xl rounded-3xl border border-[#2a4654] bg-[linear-gradient(150deg,#142633,#0e1821)] p-7 shadow-[0_20px_70px_#00000030] sm:p-10">
        <p className="kicker">Command Center · local view</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Your progress tracker is available.</h1>
        <p className="muted mt-4 text-sm leading-7">The workspace database is not connected in this local app, so business records and saved changes cannot load. The project plan is still available from the left panel and uses the progress included with this build.</p>
        <Link href="/tracker" className="mt-6 inline-flex items-center rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20">Open the full progress plan</Link>
        <p className="mt-5 text-xs leading-5 text-[#92aab5]">To enable the CRM and prospect workflow, configure the local Supabase connection and apply the required migrations. This screen does not connect to or change production data.</p>
      </section>
    </main>
  </div>;
  const {supabase,organizationId}=await requireWorkspace();
  const {projects,availability}=await getProjectProgress(supabase,organizationId);
  return <div className="shell lg:flex">
    <aside className="w-full shrink-0 border-b border-[#243745] bg-[#0b141d] px-5 py-7 lg:sticky lg:top-0 lg:h-screen lg:w-[286px] lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <Link href="/app" className="flex items-center gap-3 font-semibold tracking-wide"><div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-200">◉</div><span className="text-sm">COMMAND CENTER</span></Link>
      <p className="kicker mt-5 text-[10px]">BUSINESS OPERATIONS</p>
      <nav className="mt-9 flex flex-wrap gap-2 lg:flex-col">
        {links.map(item=><Link href={item.href} key={item.href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#a8bfcb] transition hover:bg-[#192d39] hover:text-white">
          <item.icon size={17} strokeWidth={1.8}/>{item.label}</Link>)}
      </nav>
      <RoadmapSidebar projects={projects} availability={availability}/>
      <div className="mt-8 border-t border-[#233440] pt-5"><div className="flex items-center gap-2 text-xs text-[#8fadb8]"><ShieldCheck size={15}/> Signed-in workspace</div><form action={signOut} className="mt-5"><button className="cursor-pointer text-xs text-[#a8bfcb] underline" type="submit">Sign out</button></form></div>
    </aside>
    <div className="min-w-0 flex-1 px-5 py-7 lg:px-12 lg:py-9">
      <aside aria-label="Connected data notice" className="mb-6 rounded-xl border border-amber-700/50 bg-amber-950/20 px-4 py-3 text-xs leading-5 text-amber-100">
        <strong className="mr-2">Connected workspace.</strong>
        Discovery, intake, CRM changes, website audits, and demo drafts save to shared sales records. Lead Intake Rehearsal uses fictional sample cases stored only in this browser tab.
      </aside>
      {children}
    </div>
  </div>;
}
