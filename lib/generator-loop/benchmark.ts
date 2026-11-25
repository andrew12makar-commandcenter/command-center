// Cross-industry experiment for the feedback loop. Five arms run on the same
// corpus with the same evaluator and cache:
//   baseline      trait defaults only
//   retrieval     copy the design of the most similar reviewed business
//   rules         learned scoped rules, applied and measured, no search
//   search        bounded search with no feedback
//   rules+search  learned rules, evaluation constraints, then search limited
//                 to the decisions feedback touched
// Learning uses train-business `feedback` only. Holdout agreement is scored
// against human-written expectations attached to held-out notes, so the
// interpreter's own reading of those notes never defines success.
import {composePage,permittedBusinessImages} from './compose.ts';
import {DATASET_SCHEMA,type ReviewRecord} from './dataset.ts';
import {deriveTraits,designDimensions,dimensionNames,traitDefaults,traitKeys,type BusinessFacts,type BusinessTraits,type DesignCandidate,type Dimension,type GeneratedImage} from './design-space.ts';
import type {Evaluation} from './evaluate.ts';
import {interpretFeedback,type FeedbackEvent,type Interpretation,type Signal} from './feedback-interpreter.ts';
import {EVALUATOR_VERSION,GENERATOR_VERSION,runLoop,emptyLedger,type Ledger,type LoopResult,type Mode,type RunBudget} from './loop.ts';
import {applyRules,buildPreferenceModel,constraintFromRevert,resolveRules,type PreferenceModel,type Rule} from './preference-model.ts';
import {memoryCache,stableHash,type EvaluationCache} from './stable-hash.ts';

type Note={rating:number;notes:string;tags?:string[];style?:string;expect?:string[]};
export type CorpusLike={split:'train'|'holdout';imageSet:string;
 facts:Omit<BusinessFacts,'imagery'>&{imagery:Omit<BusinessFacts['imagery'],'generated'>};
 feedback?:Note[];devFeedback?:Note[];heldOutFeedback?:Note[]};

export const arms:Mode[]=['baseline','retrieval','rules','search','rules+search','hybrid'];
export type ArmReport={
 mode:Mode;
 structural:{train:number;holdout:number};
 holdoutAgreement:number;agreementByStyle:Record<string,number>;agreementByIndustry:Record<string,number>;
 changes:{accepted:number;reverted:number;rejectedBeforeRender:number};
 structuralFailures:number;variety:number;compositions:number;
 cost:Ledger&{cacheHitRate:number;evaluationsAvoided:number};
};
export type InterpreterReport={split:'dev'|'holdout';notes:number;expected:number;predicted:number;matched:number;precision:number;recall:number;
 byStyle:Record<string,{expected:number;matched:number}>;misses:string[]};
export type BenchmarkReport={
 generatorVersion:string;evaluatorVersion:string;
 corpus:{businesses:number;industries:number;train:number;holdout:number;withheldIndustries:string[];withheldStyles:string[];
  learnNotes:number;devNotes:number;holdoutNotes:number;holdoutExpectations:number};
 model:{rules:number;bySource:Record<string,number>;byScope:Record<string,number>;induced:number;examples:string[];version:string};
 interpreter:{learn:{statements:number;byKind:Record<string,number>;unclear:string[]};dev:InterpreterReport;holdout:InterpreterReport;cacheHits:number};
 arms:ArmReport[];
 /** Leave-one-business-out agreement on training notes: learn from the other
  *  training businesses, predict this one's written expectations. Used for
  *  model selection so the holdout is never tuned against. */
 crossValidation:Record<string,{agreement:number;expectations:number}>;
 /** Chosen design and structural signature per business and arm. */
 designs:Record<string,{split:'train'|'holdout';byArm:Record<string,{design:DesignCandidate;renderId:string;signature:string[]}>}>;
 records:ReviewRecord[];
 elapsedMs:number;
};

