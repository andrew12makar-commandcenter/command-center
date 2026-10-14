import type {ReactNode} from 'react';
import {evidenceStateLabels,progressLabels,opportunityLabels,strengthLabels,confidenceLabels,
 type EvidenceState,type Progress,type Qualification} from '@/lib/prospect-qualification';

// Unknown is visibly different from a verified absence: dashed and grey versus solid red.
const stateStyle:Record<EvidenceState,string>={
 verified_present:'border-emerald-700/70 text-emerald-200',
 verified_missing:'border-rose-600/80 bg-rose-950/30 text-rose-200',
 likely_weak:'border-amber-600/70 text-amber-200',
 unknown:'border-dashed border-[#4a6270] text-[#9fb6c0]',
 conflicting:'border-orange-500/80 bg-orange-950/30 text-orange-200'};
const stateIcon:Record<EvidenceState,string>={verified_present:'✓',verified_missing:'✕',likely_weak:'!',unknown:'?',conflicting:'⚠'};
export function EvidenceChip({label,state}:{label:string;state:EvidenceState}){
 return <span className={'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold '+stateStyle[state]}
  title={label+': '+evidenceStateLabels[state]}>{stateIcon[state]} {label}: {evidenceStateLabels[state]}</span>;
}
const progressOrder:Progress[]=['discovered','needs_review','qualified','imported','demo_ready','pitch_ready','outreach_ready'];
export function ProgressChip({progress}:{progress:Progress}){
 const step=progressOrder.indexOf(progress);
 return <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-100" title={'Step '+(step+1)+' of '+progressOrder.length}>
  <span aria-hidden="true" className="flex gap-0.5">{progressOrder.map((p,i)=><span key={p} className={'h-1.5 w-3 rounded-full '+(i<=step?'bg-cyan-300':'bg-[#2d4350]')}/>)}</span>
  {progressLabels[progress]}</span>;
}
export function ScoreBadge({q}:{q:Qualification}){
 const tone=q.score>=70?'text-emerald-200 border-emerald-700/60':q.score>=50?'text-cyan-100 border-cyan-700/60':'text-[#b8cbd3] border-[#3a5260]';
 return <span className={'inline-flex items-baseline gap-1 rounded-lg border px-2 py-1 '+tone}><strong className="text-lg leading-none">{q.score}</strong><span className="text-[10px]">/100</span></span>;
}
export function Headline({q}:{q:Qualification}){
 return <span className="text-sm"><strong className="text-white">{opportunityLabels[q.primaryOpportunity]}</strong>
  <span className="muted"> · {strengthLabels[q.opportunityStrength]} need · {confidenceLabels[q.evidenceConfidence]} confidence</span>
  {q.recommendedOutsideCampaign&&<span className="ml-2 rounded-full border border-violet-600/60 px-2 py-0.5 text-[11px] text-violet-200">Better fit: {opportunityLabels[q.recommended]}</span>}
  {!q.recommendedOutsideCampaign&&q.secondary.length>0&&<span className="muted"> · also {q.secondary.map(l=>opportunityLabels[l]).join(', ')}</span>}
  </span>;
}
export function ScoreBreakdown({q}:{q:Qualification}){
 return <div className="space-y-2 text-xs leading-5">
  {q.parts.map(p=><div key={p.key} className="grid grid-cols-[1fr_auto] gap-2">
   <div><span className="font-semibold text-[#d6e6ec]">{p.label}</span><span className="muted"> · {p.why.join(' ')}</span></div>
   <span className="tabular-nums text-[#d6e6ec]">{p.points}/{p.max}</span></div>)}
  {q.penalties.map(p=><div key={p.key} className="grid grid-cols-[1fr_auto] gap-2 text-amber-200"><span>Penalty: {p.label}</span><span className="tabular-nums">{p.points}</span></div>)}
  <div className="grid grid-cols-[1fr_auto] gap-2 border-t border-[#2b4350] pt-1 font-semibold"><span>Total</span><span>{q.score}/100</span></div>
  <div className="pt-1"><p className="muted">Independent service lanes (need out of 30):</p>
   <ul className="mt-1 space-y-0.5">{q.lanes.map(l=><li key={l.lane}>{opportunityLabels[l.lane]}: {l.eligible?l.need:'n/a'} · <span className="muted">{l.why}</span></li>)}</ul></div>
 </div>;
}
export function Fold({title,children,open=false}:{title:string;children:ReactNode;open?:boolean}){
 return <details className="border-t border-[#243745] pt-2" open={open}>
  <summary className="cursor-pointer text-xs font-semibold text-cyan-200">{title}</summary>
  <div className="mt-2">{children}</div></details>;
}
