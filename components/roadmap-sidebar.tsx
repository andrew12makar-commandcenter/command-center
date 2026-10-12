import Link from 'next/link';
import {AlertTriangle,ArrowUpRight,BookOpen,Check,ChevronRight,Circle,LoaderCircle,Target} from 'lucide-react';
import type {TrackedProject} from '@/lib/project-roadmap';
import type {ProgressAvailability} from '@/lib/project-roadmap-server';

export default function RoadmapSidebar({projects,availability}:{
 projects:TrackedProject[];availability:ProgressAvailability
}){
 return <section aria-label="Venture build progress" className="mt-7 border-t border-white/[.08] pt-6">
  <div className="mb-3 flex items-center justify-between gap-3 px-1">
   <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.19em] text-[#93b4bf]">
    <Target size={13} className="text-[#94dce5]"/> BUILD PROGRESS
   </span>
   <Link href="/app/roadmap" className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#a0e1e8] hover:text-white">
    Open plan <ArrowUpRight size={12}/>
   </Link>
  </div>
  <div className="space-y-3">
   {projects.map((project,index)=><article key={project.id}
    className="rounded-[17px] border border-[#314b57] bg-[linear-gradient(155deg,#1a2b37,#101b25)] p-4 shadow-[0_12px_28px_#00000025]">
    <div className="flex items-center justify-between gap-3">
     <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.05] text-[#b7dae2]">
       {index===0?<Target size={16}/>:<BookOpen size={16}/>}
      </span>
      <div className="min-w-0">
       <h2 className="truncate text-[13px] font-semibold tracking-[-.02em] text-[#f0f7fa]">{project.name}</h2>
       <p className="truncate text-[10px] text-[#90aebc]">{project.subtitle}</p>
      </div>
     </div>
     <span className="shrink-0 text-xs font-semibold tabular-nums text-[#d0e5e9]">{project.percent}%</span>
    </div>
    <div className="mt-4 h-[5px] overflow-hidden rounded-full bg-[#2d4350]" role="progressbar"
     aria-label={project.name+' milestone completion'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={project.percent}>
     <div className={'h-full rounded-full '+(index===0?'bg-[#7edbe4]':'bg-[#b6bfe8]')}
      style={{width:project.percent+'%'}}/>
    </div>
    <p className="mt-1.5 text-[10px] text-[#8fa9b5]">{project.completed} / {project.total} verified checkpoints</p>
    {project.id==='seo'&&<div className="mt-4 border-t border-white/[.09] pt-3">
     <p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#88aab5]">Website sprint</p>
     <ol className="mt-2 space-y-2">
      {project.stages.find(stage=>stage.id==='websites')?.steps
       .filter(item=>['seo-site-facts','seo-site-source-media','seo-site-rights','seo-site-ai-media','seo-site-variance','seo-site-motion','seo-site-visual-qa'].includes(item.id))
       .map(item=>{
        const icon=item.status==='completed'?<Check size={11}/>:item.status==='in_progress'?<LoaderCircle size={11}/>:item.status==='blocked'?<AlertTriangle size={11}/>:<Circle size={9}/>;
        const label=item.status==='completed'?'Done':item.status==='in_progress'?'Active':item.status==='blocked'?'Blocked':'Queued';
        const color=item.status==='completed'?'text-[#a9dfc4]':item.status==='in_progress'?'text-[#8fe1e8]':item.status==='blocked'?'text-[#e4bd8d]':'text-[#809aa6]';
        return <li key={item.id} className="flex items-start justify-between gap-2 text-[10px] leading-4">
         <Link href={'/app/roadmap?project=seo#'+item.id} className="min-w-0 text-[#bed0d6] hover:text-white">{item.title}</Link>
         <span className={'flex shrink-0 items-center gap-1 font-semibold '+color}>{icon}{label}</span>
        </li>;
       })}
     </ol>
    </div>}
    <div className="mt-4 border-t border-white/[.09] pt-3">
     <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#98dee3]">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#8bd7df]"/>
      {project.current?.status==='in_progress'?'IN PROGRESS':'UP NEXT'}
     </p>
     <p className="mt-1.5 text-[12px] font-semibold leading-[1.55] text-[#e9f3f5]">
      {project.current?.title??'Every checkpoint complete'}
     </p>
     {project.next&&<p className="mt-2 text-[11px] leading-[1.5] text-[#93adb8]">
      <span className="font-semibold text-[#b9d0d7]">Then: </span>{project.next.title}
     </p>}
     {project.blocked.length>0&&<p className="mt-2 text-[11px] text-[#e0bb8f]">
      {project.blocked.length} blocked checkpoint{project.blocked.length===1?'':'s'}
     </p>}
     <Link href={'/app/roadmap?project='+project.id+(project.current?'#'+project.current.id:'')}
      className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#92dfe7] hover:text-white">
      Continue <ChevronRight size={13}/>
     </Link>
    </div>
   </article>)}
  </div>
  <p className="mt-3 px-1 text-[10px] leading-4 text-[#7a97a3]">
   {availability==='ready'?'Confirmed updates advance the next priority.':
    availability==='setup_required'?'Read-only until migrations 0005 and 0006 are applied.':
    'Read-only preview while progress sync is unavailable.'}
  </p>
 </section>;
}
