// Closed generate -> render -> measure -> retain loop.
//
// 1. Start from trait defaults (or a retrieved starting design).
// 2. Apply resolved feedback rules one at a time. Each change is rendered and
//    measured on its own; a change that fails a gate or regresses a structural
//    measurement is reverted and the reason recorded.
// 3. Search bounded single-decision alternatives. In rules+search mode only
//    the decisions touched by feedback are searched. Candidates are rejected
//    before rendering when a hard rule, a learned constraint, missing content
//    or palette contrast rules them out, and skipped when even a perfect
//    structural score could not beat the current design.
// Every render and evaluation is cached by stable hash. No network, crawl,
// image generation or model call can happen here; the ledger proves it.
import {composePage,decisionFeasible} from './compose.ts';
import {candidateKey,deriveTraits,designDimensions,dimensionNames,palettes,traitDefaults,type BusinessFacts,type DesignCandidate,type Dimension} from './design-space.ts';
import {evaluatePlan,precheckCandidate,signatureDiff,type Evaluation,type StructuralMetric} from './evaluate.ts';
import {alignment,applyRules,hardViolations,type ActiveRules,type Rule} from './preference-model.ts';
import {renderPlanHtml} from './render.ts';
import {stableHash,type EvaluationCache} from './stable-hash.ts';

export const GENERATOR_VERSION='generator-loop/2';
export const EVALUATOR_VERSION='loop-eval/2';

export type Mode='baseline'|'retrieval'|'rules'|'search'|'rules+search'|'hybrid';
export type RunBudget={maxRounds:number;maxCandidatesPerRound:number;maxEvaluations:number;
 maxBrowserRenders:number;maxCrawls:number;maxModelCalls:number;maxImageGenerations:number};
export const defaultBudget:RunBudget={maxRounds:3,maxCandidatesPerRound:8,maxEvaluations:40,
 maxBrowserRenders:0,maxCrawls:0,maxModelCalls:0,maxImageGenerations:0};
export type Ledger={
 /** Candidates composed, rendered and measured (cache misses). */
 evaluations:number;cacheHits:number;
 /** Candidates ruled out by cheap checks before any render. */
 rejectedBeforeRender:number;
 /** Candidates skipped because even a perfect structural score could not win. */
 skippedByBound:number;
 /** Upper estimate made before the run, for comparison with actual work. */
 estimatedEvaluations:number;
 browserRenders:number;crawls:number;modelCalls:number;imageGenerations:number;
 elapsedMs:number;
};
export const emptyLedger=():Ledger=>({evaluations:0,cacheHits:0,rejectedBeforeRender:0,skippedByBound:0,estimatedEvaluations:0,
 browserRenders:0,crawls:0,modelCalls:0,imageGenerations:0,elapsedMs:0});
export class BudgetExceeded extends Error{}

export type Outcome='accepted'|'rejected'|'reverted';
export type Decision={
 id:string;dimension:Dimension;prior:string;revised:string;
 source:'feedback-rule'|'retrieval'|'search';ruleIds:string[];
 /** Feedback event ids behind the rules that proposed this change. */
 evidence:string[];
 structuralBefore:number;structuralAfter:number;alignmentBefore:number;alignmentAfter:number;
 metricDeltas:Partial<Record<StructuralMetric,number>>;regressed:StructuralMetric[];
 renderBefore:string;renderAfter:string|null;
 outcome:Outcome;reason:string;
 visualDiff:{removed:string[];added:string[]};
};
export type ScoredCandidate={candidate:DesignCandidate;evaluation:Evaluation;alignment:number;diversity:number;total:number;gates:string[]};
export type LoopResult={businessId:string;mode:Mode;base:ScoredCandidate;start:DesignCandidate;chosen:ScoredCandidate;
 decisions:Decision[];alternatives:{change:string;structural:number|null;total:number|null;outcome:Outcome;reason:string}[];
 stoppedBecause:string;ledger:Ledger;html:string};

type LoopInput={facts:BusinessFacts;active:ActiveRules;cache:EvaluationCache<Evaluation>;mode?:Mode;
 /** Retrieved starting design (retrieval mode). */
 start?:DesignCandidate|null;
 budget?:Partial<RunBudget>;ledger?:Ledger;peers?:DesignCandidate[];minGain?:number;tolerance?:number};

/** Fraction of decisions that differ from the closest already-chosen peer. */
export function diversityAgainst(c:DesignCandidate,peers:DesignCandidate[]){
 if(!peers.length)return 1;
 return Math.min(...peers.map(p=>dimensionNames.filter(d=>p[d]!==c[d]).length/dimensionNames.length));
}

const W={structural:.75,alignment:.2,diversity:.05};

