import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm,stat,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateExport} from '../scripts/export-client-site.mjs';
import {
 DISCLAIMER,ROBOTS,assertPreviewPage,exportInternalPreview,parseSiteJson,readGeneratedSite
} from '../scripts/export-internal-preview.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const stamp={sourceCommit:'abc1234def567890',timestamp:'2026-11-11T18:05:00.000Z'};

function example(){
 return {
  example:true,
  businessName:'Example Lantern Street Bakery',
  headline:'Example data for an internal concept preview',
  description:'Synthetic fixture. Not a real business.',
  services:[
   'Example sourdough loaves (synthetic fixture)',
   'Example morning buns (synthetic fixture)'
  ],
  contact:{phone:'617-555-0148',email:null,city:'Example Town'},
  content:{
   about:'Example data. This bakery is not real. Hours, prices, and owner approval are unknown / to confirm.',
   audience:'Example neighbors (synthetic).'
  },
  pages:[
   {slug:'index',title:'Home',heading:'Example Lantern Street Bakery',paragraphs:[
    'Example data for internal review only. Not a real business.',
    'Recorded details are unknown / to confirm.'
   ]},
   {slug:'services',title:'Services',heading:'Example offerings',paragraphs:[
    'These labels are synthetic fixtures, not a published menu.'
   ],items:[
    'Example sourdough loaves (synthetic fixture)',
    'Example morning buns (synthetic fixture)'
   ]},
   {slug:'about',title:'About',heading:'About this example',paragraphs:[
    'Example data. Hours, prices, testimonials, and owner approval are unknown / to confirm.'
   ]},
   {slug:'visit',title:'Visit',heading:'Visit (example)',paragraphs:[
    'No real address is recorded. Location is unknown / to confirm.'
   ],showContact:true}
  ]
 };
}

async function tempExport(site,options={}){
 const dir=await mkdtemp(join(tmpdir(),'internal-preview-'));
 const output=join(dir,'preview');
 try{
  const result=await exportInternalPreview(site,output,{...stamp,...options});
  return {dir,output,result};
 }catch(error){
  await rm(dir,{recursive:true,force:true});
  throw error;
 }
}

test('disclaimer text is the required internal-concept sentence',()=>{
 assert.equal(DISCLAIMER,'Internal concept, not endorsed by the business');
 assert.equal(ROBOTS,'noindex,nofollow,noarchive');
});

test('exporter source never mentions owner_approved and does not call the client exporter',async()=>{
 const src=await readFile(new URL('../scripts/export-internal-preview.mjs',import.meta.url),'utf8');
 assert.equal(src.includes('owner_approved'),false);
 assert.equal(src.includes('export-client-site'),false);
});

