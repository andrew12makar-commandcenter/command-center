import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateExport,exportProject} from '../scripts/export-client-site.mjs';

const valid=()=>({
 exportType:'command-center-private-site-blueprint/v1',
 blueprint:{
  version:1,template:'medical',businessName:'Example Brighton Practice',
  headline:'A sample client-owned website.',description:'Reviewed description',
  services:['Dental consultations'],
  contact:{phone:'617-555-0100',email:null,city:'Brighton'},
  content:{about:'Approved factual introduction.',factStatus:'owner_approved',
   sourceUrl:'https://example.org/about',appointmentUrl:'https://example.org/book',
   heroTreatment:'typographic',images:[],researchPages:[{url:'https://example.org/gallery',title:'Confidential candidate'}]},
  quality:{publishReady:true,blockers:[],evaluation:{
   score:100,threshold:78,accepted:true,failures:[],evidence:[],dimensions:{
    contentAccuracy:20,conversion:20,informationArchitecture:20,
    visualSpecificity:20,accessibility:15,performanceReadiness:5
   }
  }},
  design:{variant:'editorial',compact:false,prominentNav:false}
 }
});
test('client project export rejects research-only assets, unapproved facts and incomplete sites',()=>{
 const a=valid();
 a.blueprint.content.factStatus='unreviewed';
 assert.throws(()=>validateExport(a),/owner-approved/i);
 const b=valid();
 b.blueprint.content.images=[{url:'https://example.org/photo',sourceUrl:'https://example.org/gallery',permission:'reference_only',role:'gallery'}];
 assert.throws(()=>validateExport(b),/research-only/i);
 const c=valid();
 c.blueprint.quality.publishReady=false;
 assert.throws(()=>validateExport(c),/owner-approved/i);
 const d=valid();
 delete d.blueprint.quality.evaluation;
 assert.throws(()=>validateExport(d),/quality preflight/i);
});
test('standalone project has no CRM login, removes research notes, and never overwrites an existing folder',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cc-site-export-'));
 const output=join(dir,'new-client-project');
 try{
  const doc=valid();
  const target=await exportProject(doc,output);
  assert.equal(target,output);
  const raw=JSON.parse(await readFile(join(target,'site-blueprint.json'),'utf8'));
  assert.deepEqual(raw.content.researchPages,[]);
  assert.equal(raw.content.factStatus,'owner_approved');
  assert.deepEqual(raw.content.researchInsights,[]);
  assert.ok(raw.quality.evaluation);
  assert.ok((await readFile(join(target,'app','page.tsx'),'utf8')).includes('standalone'));
  assert.ok((await readFile(join(target,'components','site-renderer.tsx'),'utf8')).includes('SiteRenderer'));
  assert.ok((await readFile(join(target,'lib','site-evaluation.ts'),'utf8')).includes('evaluateSiteBlueprint'));
  assert.ok((await stat(join(target,'package.json'))).size>10);
  const tsconfig=JSON.parse(await readFile(join(target,'tsconfig.json'),'utf8'));
  assert.equal(tsconfig.compilerOptions.allowImportingTsExtensions,true);
  const motionCss=await readFile(join(target,'styles','site-motion.css'),'utf8');
  assert.match(motionCss,/#gallery[^}]+animation:none/s);
  assert.match(motionCss,/#contact[^}]+animation:none/s);
  const readme=await readFile(join(target,'README.md'),'utf8');
  assert.match(readme,/No speed improvements are guaranteed/);
  assert.match(readme,/NO CRM or Supabase connection/);
  await assert.rejects(exportProject(doc,output),/already exists/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('browser QA harness renders only sites that pass the client export gate',async()=>{
 const {exportReviewHarness}=await import('../scripts/export-client-site.mjs');
 const base=await mkdtemp(join(tmpdir(),'qa-harness-test-'));
 try{
  const bad=valid();bad.blueprint.content.images=[{url:'https://example.org/a.jpg',sourceUrl:'https://example.org',permission:'reference_only',role:'hero'}];
  await assert.rejects(exportReviewHarness([{id:'ok',raw:valid()},{id:'bad',raw:bad}],join(base,'a')),/research-only/);
  await assert.rejects(exportReviewHarness([{id:'Bad Id',raw:valid()}],join(base,'b')),/simple id/);
  const out=await exportReviewHarness([{id:'one',raw:valid()},{id:'two',raw:valid()}],join(base,'c'));
  const sites=JSON.parse(await readFile(join(out,'qa-sites.json'),'utf8'));
  assert.deepEqual(Object.keys(sites),['one','two']);
  assert.deepEqual(sites.one.content.researchPages,[]);
  const page=await readFile(join(out,'app','[site]','page.tsx'),'utf8');
  assert.match(page,/getMatchedConceptSet/);
  assert.doesNotMatch(page,/getGeneratedConceptSet/);
 }finally{await rm(base,{recursive:true,force:true});}
});