export function runLoop(input:LoopInput):LoopResult{
 const t0=Date.now();
 const budget={...defaultBudget,...input.budget};
 const mode=input.mode??'rules+search';
 const ledger=input.ledger??emptyLedger();
 const minGain=input.minGain??.006,tolerance=input.tolerance??.02;
 const {facts,cache}=input,peers=input.peers??[];
 const useRules=mode==='rules'||mode==='rules+search'||mode==='hybrid';
 const active:ActiveRules=useRules?input.active:{rules:[],shadowed:[]};
 const traits=deriveTraits(facts);
 const factsHash=stableHash(facts);
 const base=traitDefaults(traits,facts.id);
 const startEvaluations=ledger.evaluations;
 const learned=active.rules.filter(r=>r.source==='evaluation');
 const feedbackRules=active.rules.filter(r=>r.source==='feedback');
 const hasRules=feedbackRules.length>0;
 const wS=hasRules?W.structural:W.structural+W.alignment;

 /** Cheapest checks first; returns a reason when the candidate must not be rendered. */
 const precheck=(c:DesignCandidate):string|null=>{
  const hard=hardViolations(active,c);if(hard.length)return `hard rule: ${hard[0]}`;
  const constraint=learned.find(r=>r.op==='avoid'&&String(c[r.dimension])===r.value);
  if(constraint)return `learned constraint: avoid ${constraint.dimension}=${constraint.value} for ${Object.entries(constraint.when??{}).map(([k,v])=>`${k}=${v}`).join(',')}`;
  const infeasible=decisionFeasible(facts,c);if(infeasible)return infeasible;
  const contrast=precheckCandidate(c,palettes[c.palette]);if(contrast.length)return contrast[0];
  return null;
 };
 const measure=(c:DesignCandidate):Evaluation=>{
  const key=stableHash([EVALUATOR_VERSION,factsHash,candidateKey(c)]);
  const hit=cache.get(key);
  if(hit){ledger.cacheHits++;return hit;}
  if(ledger.evaluations-startEvaluations>=budget.maxEvaluations)throw new BudgetExceeded(`evaluation budget of ${budget.maxEvaluations} reached`);
  ledger.evaluations++;
  const plan=composePage(facts,c);
  const ev=evaluatePlan(facts,plan,renderPlanHtml(plan,facts.name));
  cache.set(key,ev);return ev;
 };
 const score=(c:DesignCandidate):ScoredCandidate=>{
  const evaluation=measure(c);
  const a=alignment({rules:feedbackRules,shadowed:[]},c,base),d=diversityAgainst(c,peers);
  const gates=[...evaluation.gates,...hardViolations(active,c)];
  const total=evaluation.structural*wS+(hasRules?a*W.alignment:0)+d*W.diversity;
  return {candidate:c,evaluation,alignment:a,diversity:d,total:Math.round(total*1000)/1000,gates};
 };
 const regressions=(before:Evaluation,after:Evaluation)=>(Object.keys(before.metrics) as StructuralMetric[])
  .filter(k=>after.metrics[k]<before.metrics[k]-.15);
 const deltas=(before:Evaluation,after:Evaluation)=>{
  const out:Partial<Record<StructuralMetric,number>>={};
  for(const k of Object.keys(before.metrics) as StructuralMetric[]){const d=Math.round((after.metrics[k]-before.metrics[k])*1000)/1000;if(d)out[k]=d;}
  return out;
 };
 const decisions:Decision[]=[],alternatives:LoopResult['alternatives']=[];
 const record=(from:ScoredCandidate,to:ScoredCandidate|null,d:Dimension,revised:string,source:Decision['source'],rules:Rule[],outcome:Outcome,reason:string,regressed:StructuralMetric[]=[])=>{
  decisions.push({id:stableHash([facts.id,mode,decisions.length,d,revised]),dimension:d,prior:String(from.candidate[d]),revised,source,
   ruleIds:rules.map(r=>r.id),evidence:[...new Set(rules.flatMap(r=>r.evidence))],
   structuralBefore:from.evaluation.structural,structuralAfter:to?.evaluation.structural??from.evaluation.structural,
   alignmentBefore:from.alignment,alignmentAfter:to?.alignment??from.alignment,
   metricDeltas:to?deltas(from.evaluation,to.evaluation):{},regressed,
   renderBefore:from.evaluation.renderId,renderAfter:to?.evaluation.renderId??null,outcome,reason,
   visualDiff:to?signatureDiff(from.evaluation.signature,to.evaluation.signature):{removed:[],added:[]}});
 };

 // Pre-run estimate: base + start + one per applicable rule change + search ceiling.
 const {applied}=useRules?applyRules(active,input.start??base):{applied:[]};
 const searching=mode==='search'||mode==='rules+search'||mode==='hybrid';
 ledger.estimatedEvaluations+=2+applied.length+(searching?budget.maxRounds*budget.maxCandidatesPerRound:0);

 const baseScored=score(base);
 let current=baseScored;
 let stoppedBecause='baseline mode';

 if((mode==='retrieval'||mode==='hybrid')&&input.start){
  for(const d of dimensionNames){
   const to=String(input.start[d]);
   if(to===String(current.candidate[d]))continue;
   const trial={...current.candidate,[d]:to} as DesignCandidate;
   const pre=precheck(trial);
   if(pre){ledger.rejectedBeforeRender++;record(current,null,d,to,'retrieval',[],'rejected',pre);continue;}
   let s:ScoredCandidate;
   try{s=score(trial);}catch(e){if(e instanceof BudgetExceeded){stoppedBecause=e.message;break;}throw e;}
   const reg=regressions(current.evaluation,s.evaluation);
   const ok=!s.gates.length&&!reg.length&&s.evaluation.structural>=current.evaluation.structural-tolerance;
   record(current,s,d,to,'retrieval',[],ok?'accepted':'reverted',ok?'copied from the most similar reviewed business':
    s.gates.length?`reverted: ${s.gates[0]}`:`reverted: ${reg.join(', ')||'structural score fell'}`,reg);
   if(ok)current=s;
  }
  stoppedBecause='retrieval applied';
 }

 // Step 2: feedback-rule changes, each measured in isolation, on top of
 // whatever design retrieval produced.
 const toApply=mode==='hybrid'?applyRules(active,current.candidate).applied:applied;
 for(const a of toApply){
  const d=a.rule.dimension;
  if(current.candidate[d]===a.to)continue;
  const trial={...current.candidate,[d]:a.to} as DesignCandidate;
  const pre=precheck(trial);
  if(pre){ledger.rejectedBeforeRender++;record(current,null,d,a.to,'feedback-rule',[a.rule],'rejected',`not rendered: ${pre}`);continue;}
  let s:ScoredCandidate;
  try{s=score(trial);}catch(e){if(e instanceof BudgetExceeded){stoppedBecause=e.message;break;}throw e;}
  const drop=current.evaluation.structural-s.evaluation.structural;
  const reg=regressions(current.evaluation,s.evaluation);
  const ok=!s.gates.length&&drop<=tolerance&&!reg.length;
  record(current,s,d,a.to,'feedback-rule',[a.rule],ok?'accepted':'reverted',
   ok?`applied ${a.rule.scope} rule ${a.rule.op} ${a.rule.value??''}`.trim():
   s.gates.length?`reverted: ${s.gates[0]}`:reg.length?`reverted: ${reg.join(', ')} regressed${s.evaluation.notes.length?` (${s.evaluation.notes[0]})`:''}`:
   `reverted: structural score fell ${drop.toFixed(3)}`,reg);
  if(ok)current=s;
  stoppedBecause='rules applied';
 }

 // Step 3: bounded search.
 if(searching){
  const affected=new Set(feedbackRules.map(r=>r.dimension));
  const searchable=mode==='search'?dimensionNames:dimensionNames.filter(d=>affected.has(d));
  stoppedBecause=searchable.length?'no candidate improved the design':'no decision is affected by feedback';
  for(let round=0;round<budget.maxRounds&&searchable.length;round++){
   const options:{c:DesignCandidate;d:Dimension;bound:number}[]=[];
   for(const d of searchable)for(const v of designDimensions[d] as readonly string[]){
    if(v===current.candidate[d])continue;
    const c={...current.candidate,[d]:v} as DesignCandidate;
    const pre=precheck(c);
    if(pre){ledger.rejectedBeforeRender++;continue;}
    const a=alignment({rules:feedbackRules,shadowed:[]},c,base),div=diversityAgainst(c,peers);
    // Upper bound: a perfect structural score with this alignment and diversity.
    const bound=wS+(hasRules?a*W.alignment:0)+div*W.diversity;
    if(bound<current.total+minGain){ledger.skippedByBound++;continue;}
    options.push({c,d,bound:bound+parseInt(stableHash([facts.id,d,v]).slice(0,4),16)/65536*1e-4});
   }
   if(!options.length){stoppedBecause='no remaining candidate could beat the current design';break;}
   options.sort((x,y)=>y.bound-x.bound);
   let best:ScoredCandidate|null=null,bestD:Dimension|null=null;
   for(const o of options.slice(0,budget.maxCandidatesPerRound)){
    if(best&&o.bound<best.total+minGain){ledger.skippedByBound++;continue;}
    let s:ScoredCandidate;
    try{s=score(o.c);}catch(e){if(e instanceof BudgetExceeded){stoppedBecause=e.message;break;}throw e;}
    const reg=regressions(current.evaluation,s.evaluation);
    const change=`${o.d}=${o.c[o.d]}`;
    const why=s.gates.length?s.gates[0]:reg.length?`regression: ${reg.join(', ')}`:
     s.evaluation.structural<current.evaluation.structural-tolerance?'structural score fell':null;
    alternatives.push({change,structural:s.evaluation.structural,total:s.total,outcome:why?'rejected':'accepted',reason:why??'candidate'});
    if(why)continue;
    if(!best||s.total>best.total){best=s;bestD=o.d;}
   }
   if(!best||!bestD||best.total<current.total+minGain)break;
   const rules=feedbackRules.filter(r=>r.dimension===bestD);
   record(current,best,bestD,String(best.candidate[bestD]),'search',rules,'accepted',`search gain ${(best.total-current.total).toFixed(3)}`);
   current=best;
  }
 }
 const plan=composePage(facts,current.candidate);
 ledger.elapsedMs+=Date.now()-t0;
 return {businessId:facts.id,mode,base:baseScored,start:input.start??base,chosen:current,decisions,alternatives:alternatives.slice(0,24),
  stoppedBecause,ledger,html:renderPlanHtml(plan,facts.name)};
}
