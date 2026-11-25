#!/usr/bin/env node
// Browser QA for generated customer websites.
//
// 1. Exports every benchmark blueprint through the SAME export gate and
//    customer renderer used for real client projects (one Next.js harness).
// 2. Builds and serves that harness locally (production build).
// 3. Drives Chromium at desktop, tablet and mobile widths, saving screenshots
//    and technical findings (overflow, clipping, overlap, images, links,
//    console errors, axe accessibility, reduced motion, animation reveal).
// 4. Optionally runs the already-installed Lighthouse against the harness.
//
// It reports TECHNICAL rendering quality only. Visual design quality is a
// separate human review (docs/VISUAL_REVIEW_RUBRIC.md) and is never scored here.
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {chromium} from '@playwright/test';
import AxeBuilderModule from '@axe-core/playwright';
import {buildBenchmark,generatorBenchmarks} from '../../lib/generator-benchmarks.ts';
import {exportReviewHarness} from '../export-client-site.mjs';
import {layoutAudit,foldAudit,revealAudit,reducedMotionAudit,structureSignature,thumbnail} from './page-audits.mjs';
import {assessViewport,summarize,repetitionFindings} from './assess.mjs';
import {writeReports} from './report.mjs';

const AxeBuilder=AxeBuilderModule.default??AxeBuilderModule.AxeBuilder??AxeBuilderModule;
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..','..');
export const viewports=[
 {name:'desktop',width:1440,height:900,mobile:false},
 {name:'tablet',width:834,height:1112,mobile:false},
 {name:'mobile',width:390,height:844,mobile:true}
];

function args(argv){
 const o={sites:null,out:null,lighthouse:false,keep:false,failOn:'blocking',port:4317};
 for(let i=0;i<argv.length;i++){
  const a=argv[i];
  if(a==='--sites')o.sites=argv[++i].split(',');
  else if(a==='--out')o.out=argv[++i];
  else if(a==='--lighthouse')o.lighthouse=true;
  else if(a==='--keep-harness')o.keep=true;
  else if(a==='--fail-on')o.failOn=argv[++i];
  else if(a==='--port')o.port=Number(argv[++i]);
  else throw Error('Unknown option '+a);
 }
 if(!['blocking','never'].includes(o.failOn))throw Error('--fail-on must be blocking or never');
 return o;
}

function run(exe,argv,cwd){
 const r=spawnSync(exe,argv,{cwd,stdio:'inherit',timeout:420_000,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',CI:'1'}});
 if(r.error)throw r.error;
 if(r.status!==0)throw Error(`${exe} ${argv.join(' ')} exited ${r.status}`);
}

async function waitForServer(url,child){
 for(let i=0;i<120;i++){
  if(child.exitCode!==null)throw Error('Harness server exited early.');
  try{const r=await fetch(url);if(r.ok)return;}catch{}
  await new Promise(d=>setTimeout(d,500));
 }
 throw Error('Harness server did not start within 60 seconds.');
}

function launchOptions(extra=[]){
 // CI uses Playwright's own Chromium. QA_CHROMIUM_PATH lets a restricted
 // sandbox point at an already-available Chromium build instead.
 const executablePath=process.env.QA_CHROMIUM_PATH||undefined;
 const sandboxArgs=executablePath?['--no-sandbox','--disable-gpu','--no-zygote']:[];
 return {executablePath,args:[...sandboxArgs,...extra]};
}

async function collect(page){
 const logs={errors:[],pageErrors:[],failedRequests:[]};
 const origin=new URL(page.url()||'http://localhost').origin;
 page.on('console',m=>{if(m.type()==='error')logs.errors.push(m.text().slice(0,300));});
 page.on('pageerror',e=>logs.pageErrors.push(String(e.message||e).slice(0,300)));
 page.on('requestfailed',r=>{if(!r.url().startsWith('data:'))logs.failedRequests.push(`${r.url()} (${r.failure()?.errorText})`);});
 page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(origin))logs.failedRequests.push(`${r.url()} → HTTP ${r.status()}`);});
 return logs;
}

