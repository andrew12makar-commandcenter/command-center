// Cross-industry feedback-loop experiment.
//   node --experimental-strip-types scripts/run-feedback-loop.ts [--browser N] [--screenshots] [--fresh] [--out DIR]
//
// Local and deterministic: no crawling, no model calls, no image generation,
// no paid API. Evaluations, interpretations and browser checks are cached by
// stable hash under <out>/, so a rerun with unchanged inputs repeats no work.
// `--browser N` loads up to N chosen pages in local Chromium (if Playwright is
// installed) to check overflow, tap targets and reduced motion; cached by the
// page's HTML hash. `--screenshots` also saves desktop and mobile captures,
// skipped when a capture for that exact HTML already exists.
//
// Outputs: report.json, dataset.jsonl (redacted review records),
// gallery.json (rows for the benchmark gallery), signatures.json (for
// run-to-run visual-regression comparison).
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {corpus} from '../benchmarks/fictional-businesses.ts';
import {runFeedbackBenchmark,hydrate} from '../lib/generator-loop/benchmark.ts';
import {composePage} from '../lib/generator-loop/compose.ts';
import {renderPlanHtml} from '../lib/generator-loop/render.ts';
import {evaluatePlan,signatureDiff,type Evaluation} from '../lib/generator-loop/evaluate.ts';
import {auditExportLine,exportDataset} from '../lib/generator-loop/dataset.ts';
import {galleryRow} from '../lib/generator-loop/integration.ts';
import {memoryCache,stableHash} from '../lib/generator-loop/stable-hash.ts';
import type {Interpretation} from '../lib/generator-loop/feedback-interpreter.ts';
import type {GeneratedImage} from '../lib/generator-loop/design-space.ts';
import * as imagery from '../lib/concept-imagery.ts';

const arg=(name:string)=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1]??'';};
const out=arg('--out')||'.local-lighthouse/feedback-loop';
const browserBudget=Math.max(0,Math.min(60,Number(arg('--browser')??0)||0));
const screenshots=process.argv.includes('--screenshots');
const fresh=process.argv.includes('--fresh');
// Arm used for the browser pass, gallery and regression signatures: the best
// arm by training cross-validation (never chosen by holdout results).
const reportArm='rules+search';
mkdirSync(out,{recursive:true});

// Bundled first-party generated concept images. Nothing is generated here.
type Concept={src:string;alt:string;disclosure:string};
const lib=imagery as unknown as {getGeneratedConceptSet?:(t:string)=>Record<string,Concept>;getPrivatePreviewConcept:(t:string)=>Concept};
const generated=(set:string):GeneratedImage[]=>{
 const all=lib.getGeneratedConceptSet?Object.values(lib.getGeneratedConceptSet(set)):[lib.getPrivatePreviewConcept(set)];
 return all.map(x=>({src:x.src,alt:x.alt,disclosure:x.disclosure}));
};
const load=<T>(name:string):Record<string,T>=>{const f=join(out,name);return !fresh&&existsSync(f)?JSON.parse(readFileSync(f,'utf8')):{};};

const cache=memoryCache<Evaluation>(load<Evaluation>('cache.json'));
const interpretations=memoryCache<Interpretation>(load<Interpretation>('interpretations.json'));
const seeded={evaluations:cache.size,interpretations:interpretations.size};
const report=runFeedbackBenchmark(corpus,{generated,cache,interpretations});
writeFileSync(join(out,'cache.json'),JSON.stringify(cache.entries()));
writeFileSync(join(out,'interpretations.json'),JSON.stringify(interpretations.entries()));