const mean=(xs:number[])=>xs.length?Math.round(xs.reduce((a,b)=>a+b,0)/xs.length*1000)/1000:0;
const pairwiseDistance=(cs:DesignCandidate[])=>{
 let n=0,sum=0;
 for(let i=0;i<cs.length;i++)for(let j=i+1;j<cs.length;j++){sum+=dimensionNames.filter(d=>cs[i][d]!==cs[j][d]).length/dimensionNames.length;n++;}
 return n?Math.round(sum/n*1000)/1000:0;
};
const order=(d:Dimension)=>designDimensions[d] as readonly string[];

/** Does a candidate satisfy one written expectation, judged against the base design? */
export function satisfies(expectation:string,c:DesignCandidate,base:DesignCandidate){
 const [dim,op,value]=expectation.split(':') as [Dimension,string,string|undefined];
 const v=String(c[dim]),b=String(base[dim]),o=order(dim);
 if(op==='prefer')return v===value;
 if(op==='avoid')return v!==value;
 if(op==='keep')return v===b;
 if(op==='more')return o.indexOf(v)>o.indexOf(b)||(b===o[o.length-1]&&v===b);
 if(op==='less')return o.indexOf(v)<o.indexOf(b)||(b===o[0]&&v===b);
 return false;
}
const toExpectation=(s:Signal)=>{
 const op=s.op==='require'?'prefer':s.op==='forbid'?'avoid':s.op;
 return op==='more'||op==='less'?`${s.dimension}:${op}`:`${s.dimension}:${op}:${s.value}`;
};

export function traitSimilarity(a:BusinessTraits,b:BusinessTraits){
 return traitKeys.filter(k=>a[k]===b[k]).length/traitKeys.length;
}

export function hydrate(entry:CorpusLike,generated:(set:string)=>GeneratedImage[]):BusinessFacts{
 return {...entry.facts,imagery:{...entry.facts.imagery,generated:entry.facts.imagery.generatedAllowed?generated(entry.imageSet):[]}};
}

