import Link from 'next/link';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { signOut } from '@/app/login/actions';
import { LayoutDashboard, Building2, Upload, PanelsTopLeft, ShieldCheck, ScanSearch, Activity, Target, ListChecks, ClipboardList } from 'lucide-react';
import {requireWorkspace} from '@/lib/workspace';
import {getProjectProgress} from '@/lib/project-roadmap-server';
import RoadmapSidebar from '@/components/roadmap-sidebar';

const links=[
  {href:'/app',icon:LayoutDashboard,label:'Mission Control'},
  {href:'/app/roadmap',icon:ListChecks,label:'Build Roadmap'},
  {href:'/app/leads',icon:Building2,label:'Business CRM'},
  {href:'/app/discovery',icon:ScanSearch,label:'Prospect Discovery'},
  {href:'/app/intelligence',icon:Activity,label:'Website Intelligence'},
  {href:'/app/opportunities',icon:Target,label:'Opportunity Board'},
  {href:'/app/leads/import',icon:Upload,label:'Lead intake'},
  {href:'/app/demos',icon:PanelsTopLeft,label:'Demo studio'},
  {href:'/app/project-status',icon:ClipboardList,label:'Project Status'},
];

export default async function PrivateLayout({children}:{children:React.ReactNode}){
  if(!hasSupabaseConfig()) return <main className="shell flex items-center justify-center p-6"><div className="panel max-w-lg p-8"><p className="kicker">Setup required</p><h1 className="mt-3 text-2xl">Connect Supabase</h1><p className="muted mt-3">Set environment variables and run the database migration before the private app can be used. See README.md.</p></div></main>;
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
      <div className="mt-8 border-t border-[#233440] pt-5"><div className="flex items-center gap-2 text-xs text-[#8fadb8]"><ShieldCheck size={15}/> Supabase authenticated</div><form action={signOut} className="mt-5"><button className="cursor-pointer text-xs text-[#a8bfcb] underline" type="submit">Sign out</button></form></div>
    </aside>
    <div className="min-w-0 flex-1 px-5 py-9 lg:px-12">{children}</div>
  </div>;
}