async function auditViewport(browser,base,site,vp,dir){
 const url=`${base}/${site.id}`;
 const shots={};
 // Pass 1: motion enabled, as a first-time visitor sees it.
 const motionCtx=await browser.newContext({viewport:{width:vp.width,height:vp.height},isMobile:vp.mobile,hasTouch:vp.mobile,reducedMotion:'no-preference'});
 const page=await motionCtx.newPage();
 const logs=await collect(page);
 await page.goto(url,{waitUntil:'networkidle'});
 await page.waitForTimeout(1600);
 const fold=await page.evaluate(foldAudit);
 shots.fold=join(dir,`${site.id}-${vp.name}-first-screen.png`);
 const foldPng=await page.screenshot({path:shots.fold});
 const sectionIds=await page.$$eval('section[id]',s=>s.map(x=>x.id));
 const reveal=[];
 for(const id of sectionIds){
  await page.$eval('#'+id,el=>el.scrollIntoView({block:'start'}));
  await page.waitForTimeout(900);
  const r=await page.evaluate(revealAudit,id);
  if(r)reveal.push({section:id,...r});
 }
 // Click every visible header navigation link (opening the small-screen menu
 // first when that is how navigation is offered) and confirm it scrolls.
 const nav=[];
 const links=await page.$$eval('header nav a[href^="#"]',a=>a.map(x=>({text:x.textContent.trim(),href:x.getAttribute('href')})));
 const seen=new Set();
 for(const link of links){
  if(seen.has(link.href))continue;seen.add(link.href);
  await page.evaluate(()=>{scrollTo(0,0);document.querySelectorAll('header details[open]').forEach(d=>d.removeAttribute('open'));});
  await page.waitForTimeout(250);
  let target=page.locator(`header nav a[href="${link.href}"]`).filter({visible:true}).first();
  if(!(await target.count())){
   const toggle=page.locator('header details > summary').filter({visible:true}).first();
   if(!(await toggle.count()))continue;
   await toggle.click();await page.waitForTimeout(200);
   target=page.locator(`header nav a[href="${link.href}"]`).filter({visible:true}).first();
   if(!(await target.count())){nav.push({...link,reached:false});continue;}
  }
  await target.click();
  await page.waitForTimeout(700);
  const reached=await page.$eval(link.href,el=>{const r=el.getBoundingClientRect();return r.top<innerHeight*0.6&&r.bottom>0;}).catch(()=>false);
  nav.push({...link,reached});
 }
 const thumb=vp.name==='desktop'?await page.evaluate(thumbnail,'data:image/png;base64,'+foldPng.toString('base64')):null;
 await motionCtx.close();

 // Pass 2: reduced motion. Content must be complete and static; this is also
 // the settled state used for layout geometry, axe and the full-page capture.
 const ctx=await browser.newContext({viewport:{width:vp.width,height:vp.height},isMobile:vp.mobile,hasTouch:vp.mobile,reducedMotion:'reduce'});
 const rp=await ctx.newPage();
 const rlogs=await collect(rp);
 await rp.goto(url,{waitUntil:'networkidle'});
 await rp.waitForTimeout(300);
 const reduced=await rp.evaluate(reducedMotionAudit);
 const layout=await rp.evaluate(layoutAudit);
 const signature=await rp.evaluate(structureSignature);
 shots.full=join(dir,`${site.id}-${vp.name}-full.png`);
 await rp.screenshot({path:shots.full,fullPage:true});
 const axeResult=await new AxeBuilder({page:rp}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
 const axe=axeResult.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.length,targets:v.nodes.slice(0,3).map(n=>n.target.join(' '))}));
 await ctx.close();

 const merged={errors:[...logs.errors,...rlogs.errors],pageErrors:[...logs.pageErrors,...rlogs.pageErrors],failedRequests:[...new Set([...logs.failedRequests,...rlogs.failedRequests])]};
 const findings=assessViewport({layout,fold,reveal,reduced,console:merged,axe,viewport:vp,nav});
 return {viewport:vp.name,width:vp.width,height:vp.height,screenshots:shots,fold,reduced,signature,thumbnail:thumb,
  documentHeight:layout.documentHeight,sections:layout.sections,links:layout.links.filter(l=>l.visible).map(({text,href})=>({text,href})),
  findings,summary:summarize(findings)};
}

async function lighthouseRun(base,id){
 const {default:lighthouse}=await import('lighthouse');
 const port=9300+Math.floor(Math.random()*500);
 const browser=await chromium.launch(launchOptions([`--remote-debugging-port=${port}`]));
 try{
  const result=await lighthouse(`${base}/${id}`,{port,output:'json',logLevel:'error',formFactor:'mobile',
   onlyCategories:['performance','accessibility','best-practices','seo']});
  const lhr=result?.lhr;
  if(!lhr||lhr.runtimeError)return {status:'inconclusive',reason:lhr?.runtimeError?.message||'No report'};
  const score=k=>typeof lhr.categories[k]?.score==='number'?Math.round(lhr.categories[k].score*100):null;
  const metric=k=>lhr.audits[k]?.displayValue||null;
  return {status:'measured',measuredAt:lhr.fetchTime,environment:'local production build on localhost (lab, mobile emulation)',
   scores:{performance:score('performance'),accessibility:score('accessibility'),bestPractices:score('best-practices'),seo:score('seo')},
   metrics:{lcp:metric('largest-contentful-paint'),cls:metric('cumulative-layout-shift'),tbt:metric('total-blocking-time')}};
 }catch(e){return {status:'inconclusive',reason:String(e?.message||e).slice(0,300)};}
 finally{await browser.close();}
}