export function runFeedbackBenchmark(corpus:CorpusLike[],opts:{generated:(set:string)=>GeneratedImage[];
 cache?:EvaluationCache<Evaluation>;interpretations?:EvaluationCache<Interpretation>;budget?:Partial<RunBudget>}):BenchmarkReport{
 const t0=Date.now();
 const cache=opts.cache??memoryCache<Evaluation>();
 const icache=opts.interpretations??memoryCache<Interpretation>();
 let interpretationHits=0;
 const interpret=(e:FeedbackEvent)=>{
  const key=stableHash(['interp/3',e]);
  const hit=icache.get(key);if(hit){interpretationHits++;return hit;}
  const r=interpretFeedback(e);icache.set(key,r);return r;
 };
 const businesses=corpus.map(e=>{const facts=hydrate(e,opts.generated);const traits=deriveTraits(facts);
  return {entry:e,facts,traits,base:traitDefaults(traits,facts.id)};});
 const event=(b:typeof businesses[number],n:Note,i:number,kind:string):FeedbackEvent=>({id:`${b.facts.id}#${kind}${i}`,projectKey:b.facts.id,
  industry:b.facts.industry,rating:n.rating,notes:n.notes,tags:n.tags??null,reviewed:b.base,traits:b.traits,revisionId:null});

 // --- Learn from train feedback only.
 const train=businesses.filter(b=>b.entry.split==='train');
 const learnEvents:{b:typeof businesses[number];note:Note;event:FeedbackEvent;interp:Interpretation}[]=[];
 for(const b of train)for(const [i,n] of (b.entry.feedback??[]).entries()){
  const e=event(b,n,i,'learn');learnEvents.push({b,note:n,event:e,interp:interpret(e)});
 }
 const signals=learnEvents.flatMap(x=>x.interp.signals);
 const feedbackModel=buildPreferenceModel(signals);

 // --- Learn evaluation constraints from reverts on training businesses only.
 const constraintCache=memoryCache<Evaluation>();
 const constraints:Rule[]=[];
 for(const b of train){
  const r=runLoop({facts:b.facts,active:resolveRules(feedbackModel,{projectKey:b.facts.id,industry:b.facts.industry,traits:b.traits}),
   cache:constraintCache,mode:'rules',budget:opts.budget});
  for(const d of r.decisions.filter(d=>d.outcome==='reverted')){
   const c=constraintFromRevert({dimension:d.dimension,revised:d.revised,regressed:d.regressed,decisionId:d.id,projectKey:b.facts.id,industry:b.facts.industry},b.traits);
   if(c&&!constraints.some(x=>x.id===c.id))constraints.push(c);
  }
 }
 const model:PreferenceModel=buildPreferenceModel(signals,constraints);

 // --- Retrieval: each train business's own feedback applied to its base design.
 const reviewedDesigns=train.map(b=>({b,design:applyRules(resolveRules(buildPreferenceModel(
  learnEvents.filter(x=>x.b===b).flatMap(x=>x.interp.signals)),{projectKey:b.facts.id,industry:b.facts.industry,traits:b.traits}),b.base).candidate}));
 const nearest=(b:typeof businesses[number])=>reviewedDesigns.filter(r=>r.b!==b)
  .map(r=>({r,sim:traitSimilarity(r.b.traits,b.traits)+(r.b.facts.industry===b.facts.industry?.05:0)}))
  .sort((x,y)=>y.sim-x.sim||(x.r.b.facts.id<y.r.b.facts.id?-1:1))[0]?.r.design??null;

 // --- Run the arms.
 const results=new Map<Mode,Map<string,LoopResult>>();
 const ledgers=new Map<Mode,Ledger>();
 for(const mode of arms){
  const ledger=emptyLedger();const peers:DesignCandidate[]=[];const out=new Map<string,LoopResult>();
  for(const b of businesses){
   const active=resolveRules(model,{projectKey:b.facts.id,industry:b.facts.industry,traits:b.traits});
   const r=runLoop({facts:b.facts,active,cache,mode,ledger,peers,budget:opts.budget,start:mode==='retrieval'||mode==='hybrid'?nearest(b):null});
   peers.push(r.chosen.candidate);out.set(b.facts.id,r);
  }
  results.set(mode,out);ledgers.set(mode,ledger);
 }

 // --- Leave-one-out cross-validation on training businesses.
 const cvScores=new Map<Mode,number[]>();
 for(const b of train){
  const others=learnEvents.filter(x=>x.b!==b).flatMap(x=>x.interp.signals);
  const m=buildPreferenceModel(others);
  const active=resolveRules(m,{projectKey:b.facts.id,industry:b.facts.industry,traits:b.traits});
  const exp=(b.entry.feedback??[]).flatMap(n=>n.expect??[]);
  if(!exp.length)continue;
  for(const mode of arms){
   const r=runLoop({facts:b.facts,active,cache,mode,budget:opts.budget,start:mode==='retrieval'||mode==='hybrid'?nearest(b):null});
   for(const x of exp)(cvScores.get(mode)??cvScores.set(mode,[]).get(mode)!).push(satisfies(x,r.chosen.candidate,b.base)?1:0);
  }
 }
 const crossValidation=Object.fromEntries(arms.map(m=>[m,{agreement:mean(cvScores.get(m)??[]),expectations:(cvScores.get(m)??[]).length}]));

 // --- Interpreter accuracy against written expectations (dev and holdout).
 const interpreterReport=(split:'dev'|'holdout'):InterpreterReport=>{
  let notes=0,expected=0,predicted=0,matched=0;const byStyle:InterpreterReport['byStyle']={};const misses:string[]=[];
  for(const b of businesses)for(const [i,n] of ((split==='dev'?b.entry.devFeedback:b.entry.heldOutFeedback)??[]).entries()){
   notes++;
   const preds=[...new Set(interpret(event(b,n,i,split)).signals.filter(s=>s.op!=='keep').map(toExpectation))];
   const exp=n.expect??[];
   const hit=exp.filter(x=>preds.includes(x));
   expected+=exp.length;predicted+=preds.length;matched+=hit.length;
   const st=byStyle[n.style??'plain']??={expected:0,matched:0};st.expected+=exp.length;st.matched+=hit.length;
   for(const x of exp.filter(x=>!preds.includes(x)))misses.push(`${b.facts.id} [${n.style}]: expected ${x}`);
   for(const x of preds.filter(x=>!exp.includes(x)))misses.push(`${b.facts.id} [${n.style}]: extra ${x}`);
  }
  return {split,notes,expected,predicted,matched,precision:predicted?Math.round(matched/predicted*1000)/1000:0,
   recall:expected?Math.round(matched/expected*1000)/1000:0,byStyle,misses};
 };

 // --- Arm reports.
 const holdout=businesses.filter(b=>b.entry.split==='holdout');
 const armReports:ArmReport[]=arms.map(mode=>{
  const res=results.get(mode)!;const ledger=ledgers.get(mode)!;
  const agree:number[]=[];const byStyle:Record<string,number[]>={};const byIndustry:Record<string,number[]>={};
  for(const b of holdout)for(const n of b.entry.heldOutFeedback??[])for(const x of n.expect??[]){
   const ok=satisfies(x,res.get(b.facts.id)!.chosen.candidate,b.base)?1:0;
   agree.push(ok);(byStyle[n.style??'plain']??=[]).push(ok);(byIndustry[b.facts.industry]??=[]).push(ok);
  }
  const all=[...res.values()];const ds=all.flatMap(r=>r.decisions);
  const lookups=ledger.cacheHits+ledger.evaluations;
  return {mode,
   structural:{train:mean(train.map(b=>res.get(b.facts.id)!.chosen.evaluation.structural)),holdout:mean(holdout.map(b=>res.get(b.facts.id)!.chosen.evaluation.structural))},
   holdoutAgreement:mean(agree),
   agreementByStyle:Object.fromEntries(Object.entries(byStyle).map(([k,v])=>[k,mean(v)])),
   agreementByIndustry:Object.fromEntries(Object.entries(byIndustry).map(([k,v])=>[k,mean(v)])),
   changes:{accepted:ds.filter(d=>d.outcome==='accepted').length,reverted:ds.filter(d=>d.outcome==='reverted').length,
    rejectedBeforeRender:ds.filter(d=>d.outcome==='rejected').length},
   structuralFailures:all.reduce((n,r)=>n+r.chosen.gates.length,0),
   variety:pairwiseDistance(all.map(r=>r.chosen.candidate)),compositions:new Set(all.map(r=>r.chosen.candidate.composition)).size,
   cost:{...ledger,cacheHitRate:lookups?Math.round(ledger.cacheHits/lookups*1000)/1000:0,
    evaluationsAvoided:ledger.cacheHits+ledger.rejectedBeforeRender+ledger.skippedByBound},
  };
 });

 // --- Review records for the dataset (rules+search arm).
 const full=results.get('rules+search')!;
 const records:ReviewRecord[]=[];
 const makeRecord=(b:typeof businesses[number],n:Note,split:ReviewRecord['split'],e:FeedbackEvent,interp:Interpretation):ReviewRecord=>{
  const r=full.get(b.facts.id)!;
  const basePlan=composePage(b.facts,b.base);
  const perm=permittedBusinessImages(b.facts);
  const used=composePage(b.facts,r.chosen.candidate).sections.flatMap(s=>s.images).filter(i=>i.origin==='business').length;
  const relevant=new Set(interp.signals.map(s=>s.dimension));
  return {schema:DATASET_SCHEMA,recordId:stableHash([e.id,GENERATOR_VERSION]),generatorVersion:GENERATOR_VERSION,evaluatorVersion:EVALUATOR_VERSION,split,
   business:{id:b.facts.id,name:b.facts.name,industry:b.facts.industry,traits:b.traits,
    factCount:b.facts.offerings.length+(b.facts.team?.length??0)+(b.facts.process?.length??0)+(b.facts.proof?.length??0),sourced:true},
   rendered:{revisionId:r.base.evaluation.renderId,design:b.base,motion:basePlan.motion,structural:r.base.evaluation.structural},
   review:{rating:n.rating,style:n.style??'plain',text:n.notes,statements:interp.statements.map(s=>({...s,
    signals:interp.signals.filter(x=>x.statementIndex===s.index).map(x=>({dimension:x.dimension,op:x.op,value:x.value,prior:x.prior,scope:x.scope,strength:x.strength}))}))},
   adjustments:r.decisions.filter(d=>split!=='train'||relevant.has(d.dimension)||d.evidence.includes(e.id)).map(d=>({dimension:d.dimension,prior:d.prior,revised:d.revised,source:d.source,outcome:d.outcome,
    reason:d.reason,structuralBefore:d.structuralBefore,structuralAfter:d.structuralAfter,alignmentBefore:d.alignmentBefore,alignmentAfter:d.alignmentAfter,
    metricDeltas:d.metricDeltas,renderBefore:d.renderBefore,renderAfter:d.renderAfter})),
   alternatives:r.alternatives,
   final:{design:r.chosen.candidate,revisionId:r.chosen.evaluation.renderId,structural:r.chosen.evaluation.structural,humanRating:null},
   authorization:{generatedImagesAllowed:b.facts.imagery.generatedAllowed,businessImagesAuthorizedHost:b.facts.imagery.authorizedHost,
    businessImagesUsed:used,businessImagesWithheld:perm.rejected.length},
  };
 };
 for(const x of learnEvents)records.push(makeRecord(x.b,x.note,'train',x.event,x.interp));
 for(const b of businesses)for(const [i,n] of (b.entry.heldOutFeedback??[]).entries()){
  const e=event(b,n,i,'holdout');records.push(makeRecord(b,n,'holdout',e,interpret(e)));
 }

 const byScope:Record<string,number>={},bySource:Record<string,number>={};
 for(const r of model.rules){byScope[r.scope]=(byScope[r.scope]??0)+1;bySource[r.source]=(bySource[r.source]??0)+1;}
 const byKind:Record<string,number>={};
 for(const s of learnEvents.flatMap(x=>x.interp.statements))byKind[s.kind]=(byKind[s.kind]??0)+1;
 const trainIndustries=new Set(train.map(b=>b.facts.industry));
 const trainStyles=new Set(train.flatMap(b=>(b.entry.feedback??[]).map(n=>n.style??'plain')));
 const holdoutNotes=businesses.flatMap(b=>b.entry.heldOutFeedback??[]);
 return {
  generatorVersion:GENERATOR_VERSION,evaluatorVersion:EVALUATOR_VERSION,
  corpus:{businesses:businesses.length,industries:new Set(businesses.map(b=>b.facts.industry)).size,train:train.length,holdout:holdout.length,
   withheldIndustries:[...new Set(holdout.map(b=>b.facts.industry))].filter(i=>!trainIndustries.has(i)).sort(),
   withheldStyles:[...new Set(holdoutNotes.map(n=>n.style??'plain'))].filter(s=>!trainStyles.has(s)).sort(),
   learnNotes:learnEvents.length,devNotes:businesses.flatMap(b=>b.entry.devFeedback??[]).length,holdoutNotes:holdoutNotes.length,
   holdoutExpectations:holdoutNotes.reduce((n,x)=>n+(x.expect?.length??0),0)},
  model:{rules:model.rules.length,bySource,byScope,induced:model.rules.filter(r=>r.induced).length,
   examples:model.rules.filter(r=>r.scope==='trait'||r.scope==='global'||r.source==='evaluation').slice(0,12)
    .map(r=>`${r.source}/${r.scope}${r.when?` when ${Object.entries(r.when).map(([k,v])=>`${k}=${v}`).join('&')}`:''}: ${r.op} ${r.dimension}${r.value?'='+r.value:''} (w ${r.weight}, ${r.evidence.length} evidence)`),
   version:model.version},
  interpreter:{learn:{statements:learnEvents.reduce((n,x)=>n+x.interp.statements.length,0),byKind,
   unclear:learnEvents.flatMap(x=>x.interp.statements.filter(s=>s.kind==='unclear').map(s=>`${x.b.facts.id}: ${s.text}`))},
   dev:interpreterReport('dev'),holdout:interpreterReport('holdout'),cacheHits:interpretationHits},
  arms:armReports,crossValidation,records,elapsedMs:Date.now()-t0,
  designs:Object.fromEntries(businesses.map(b=>[b.facts.id,{split:b.entry.split,byArm:Object.fromEntries(arms.map(m=>{
   const r=results.get(m)!.get(b.facts.id)!;return [m,{design:r.chosen.candidate,renderId:r.chosen.evaluation.renderId,signature:r.chosen.evaluation.signature}];}))}])),
 };
}
