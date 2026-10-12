import Link from 'next/link';
import {ArrowUpRight,BookOpen,Check,ChevronRight,Target} from 'lucide-react';
import type {TrackedProject} from '@/lib/project-roadmap';
import type {ProgressAvailability} from '@/lib/project-roadmap-server';

export default function RoadmapSidebar({projects,availability}:{
 projects:TrackedProject[];availability:ProgressAvailability
}){
 return <section aria-label="Venture milestones" className="mt-7 border-t border-white/[.08] pt-6">
  <div className="mb-3 flex items-center justify-between gap-2 px-1">
   <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.19em] text-[#88a6b3]">
    <Target size={13} className="text-[#81dbe4]"/> Progress
   </div>
   <Link href="/app/roadmap" className="flex items-center gap-1 text-[11px] font-semibold text-[#9dc8d5] transition hover:text-white">
    Full plan <ArrowUpRight size={12}/>
   </Link>
  </div>
  <div className="space-y-3">
   {projects.map((project,index)=>
    <div key={project.id} className="relative overflow-hidden rounded-[17px] border border-[#2b414c] bg-[linear-gradient(150deg,#192a35_0%,#111d27_78%)] p-4 shadow-[0_9px_25px_#00000020]">
     <div className="pointer-events-none absolute -right-10 -top-14 h-28 w-28 rounded-full bg-cyan-400/[.06] blur-2xl"/>
     <div className="relative flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
       <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[.09] bg-white/[.04] text-[#99d6e0]">
        {index===0?<Target size={14}/>:<BookOpen size={14}/>}
       </span>
       <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold tracking-[-.015em] text-[#e8f2f6]">{project.name}</p>
        <p className="mt-[1px] truncate text-[10px] text-[#849fac]">{project.subtitle}</p>
       </div>
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-[#b8d4dc]">{project.completed}/{project.total}</span>
     </div>
     <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-[#314450]" role="progressbar"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={project.percent} aria-label={project.name+' milestone progress'}>
      <div className={'h-full rounded-full '+(index===0?'bg-[#83dbe3]':'bg-[#a7b5d8]')} style={{width:String(project.percent)+'%'}}/>
     </div>
     <div className="mt-3 border-t border-white/[.07] pt-3">
      <p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#809ba8]">{project.current?'Up next':'All checkpoints complete'}</p>
      <p className="mt-1.5 text-[12px] font-medium leading-[1.45] text-[#d8e8ee]">
       {project.current?.title??project.target}
      </p>
      <Link href={'/app/roadmap?project='+project.id+(project.current?'#'+project.current.id:'')}
       className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#81dbe4] transition hover:text-white">
       {project.current?'Open next milestone':'Review project'} <ChevronRight size={13}/>
      </Link>
     </div>
    </div>
   )}
  </div>
  <p className="mt-3 px-1 text-[10px] leading-[1.5] text-[#718d9a]">
   {availability==='ready'?'Advances as confirmed checkpoints are saved.':
    availability==='setup_required'?'Read-only until milestone storage is enabled.':
    'Read-only while milestone storage is unavailable.'}
  </p>
 </section>;
}