export async function main(argv=process.argv.slice(2)){
 const opt=args(argv);
 const cases=generatorBenchmarks.filter(c=>!opt.sites||opt.sites.includes(c.id));
 if(!cases.length)throw Error('No matching benchmark sites.');
 const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-');
 const outDir=resolve(opt.out||join(root,'artifacts','browser-qa',stamp));
 const shotDir=join(outDir,'screenshots');
 await mkdir(shotDir,{recursive:true});

 const work=await mkdtemp(join(tmpdir(),'command-center-browser-qa-'));
 const harness=join(work,'harness');
 let server=null,browser=null;
 try{
  console.log(`Exporting ${cases.length} benchmark site(s) through the client export gate...`);
  await exportReviewHarness(cases.map(c=>({id:c.id,raw:{exportType:'command-center-private-site-blueprint/v1',blueprint:buildBenchmark(c)}})),harness);
  const npm=process.platform==='win32'?'npm.cmd':'npm';
  run(npm,['install','--no-audit','--no-fund','--prefer-offline'],harness);
  run(npm,['run','build'],harness);
  const base=`http://127.0.0.1:${opt.port}`;
  server=spawn(join(harness,'node_modules','.bin','next'),['start','-p',String(opt.port),'-H','127.0.0.1'],{cwd:harness,stdio:'ignore',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}});
  await waitForServer(base+'/',server);

  browser=await chromium.launch(launchOptions());
  const sites=[];
  for(const c of cases){
   const result={id:c.id,name:c.name,category:c.category,vertical:c.vertical,holdout:c.holdout,viewports:[]};
   for(const vp of viewports){
    process.stdout.write(`  ${c.id} · ${vp.name}... `);
    const v=await auditViewport(browser,base,c,vp,shotDir);
    result.viewports.push(v);
    console.log(`${v.summary.blocking} blocking, ${v.summary.warning} warning`);
   }
   if(opt.lighthouse){process.stdout.write(`  ${c.id} · lighthouse... `);result.lighthouse=await lighthouseRun(base,c.id);console.log(result.lighthouse.status);}
   sites.push(result);
  }
  const desktop=sites.map(s=>{const d=s.viewports.find(v=>v.viewport==='desktop');return {id:s.id,signature:d.signature,thumbnail:d.thumbnail};});
  const repetition=repetitionFindings(desktop);
  for(const s of sites)for(const v of s.viewports){delete v.thumbnail;for(const k of Object.keys(v.screenshots))v.screenshots[k]=relative(outDir,v.screenshots[k]);}
  const totals={blocking:sites.reduce((n,s)=>n+s.viewports.reduce((m,v)=>m+v.summary.blocking,0),0),
   warning:sites.reduce((n,s)=>n+s.viewports.reduce((m,v)=>m+v.summary.warning,0),0)};
  const report={kind:'command-center-browser-qa/v1',createdAt:new Date().toISOString(),
   scope:'Technical rendering assessment of generated customer sites. Design quality requires human review and is NOT scored.',
   browser:browser.version(),viewports,totals,repetition,sites,
   humanVisualReview:{status:'not_recorded',rubric:'docs/VISUAL_REVIEW_RUBRIC.md'}};
  await writeReports(outDir,report);
  console.log(`\n${totals.blocking} blocking and ${totals.warning} warning finding(s) across ${sites.length} site(s).`);
  console.log('Report: '+join(outDir,'report.md'));
  return {report,outDir,failed:opt.failOn==='blocking'&&totals.blocking>0};
 }finally{
  await browser?.close();
  server?.kill('SIGTERM');
  if(!opt.keep)await rm(work,{recursive:true,force:true});
  else console.log('Harness kept at '+harness);
 }
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().then(r=>{if(r.failed){console.error('Browser QA found blocking technical defects.');process.exitCode=1;}})
  .catch(e=>{console.error('Browser QA could not run: '+(e instanceof Error?e.stack:String(e)));process.exitCode=2;});
}