// --- Optional browser pass over the chosen pages of the reported arm.
type BrowserCheck={id:string;overflowDesktop:boolean;overflowMobile:boolean;smallTargets:number;reducedMotionStatic:boolean;screenshot:string|null};
const browser={requested:browserBudget,ran:0,cached:0,skipped:browserBudget?null as string|null:'not requested',results:[] as BrowserCheck[]};
const pages=report.records.length?Object.entries(report.designs).map(([id,d])=>{
 const entry=corpus.find(c=>c.facts.id===id)!;const facts=hydrate(entry,generated);
 return {id,facts,split:d.split,html:renderPlanHtml(composePage(facts,d.byArm[reportArm].design),facts.name),design:d.byArm[reportArm].design};
}):[];
if(browserBudget){
 const bcache=load<BrowserCheck>('browser-cache.json');
 type Route={request():{url():string};continue():Promise<void>;abort():Promise<void>;fulfill(o:{path:string}):Promise<void>};
 type Page={route(p:string,h:(r:Route)=>unknown):Promise<void>;setContent(h:string,o:object):Promise<void>;
  evaluate<T>(f:()=>T):Promise<T>;screenshot(o:object):Promise<unknown>;close():Promise<void>};
 type Browser={newPage(o:object):Promise<Page>;close():Promise<void>};
 let chromium:{launch(o:object):Promise<Browser>}|null=null;
 // Playwright is optional and not a project dependency.
 const specifier='playwright';
 try{({chromium}=await import(specifier));}catch{browser.skipped='playwright is not installed';}
 if(chromium){
  let b:Browser|null=null;
  for(const p of pages){
   const key=stableHash(['browser/2',p.html,screenshots]);
   if(bcache[key]&&(!bcache[key].screenshot||existsSync(bcache[key].screenshot!))){browser.cached++;browser.results.push({...bcache[key],id:p.id});continue;}
   if(browser.ran>=browserBudget){browser.skipped=`budget of ${browserBudget} browser renders reached`;break;}
   b??=await chromium.launch({headless:true});
   browser.ran++;
   const check:BrowserCheck={id:p.id,overflowDesktop:false,overflowMobile:false,smallTargets:0,reducedMotionStatic:false,screenshot:null};
   for(const [w,h,field] of [[1440,900,'overflowDesktop'],[390,844,'overflowMobile']] as const){
    const page=await b.newPage({viewport:{width:w,height:h},reducedMotion:field==='overflowMobile'?'reduce':'no-preference'});
    // Bundled generated concepts load from public/; every other request is blocked.
    await page.route('**/*',route=>{
     const url=route.request().url();
     const m=url.match(/\/concepts\/([a-z0-9-]+\.jpg)$/);
     if(m&&existsSync(join('public','concepts',m[1])))return route.fulfill({path:join('public','concepts',m[1])});
     return url.startsWith('data:')?route.continue():route.abort();
    });
    await page.setContent(p.html.replace('<head>','<head><base href="http://local.test/">'),{waitUntil:'load'});
    check[field]=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
    if(field==='overflowMobile'){
     check.smallTargets=await page.evaluate(()=>[...document.querySelectorAll('a,button')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.height<44&&!e.classList.contains('skip');}).length);
     check.reducedMotionStatic=await page.evaluate(()=>[...document.querySelectorAll('[data-reveal]')].every(e=>getComputedStyle(e).transitionDuration.split(',').every(d=>parseFloat(d)===0)));
    }
    if(screenshots){
     mkdirSync(join(out,'shots'),{recursive:true});
     const file=join(out,'shots',`${p.id}-${w}.png`);
     await page.screenshot({path:file,fullPage:true});
     check.screenshot=file;
    }
    await page.close();
   }
   bcache[key]=check;browser.results.push(check);
  }
  await b?.close();
  writeFileSync(join(out,'browser-cache.json'),JSON.stringify(bcache));
 }
}

// --- Run-to-run visual regression: compare signatures with the last run.
const lastFile=join(out,'signatures.json');
const last=existsSync(lastFile)?JSON.parse(readFileSync(lastFile,'utf8')) as Record<string,string[]>:{};
const now=Object.fromEntries(Object.entries(report.designs).map(([id,d])=>[id,d.byArm[reportArm].signature]));
const changed=Object.keys(now).filter(id=>last[id]&&JSON.stringify(last[id])!==JSON.stringify(now[id]))
 .map(id=>({id,...signatureDiff(last[id],now[id])}));
