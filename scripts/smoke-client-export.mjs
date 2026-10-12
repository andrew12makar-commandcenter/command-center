#!/usr/bin/env node
// Cold-install and production-build an isolated client site exported from the
// same code customers would receive. No CRM, Supabase, or private credentials.
import {mkdtemp,stat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {exportProject} from './export-client-site.mjs';

const approvedSample={
 exportType:'command-center-private-site-blueprint/v1',
 blueprint:{
  version:1,
  template:'medical',
  businessName:'Sample Brighton Practice',
  eyebrow:'BRIGHTON, MASSACHUSETTS',
  headline:'A clearer path to your next appointment.',
  description:'This is sample copy for a local production-build test.',
  primaryAction:'Request an appointment',
  secondaryAction:'Explore services',
  services:['Consultations','Preventive care'],
  contact:{phone:'617-555-0100',email:'office@example.org',city:'Brighton'},
  content:{
   about:'Sample approved content for a reproducible smoke test.',
   audience:'',
   appointmentUrl:'https://example.org/book',
   sourceUrl:'https://example.org/about',
   factStatus:'owner_approved',
   images:[],
   researchPages:[{url:'https://example.org/research',title:'Must not ship'}],
   heroTreatment:'typographic',
   researchedAt:null
  },
  quality:{previewReady:true,publishReady:true,blockers:[]},
  design:{variant:'editorial',compact:true,prominentNav:true},
  internalDisclaimer:'Internal-only research note. Never publish.'
 }
};

function run(exe,args,cwd){
 const result=spawnSync(exe,args,{
  cwd,stdio:'inherit',timeout:240_000,
  env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',CI:'1'}
 });
 if(result.error)throw result.error;
 if(result.status!==0)throw Error(exe+' '+args.join(' ')+' failed with exit '+result.status);
}

const base=await mkdtemp(join(tmpdir(),'command-center-client-smoke-'));
try{
 const site=await exportProject(approvedSample,join(base,'customer-website'));
 const npm=process.platform==='win32'?'npm.cmd':'npm';
 console.log('Installing exported customer website in a clean temporary folder...');
 run(npm,['install','--no-audit','--no-fund'],site);
 console.log('Running a real standalone production build...');
 run(npm,['run','build'],site);
 await stat(join(site,'.next','BUILD_ID'));
 console.log('PASS: exported Next.js customer website successfully built in isolation.');
}finally{
 await rm(base,{recursive:true,force:true});
}