test('disclaimer and noindex survive on every page, and approval state is never touched',async()=>{
 const site=example();
 const content=site.content;
 let reads=0,writes=0;
 Object.defineProperty(content,'factStatus',{
  configurable:true,enumerable:true,
  get(){reads+=1;return 'owner_approved';},
  set(){writes+=1;return true;}
 });
 Object.defineProperty(site,'owner_approved',{
  configurable:true,enumerable:true,
  get(){reads+=1;return true;},
  set(){writes+=1;return true;}
 });
 Object.defineProperty(site,'internalDisclaimer',{
  configurable:true,
  get(){reads+=1;return '';},
  set(){writes+=1;return true;}
 });
 const before=content.about;
 const {dir,output,result}=await tempExport(site);
 try{
  assert.equal(reads,0);
  assert.equal(writes,0);
  assert.equal(content.about,before);
  assert.deepEqual(result.pages,['index.html','services.html','about.html','visit.html']);
  assert.equal(result.manifest.kind,'internal-preview');
  assert.equal(result.manifest.sourceCommit,stamp.sourceCommit);
  assert.equal(result.manifest.timestamp,stamp.timestamp);
  const files=await readdir(output);
  assert.ok(files.includes('internal-preview-manifest.json'));
  assert.ok(files.includes('robots.txt'));
  for(const page of result.pages){
   const html=await readFile(join(output,page),'utf8');
   assertPreviewPage(html,page);
   assert.match(html,/<p class="internal-preview-banner" role="note">Internal concept, not endorsed by the business<\/p>/);
   assert.match(html,/<footer class="internal-preview-footer">Internal concept, not endorsed by the business<\/footer>/);
   assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);
   assert.match(html,/Example data\. Synthetic fixture, not a real business\./);
   assert.equal(html.includes('owner_approved'),false);
  }
  const manifest=JSON.parse(await readFile(join(output,'internal-preview-manifest.json'),'utf8'));
  assert.equal(manifest.kind,'internal-preview');
  assert.equal(manifest.sourceCommit,stamp.sourceCommit);
  assert.equal(manifest.timestamp,'2026-11-11T18:05:00.000Z');
  assert.equal(JSON.stringify(manifest).includes('owner_approved'),false);
  const robots=await readFile(join(output,'robots.txt'),'utf8');
  assert.match(robots,/Disallow: \//);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('a blank incoming disclaimer and an approval flag are not copied into the preview',async()=>{
 const site={
  exportType:'command-center-private-site-blueprint/v1',
  blueprint:{
   version:1,
   businessName:'Example Lantern Street Bakery',
   headline:'Example data for an internal concept preview',
   description:'Synthetic fixture. Not a real business.',
   services:['Example sourdough loaves (synthetic fixture)'],
   contact:{phone:'617-555-0148',email:null,city:'Example Town'},
   content:{
    about:'Example data. This bakery is not real. Hours, prices, and owner approval are unknown / to confirm.',
    factStatus:'owner_approved',
    internalDisclaimer:''
   },
   internalDisclaimer:'',
   quality:{publishReady:true,blockers:[]}
  }
 };
 const snapshot=JSON.parse(JSON.stringify(site));
 const {dir,output}=await tempExport(site);
 try{
  assert.deepEqual(site,snapshot);
  const htmlPages=(await readdir(output)).filter(name=>name.endsWith('.html')).sort();
  assert.deepEqual(htmlPages,['about.html','contact.html','index.html','services.html']);
  for(const file of await readdir(output)){
   const text=await readFile(join(output,file),'utf8');
   assert.equal(text.includes('owner_approved'),false,file);
   if(file.endsWith('.html'))assertPreviewPage(text,file);
  }
  const read=readGeneratedSite(site);
  assert.equal(read.businessName,'Example Lantern Street Bakery');
  assert.equal(Object.hasOwn(read,'factStatus'),false);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('refuses to write a preview when the disclaimer or noindex would be missing',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'internal-preview-refuse-'));
 const output=join(dir,'preview');
 try{
  await assert.rejects(exportInternalPreview(example(),output,{
   ...stamp,disclaimer:''
  }),/disclaimer would be missing/i);
  await assert.rejects(exportInternalPreview(example(),output,{
   ...stamp,disclaimer:'Published with the owner'
  }),/disclaimer would be missing/i);
  await assert.rejects(exportInternalPreview(example(),output,{
   ...stamp,
   renderPage:()=>'<!doctype html><title>hidden</title><p class="internal-preview-banner">'+DISCLAIMER+'</p>'
  }),/disclaimer would be missing/i);
  await assert.rejects(exportInternalPreview(example(),output,{
   ...stamp,
   renderPage:()=>'<!-- '+DISCLAIMER+' --><meta name="robots" content="'+ROBOTS+'">'
  }),/disclaimer would be missing/i);
  const hidden='<!doctype html><head><meta name="robots" content="'+ROBOTS+'"><style>.internal-preview-banner{display:none}.internal-preview-footer{display:block}</style></head>'+
   '<body><p class="internal-preview-banner">'+DISCLAIMER+'</p><footer class="internal-preview-footer">'+DISCLAIMER+'</footer></body>';
  await assert.rejects(exportInternalPreview(example(),output,{...stamp,renderPage:()=>hidden}),/hidden/i);
  assert.throws(()=>assertPreviewPage('<p class="internal-preview-banner">'+DISCLAIMER+'</p><footer class="internal-preview-footer">'+DISCLAIMER+'</footer>','bare.html'),/noindex/i);
  await assert.equal(await stat(output).then(()=>true,()=>false),false);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('does not overwrite an existing folder',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'internal-preview-exists-'));
 const output=join(dir,'preview');
 try{
  await exportInternalPreview(example(),output,stamp);
  await assert.rejects(exportInternalPreview(example(),output,stamp),/already exists/);
  assert.match(await readFile(join(output,'index.html'),'utf8'),/internal-preview-banner/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('parsed site JSON drops factStatus without keeping it on the object',()=>{
 const raw='{"businessName":"Example Lantern Street Bakery","content":{"about":"Example data.","factStatus":"owner_approved","internalDisclaimer":""}}';
 const parsed=parseSiteJson(raw);
 assert.equal(Object.hasOwn(parsed.content,'factStatus'),false);
 assert.equal(parsed.content.about,'Example data.');
 assert.equal(parsed.content.internalDisclaimer,'');
 const last='{"businessName":"Example Lantern Street Bakery","factStatus":"owner_approved"}';
 assert.equal(Object.hasOwn(parseSiteJson(last),'factStatus'),false);
});

test('CLI writes a labeled example preview and leaves the source file unchanged',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'internal-preview-cli-'));
 const fixture=join(dir,'example-lantern-street-bakery.json');
 const output=join(dir,'preview');
 const payload={
  ...example(),
  content:{...example().content,factStatus:'owner_approved',internalDisclaimer:''}
 };
 const original=JSON.stringify(payload,null,2)+'\n';
 await writeFile(fixture,original);
 try{
  const result=spawnSync(process.execPath,[
   join(root,'scripts/export-internal-preview.mjs'),fixture,output
  ],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/Internal preview created/);
  assert.equal(await readFile(fixture,'utf8'),original);
  const manifest=JSON.parse(await readFile(join(output,'internal-preview-manifest.json'),'utf8'));
  assert.equal(manifest.kind,'internal-preview');
  assert.match(manifest.sourceCommit,/^[0-9a-f]{7,40}$/);
  assert.equal(Number.isFinite(Date.parse(manifest.timestamp)),true);
  const pages=await readdir(output);
  const htmlPages=pages.filter(name=>name.endsWith('.html'));
  assert.ok(htmlPages.length>=4);
  for(const page of htmlPages){
   const html=await readFile(join(output,page),'utf8');
   assertPreviewPage(html,page);
   assert.equal(html.includes('owner_approved'),false);
   assert.match(html,/Example Lantern Street Bakery/);
  }
  for(const file of pages)assert.equal((await readFile(join(output,file),'utf8')).includes('owner_approved'),false);
 }finally{await rm(dir,{recursive:true,force:true});}
});

function approvedClientFixture(){
 return {
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
 };
}

test('existing client exporter still requires owner approval and still blanks the disclaimer',async()=>{
 const src=await readFile(new URL('../scripts/export-client-site.mjs',import.meta.url),'utf8');
 assert.match(src,/factStatus\s*!==\s*'owner_approved'/);
 assert.match(src,/internalDisclaimer:\s*''/);
 const unapproved=approvedClientFixture();
 unapproved.blueprint.content.factStatus='unreviewed';
 assert.throws(()=>validateExport(unapproved),/owner-approved/i);
 const safe=validateExport(approvedClientFixture());
 assert.equal(safe.internalDisclaimer,'');
 assert.equal(safe.content.factStatus,'owner_approved');
});