writeFileSync(lastFile,JSON.stringify(now));

// --- Dataset export (redacted) and gallery rows.
const people=Object.fromEntries(corpus.map(c=>[c.facts.id,(c.facts.team??[]).map(t=>t.name)]));
const jsonl=exportDataset(report.records,people);
const forbidden=corpus.flatMap(c=>[c.facts.phone??'',c.facts.email??'',c.facts.address??'',...(c.facts.team??[]).map(t=>t.name)]);
const datasetProblems=jsonl.trim().split('\n').flatMap((l,i)=>auditExportLine(l,forbidden).map(p=>`line ${i+1}: ${p}`));
writeFileSync(join(out,'dataset.jsonl'),jsonl);
writeFileSync(join(out,'gallery.json'),JSON.stringify(pages.map(p=>{
 const ev=evaluatePlan(p.facts,composePage(p.facts,p.design),p.html);
 return galleryRow(p.facts,p.split,{candidate:p.design,evaluation:ev,alignment:0});
}),null,1));

const {records,designs:_designs,...summary}=report;
void _designs;
writeFileSync(join(out,'report.json'),JSON.stringify({...summary,browser,visualRegression:{comparedTo:Object.keys(last).length,changed},
 dataset:{records:records.length,problems:datasetProblems},cacheSeeded:seeded},null,1));

console.table(summary.arms.map(a=>({arm:a.mode,'holdout agreement':a.holdoutAgreement,'train CV':summary.crossValidation[a.mode].agreement,
 'structural train':a.structural.train,'structural holdout':a.structural.holdout,accepted:a.changes.accepted,reverted:a.changes.reverted,
 'rejected pre-render':a.cost.rejectedBeforeRender,failures:a.structuralFailures,variety:a.variety,evaluations:a.cost.evaluations,
 'cache hit':a.cost.cacheHitRate,avoided:a.cost.evaluationsAvoided,ms:a.cost.elapsedMs})));
console.log(JSON.stringify({corpus:summary.corpus,model:summary.model,interpreter:{learn:summary.interpreter.learn.byKind,
 dev:{precision:summary.interpreter.dev.precision,recall:summary.interpreter.dev.recall},
 holdout:{precision:summary.interpreter.holdout.precision,recall:summary.interpreter.holdout.recall,byStyle:summary.interpreter.holdout.byStyle}},
 agreementByStyle:Object.fromEntries(summary.arms.map(a=>[a.mode,a.agreementByStyle])),
 browser:{ran:browser.ran,cached:browser.cached,skipped:browser.skipped,overflow:browser.results.filter(r=>r.overflowMobile||r.overflowDesktop).map(r=>r.id),
  smallTargets:browser.results.reduce((n,r)=>n+r.smallTargets,0),reducedMotionFailures:browser.results.filter(r=>!r.reducedMotionStatic).map(r=>r.id)},
 visualRegression:{changed:changed.length},dataset:{records:records.length,problems:datasetProblems.length},
 usage:{modelCalls:summary.arms.reduce((n,a)=>n+a.cost.modelCalls,0),imageGenerations:summary.arms.reduce((n,a)=>n+a.cost.imageGenerations,0),
  crawls:summary.arms.reduce((n,a)=>n+a.cost.crawls,0),browserRenders:browser.ran,paidApiCalls:0},
 cacheSeeded:seeded,elapsedMs:summary.elapsedMs},null,1));
console.log(`outputs: ${out}/report.json dataset.jsonl gallery.json`);

const failures=[
 ...summary.arms.filter(a=>a.structuralFailures>0).map(a=>`${a.mode}: ${a.structuralFailures} structural gate failure(s)`),
 ...summary.arms.filter(a=>a.cost.modelCalls||a.cost.crawls||a.cost.imageGenerations).map(a=>`${a.mode}: paid or network work in a local run`),
 ...browser.results.filter(r=>r.overflowMobile||r.overflowDesktop||!r.reducedMotionStatic).map(r=>`${r.id}: browser check failed`),
 ...datasetProblems,
];
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
