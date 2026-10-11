#!/usr/bin/env node
// Command Center local pilot: explicitly approved CRM URLs, Chrome + Lighthouse,
// serial execution, no Google PageSpeed API or Supabase credentials.
import {readFile,writeFile,mkdir,stat,unlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {parseApprovedManifest,preflightPublicWebsite} from './local-audit-guard.mjs';

const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const manifestPath=process.argv[2];
if(!manifestPath){
 console.error('Usage: npm run audit:local -- ~/Downloads/command-center-audit-queue.json');
 process.exitCode=2;
}else{
 try{await run(manifestPath);}catch(error){
  console.error('Stopped:',error instanceof Error?error.message:'Unknown error');
  process.exitCode=1;
 }
}
async function run(manifest){
 const jobs=parseApprovedManifest(await readFile(resolve(manifest),'utf8'));
 console.log('\nLOCAL COMMAND CENTER AUDIT QUEUE · '+jobs.length+' CRM site(s)');
 for(let i=0;i<jobs.length;i++)
  console.log('  '+(i+1)+'. '+jobs[i].name+' · '+jobs[i].url);
 console.log('\nThe runner uses open-source Lighthouse downloaded through npm on first run.');
 console.log('It audits each approved site once, one at a time, using local Chrome.');
 console.log('No PageSpeed API credit or Google Cloud account is used.');
 console.log('Websites are untrusted: use this only on your own Mac, not a public server.');
 const input=createInterface({input:stdin,output:stdout});
 let consent;
 try{consent=await input.question('\nType RUN to approve this exact queue (anything else cancels): ');}
 finally{input.close();}
 if(consent!=='RUN'){console.log('Cancelled, no websites scanned.');return;}
 const batchId=new Date().toISOString().replaceAll(/[:.]/g,'-');
 const folder=join(projectRoot,'.local-lighthouse',batchId);
 await mkdir(folder,{recursive:true});
 const results=[];
 let stopped=false;
 let child=null;
 process.once('SIGINT',()=>{
  stopped=true;
  console.log('\nStopping after current process. No additional businesses will be audited.');
  child?.kill('SIGTERM');
 });
 const record=async(row,status,message,report=null)=>{
  results.push({business_id:row.id,name:row.name,website_url:row.url,status,message,report});
  await writeFile(join(folder,'results.json'),JSON.stringify({
   kind:'command-center-local-audit-results/v1',
   created_at:new Date().toISOString(),results
  },null,2));
 };
 console.log('\nOutput directory:',folder);
 for(let i=0;i<jobs.length;i++){
  if(stopped)break;
  const row=jobs[i];
  console.log('\n['+(i+1)+'/'+jobs.length+'] '+row.name);
  try{
   await preflightPublicWebsite(row.url);
  }catch(e){
   const message=e instanceof Error?e.message:'URL preflight rejected the site';
   console.log('  SKIPPED (safety preflight): '+message);
   await record(row,'skipped',message);
   continue;
  }
  if(stopped)break;
  const output=join(folder,row.id+'.json');
  console.log('  Running mobile Lighthouse; this can take up to 2 minutes.');
  try{
   const code=await new Promise((done,reject)=>{
    child=spawn('npx',[
     '--yes','--package=lighthouse@13.0.0','lighthouse',row.url,
     '--only-categories=performance,seo','--form-factor=mobile',
     '--output=json','--output-path='+output,'--quiet',
     '--chrome-flags=--headless --disable-extensions --no-first-run'
    ],{cwd:projectRoot,stdio:['ignore','pipe','pipe'],env:process.env});
    const logs=[];
    for(const stream of [child.stdout,child.stderr])
     stream.on('data',data=>{
      if(logs.join('').length<1500)logs.push(String(data).slice(0,500));
     });
    const timer=setTimeout(()=>{
     child?.kill('SIGTERM');
     reject(Error('Lighthouse exceeded 120 seconds (inconclusive).'));
    },120_000);
    timer.unref();
    child.on('error',error=>{clearTimeout(timer);reject(error);});
    child.on('close',code=>{
     clearTimeout(timer);child=null;
     if(stopped)reject(Error('Stopped by operator.'));
     else if(code===0)done(code);
     else reject(Error('Lighthouse exited '+code+': '+logs.join('').slice(-600)));
    });
   });
   if(code!==0)throw Error('Lighthouse failed.');
   const file=await stat(output);
   let parsed;
   try{parsed=JSON.parse(await readFile(output,'utf8'));}catch{throw Error('Lighthouse did not return valid JSON.');}
   const errors=(parsed.runWarnings||[]).filter(x=>typeof x==='string');
   const performance=parsed.categories?.performance?.score;
   const hasScores=typeof performance==='number'&&
     typeof parsed.categories?.seo?.score==='number';
   const status=parsed.runtimeError||errors.length||!hasScores?'inconclusive':'measured';
   const message=status==='inconclusive'?
     'The report has warnings or missing measurements. Command Center will keep it inconclusive.':
     'Lighthouse produced lab measurements. Verify before using any findings commercially.';
   if(file.size>8_000_000){
    await record(row,'oversized','Raw Lighthouse JSON exceeds the 8 MB Command Center uploader limit.',output);
    console.log('  Oversized report saved locally; do not attempt upload.');
   }else{
    await record(row,status,message,output);
    console.log('  '+status.toUpperCase()+' · '+(typeof performance==='number'?Math.round(performance*100)+'/100':'no score'));
    console.log('  JSON for CRM import: '+output);
   }
  }catch(e){
   const message=e instanceof Error?e.message:'Unknown Chrome failure';
   console.log('  INCONCLUSIVE: '+message);
   await record(row,'inconclusive',message);
   try{await unlink(output);}catch{}
  }
  if(!stopped&&i<jobs.length-1)
   await new Promise(done=>setTimeout(done,4000));
 }
 console.log('\nFinished '+results.length+'/'+jobs.length+' approved entries.');
 console.log('Results: '+join(folder,'results.json'));
 console.log('To save evidence, open Command Center → Website Intelligence.');
 console.log('Select the matching business and import its JSON report.');
 console.log('A failed preflight or Chrome error is NOT proof that a business website is bad.');
}
