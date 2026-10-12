// Local, authenticated development-only Lighthouse execution support.
// This module has no HTTP route and must be called only after workspace authorization.
import {mkdtemp,readFile,stat,rm,access} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {preflightPublicWebsite} from './local-audit-guard.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const lighthouseBin=join(root,'node_modules','.bin',process.platform==='win32'?'lighthouse.cmd':'lighthouse');
const MAX_REPORT_BYTES=8_000_000;
const MAX_AUDIT_MS=120_000;
let inProgress=false;

export function localLighthouseArgs(url,path){
 return [
  url,'--only-categories=performance,seo','--form-factor=mobile',
  '--output=json','--output-path='+path,'--quiet',
  '--no-enable-error-reporting',
  '--chrome-flags=--headless --disable-extensions --no-first-run'
 ];
}

export function localLighthouseBusy(){return inProgress;}

/**
 * Runs one explicitly requested local Chrome audit, without a Google API key.
 * The caller is responsible for authentication, CRM scoping and persistence.
 * Public-domain/DNS/redirect safety checks must pass before starting Chrome.
 * The scanned website is untrusted: never enable this on a public deployment.
 */
export async function runOneLocalLighthouse(website){
 if(process.env.NODE_ENV!=='development')
  throw Error('Direct local Chrome audits require the Mac development server.');
 if(inProgress)throw Error('Another local Lighthouse audit is still running.');
 inProgress=true;
 let folder=null;
 try{
  const approved=await preflightPublicWebsite(website);
  try{await access(lighthouseBin);}catch{
   throw Error('Local Lighthouse is not installed. In the integration-preview folder run npm install.');
  }
  folder=await mkdtemp(join(tmpdir(),'command-center-lh-'));
  const output=join(folder,'report.json');
  await new Promise((done,reject)=>{
   const child=spawn(lighthouseBin,localLighthouseArgs(approved,output),{
    cwd:root,env:process.env,stdio:['ignore','ignore','pipe']
   });
   let settled=false,stderr='';
   const timer=setTimeout(()=>{
    child.kill('SIGTERM');
    finish(Error('Local Chrome audit exceeded two minutes. Try another time.'));
   },MAX_AUDIT_MS);
   timer.unref();
   function finish(err){
    if(settled)return;
    settled=true;
    clearTimeout(timer);
    if(err)reject(err);else done();
   }
   child.stderr.on('data',data=>{stderr=(stderr+String(data)).slice(-1000);});
   child.on('error',error=>finish(Error('Cannot start local Lighthouse/Chrome: '+error.message)));
   child.on('close',code=>finish(code===0?null:Error('Local Lighthouse exited with code '+code+'. '+stderr.slice(-260))));
  });
  const info=await stat(output);
  if(info.size<100||info.size>MAX_REPORT_BYTES)
   throw Error('Local Lighthouse report was missing, empty or larger than the 8 MB evidence limit.');
  return await readFile(output,'utf8');
 }finally{
  if(folder)await rm(folder,{force:true,recursive:true}).catch(()=>{});
  inProgress=false;
 }
}
