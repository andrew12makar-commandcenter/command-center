#!/usr/bin/env node
// Explicitly approved, single-site, local content research.
// Produces private candidate references, NOT licensed images or verified copy.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {parseApprovedManifest,preflightPublicWebsite} from './local-audit-guard.mjs';
import {extractCandidates,robotsAllows} from './site-candidates.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const file=process.argv[2];
if(!file){
 console.error('Usage: npm run research:local -- ~/Downloads/command-center-audit-queue.json');
 process.exitCode=2;
}else try{await run(file);}catch(e){
 console.error('Site research stopped:',e instanceof Error?e.message:String(e));
 process.exitCode=1;
}
async function textResponse(response,maxBytes){
 const length=Number(response.headers.get('content-length')||0);
 if(length>maxBytes)throw Error('Page exceeds the research size limit.');
 let total=0;
 const chunks=[];
 if(!response.body)throw Error('No readable response body.');
 for await(const chunk of response.body){
  total+=chunk.byteLength;
  if(total>maxBytes){await response.body.cancel().catch(()=>{});throw Error('Page exceeds the research size limit.');}
  chunks.push(Buffer.from(chunk));
 }
 return Buffer.concat(chunks).toString('utf8');
}
async function run(manifestPath){
 const jobs=parseApprovedManifest(await readFile(resolve(manifestPath),'utf8'));
 if(jobs.length!==1)throw Error('For research, approve exactly ONE business at a time.');
 const row=jobs[0];
 console.log('Private research candidate collection for: '+row.name+'\n'+row.url);
 console.log('Up to five same-host HTML pages. Reads text and image references only. DOES NOT copy image bytes or approve usage rights.');
 const input=createInterface({input:stdin,output:stdout});
 let consent;
 try{consent=await input.question('Type RESEARCH to approve these public pages: ');}
 finally{input.close();}
 if(consent!=='RESEARCH'){console.log('Cancelled.');return;}
 const homepage=await preflightPublicWebsite(row.url);
 const rootHost=new URL(homepage).hostname;
 let robots='';
 try{
  const robotUrl=new URL('/robots.txt',homepage).href;
  const response=await fetch(robotUrl,{signal:AbortSignal.timeout(9000),redirect:'manual'});
  if(response.ok)robots=await textResponse(response,100_000);
 }catch{console.log('robots.txt unavailable; proceed conservatively with explicitly approved public pages only.');}
 const todo=[homepage],visited=new Set(),pages=[],errors=[];
 while(todo.length&&pages.length<5&&visited.size<12){
  const candidate=todo.shift();
  if(!candidate||visited.has(candidate))continue;
  visited.add(candidate);
  const parsed=new URL(candidate);
  if(parsed.hostname!==rootHost||!robotsAllows(robots,parsed.pathname)){
   errors.push({url:candidate,reason:'Different host or robots.txt disallowed this path.'});
   continue;
  }
  console.log('Inspecting public HTML: '+candidate);
  try{
   const checked=await preflightPublicWebsite(candidate);
   if(new URL(checked).hostname!==rootHost)throw Error('Moved to another domain.');
   const response=await fetch(checked,{
    redirect:'manual',signal:AbortSignal.timeout(15000),
    headers:{'Accept':'text/html','User-Agent':'CommandCenterContentResearch/1.0 (local manual pilot)'}
   });
   if(!response.ok||response.status>=300)throw Error('HTTP '+response.status);
   const type=response.headers.get('content-type')||'';
   if(!/text\/html/i.test(type))throw Error('Not an HTML page: '+type);
   const html=await textResponse(response,1_500_000);
   const candidates=extractCandidates(html,checked);
   pages.push({...candidates,images:candidates.images.slice(0,30)});
   for(const link of candidates.links.slice(0,10))
    if(!visited.has(link)&&!todo.includes(link)&&todo.length<15)todo.push(link);
  }catch(e){errors.push({url:candidate,reason:e instanceof Error?e.message:'Could not inspect this page'});}
  if(todo.length&&pages.length<5)await new Promise(done=>setTimeout(done,1200));
 }
 const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-');
 const dir=join(root,'.local-lighthouse','site-research');
 await mkdir(dir,{recursive:true});
 const path=join(dir,row.id+'-'+stamp+'.json');
 const result={
  kind:'command-center-site-research/v1',
  generated_at:new Date().toISOString(),
  business_id:row.id,
  business_name:row.name,
  website_url:row.url,
  pages,errors,
  legal_note:'These are unverified research candidates. Images are references only; no rights to display or publish have been inferred.'
 };
 await writeFile(path,JSON.stringify(result,null,2));
 console.log('\nSaved local research candidates: '+path);
 console.log('Pages inspected: '+pages.length+', image references: '+pages.reduce((n,p)=>n+p.images.length,0));
 console.log('Import into the matching private Demo Studio draft; review all content and rights before displaying.');
}
