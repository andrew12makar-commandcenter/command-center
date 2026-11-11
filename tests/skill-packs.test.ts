import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync,mkdtempSync,readFileSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {defaultPreferences,planGeneration} from '../lib/demo-engine.ts';
import {applyActiveSkillPacks,applySkillPacks,emptyAppliedSkillPacks,evaluatePackChecks,mergeSkillPackIntoPlan} from '../lib/skill-packs/apply.ts';
import {importSkillPack} from '../lib/skill-packs/import-pack.ts';
import {loadRegistry,loadSkillPackDir} from '../lib/skill-packs/load.ts';
import {INTERNAL_CONCEPT_DISCLAIMER,type SkillPackBody,type SkillPackManifest} from '../lib/skill-packs/schema.ts';
import {SkillPackError,validateManifest,validatePack} from '../lib/skill-packs/validate.ts';
import {archiveZip} from '../lib/skill-packs/zip.ts';

const exampleDir=join(process.cwd(),'skill-packs','example-night-venue');
const roots:string[]=[];
function tempRoot(){
 const root=mkdtempSync(join(tmpdir(),'skill-packs-'));
 roots.push(root);
 return root;
}
test.after(()=>{for(const root of roots)rmSync(root,{recursive:true,force:true});});

function rejects(run:()=>unknown,pattern:RegExp){
 assert.throws(run,(error:unknown)=>{
  assert.ok(error instanceof SkillPackError,error instanceof Error?error.message:String(error));
  assert.match(error.message,pattern);
  return true;
 });
}
function clone<T>(value:T):T{return JSON.parse(JSON.stringify(value)) as T;}

test('example night-venue pack is labeled example data and stays inactive',()=>{
 const loaded=loadSkillPackDir(exampleDir);
 const registry=loadRegistry(join(process.cwd(),'skill-packs','registry.json'));
 assert.equal(loaded.manifest.format,1);
 assert.equal(loaded.pack.format,1);
 assert.equal(loaded.manifest.id,'example-night-venue');
 assert.equal(loaded.manifest.example,true);
 assert.match(loaded.manifest.description,/example/i);
 assert.equal(loaded.pack.copy[0].disclaimer,INTERNAL_CONCEPT_DISCLAIMER);
 assert.ok(loaded.pack.motion.every(preset=>preset.reducedMotion==='static'));
 assert.equal(loaded.pack.layouts[0].composition,'immersive');
 assert.equal(loaded.pack.layouts[0].motionId,'room-fade');
 const text=JSON.stringify(loaded)+ (loaded.readme??'');
 assert.equal(text.includes('owner_approved'),false);
 assert.equal(/https?:|circle tavern|gyro/i.test(text),false);
 assert.deepEqual(registry.packs.map(pack=>({id:pack.id,active:pack.active,example:pack.example})),
  [{id:'example-night-venue',active:false,example:true}]);
 const applied=applyActiveSkillPacks({template:'night-venue'});
 assert.deepEqual(applied.applied,[]);
 assert.equal(applied.disclaimer,INTERNAL_CONCEPT_DISCLAIMER);
 assert.equal(applied.robots,'noindex, nofollow');
});

test('validator rejects malformed packs, network fetches, approval, and disclaimer edits',()=>{
 const loaded=loadSkillPackDir(exampleDir);
 const manifest=()=>clone(loaded.manifest);
 const pack=()=>clone(loaded.pack);
 const badFormat=manifest();
 (badFormat as {format:number}).format=2;
 rejects(()=>validateManifest(badFormat),/format must be 1/);
 const remote=manifest();
 remote.sourceNote='See https://example.com/tour';
 rejects(()=>validateManifest(remote),/external network fetches/);
 const fetched=manifest();
 fetched.description='Example pack that will fetch( the palette';
 rejects(()=>validateManifest(fetched),/executable code/);
 const disclaimer=pack();
 disclaimer.copy[0].disclaimer='Published by the business' as typeof INTERNAL_CONCEPT_DISCLAIMER;
 rejects(()=>validatePack(disclaimer),/disclaimer must stay/);
 const removed={...pack(),omitDisclaimer:true};
 rejects(()=>validatePack(removed),/would change the internal-concept disclaimer/);
 const approved=pack();
 approved.copy[0].guidance=['Set owner_approved before export'];
 rejects(()=>validatePack(approved),/owner_approved/);
 const status={...pack(),factStatus:'owner_approved'};
 rejects(()=>validatePack(status),/factStatus/);
 const scripted=pack();
 scripted.tokens.font.display='<script>';
 rejects(()=>validatePack(scripted),/executable markup/);
 const indexed=manifest();
 indexed.sourceNote='robots index, follow';
 rejects(()=>validateManifest(indexed),/noindex/);
 const moving=pack();
 (moving.motion[0] as {reducedMotion:string}).reducedMotion='full';
 rejects(()=>validatePack(moving),/reducedMotion must be static/);
 const thin=pack();
 thin.checks=thin.checks.filter(check=>check.rule!=='noindex');
 rejects(()=>validatePack(thin),/must include noindex/);
 const extra=manifest() as SkillPackManifest&{active?:boolean};
 extra.active=true;
 rejects(()=>validateManifest(extra),/unknown field active/);
 const address=pack();
 address.tokens.color.scene='url(asset)';
 rejects(()=>validatePack(address),/external network fetches|expected a hex/);
});

test('import copies a folder or zip into an inactive registry entry',()=>{
 const root=tempRoot();
 const folder=importSkillPack({source:exampleDir,root});
 assert.equal(folder.wrote,true);
 assert.equal(folder.active,false);
 assert.equal(folder.id,'example-night-venue');
 const registry=loadRegistry(join(root,'skill-packs','registry.json'));
 assert.equal(registry.packs[0].active,false);
 assert.equal(loadSkillPackDir(folder.destination).manifest.example,true);
 rejects(()=>importSkillPack({source:exampleDir,root}),/already imported/);

 const files={
  'manifest.json':readFileSync(join(exampleDir,'manifest.json')),
  'pack.json':readFileSync(join(exampleDir,'pack.json')),
  'README.md':readFileSync(join(exampleDir,'README.md')),
 };
 const zipRoot=tempRoot();
 const zipPath=join(zipRoot,'pack.zip');
 writeFileSync(zipPath,archiveZip(files,8));
 const zipped=importSkillPack({source:zipPath,root:zipRoot});
 assert.equal(zipped.wrote,true);
 assert.equal(loadSkillPackDir(zipped.destination).pack.layouts[0].id,'night-tour');

 const wrapped=tempRoot();
 const wrappedZip=join(wrapped,'wrapped.zip');
 writeFileSync(wrappedZip,archiveZip({
  'night/manifest.json':files['manifest.json'],
  'night/pack.json':files['pack.json'],
  '__MACOSX/night/._pack.json':Buffer.from('junk'),
  'night/.DS_Store':Buffer.from('junk'),
 },0));
 assert.equal(importSkillPack({source:wrappedZip,root:wrapped}).id,'example-night-venue');
});

test('import rejects zip slip, symlinks, unexpected files, and bad packs without writing',()=>{
 const root=tempRoot();
 const slip=join(root,'slip.zip');
 writeFileSync(slip,unsafeZip('../evil.json',Buffer.from('{}')));
 rejects(()=>importSkillPack({source:slip,root}),/unsafe path/);
 assert.equal(existsSync(join(root,'skill-packs','registry.json')),false);

 const linked=tempRoot();
 writeFileSync(join(linked,'manifest.json'),readFileSync(join(exampleDir,'manifest.json')));
 writeFileSync(join(linked,'pack.json'),readFileSync(join(exampleDir,'pack.json')));
 symlinkSync(join(linked,'manifest.json'),join(linked,'README.md'));
 rejects(()=>importSkillPack({source:linked,root}),/symlinks are not allowed/);

 const extra=tempRoot();
 writeFileSync(join(extra,'manifest.json'),readFileSync(join(exampleDir,'manifest.json')));
 writeFileSync(join(extra,'pack.json'),readFileSync(join(exampleDir,'pack.json')));
 writeFileSync(join(extra,'run.mjs'),Buffer.from('export default 1\n'));
 rejects(()=>importSkillPack({source:extra,root}),/unexpected file run.mjs/);

 const dry=tempRoot();
 const preview=importSkillPack({source:exampleDir,root:dry,dryRun:true});
 assert.equal(preview.wrote,false);
 assert.equal(loadRegistry(join(dry,'skill-packs','registry.json')).packs.length,0);
});

test('replace keeps the registry active flag',()=>{
 const root=tempRoot();
 importSkillPack({source:exampleDir,root});
 const registryPath=join(root,'skill-packs','registry.json');
 const registry=loadRegistry(registryPath);
 registry.packs[0].active=true;
 writeFileSync(registryPath,`${JSON.stringify(registry,null,2)}\n`);
 const edited=tempRoot();
 const manifest=JSON.parse(readFileSync(join(exampleDir,'manifest.json'),'utf8')) as SkillPackManifest;
 manifest.description='Example night venue, replaced locally.';
 writeFileSync(join(edited,'manifest.json'),`${JSON.stringify(manifest,null,2)}\n`);
 writeFileSync(join(edited,'pack.json'),readFileSync(join(exampleDir,'pack.json')));
 const replaced=importSkillPack({source:edited,root,replace:true});
 assert.equal(replaced.active,true);
 assert.equal(loadRegistry(registryPath).packs[0].active,true);
 assert.match(loadSkillPackDir(replaced.destination).manifest.description,/replaced locally/);
});

test('apply merges a matching pack and refuses approval or a removed disclaimer',()=>{
 const loaded=loadSkillPackDir(exampleDir);
 const applied=applySkillPacks([loaded],{template:'night-venue'});
 assert.deepEqual(applied.applied.map(item=>item.id),['example-night-venue']);
 assert.equal(applied.tokens.color.accent,'#d4af6a');
 assert.equal(applied.disclaimer,INTERNAL_CONCEPT_DISCLAIMER);
 assert.equal(applied.robots,'noindex, nofollow');
 assert.equal(JSON.stringify(applied).includes('owner_approved'),false);
 assert.ok(applied.checkResults.every(check=>check.pass));
 assert.deepEqual(applySkillPacks([loaded],{template:'medical'}).applied,[]);

 const merged=mergeSkillPackIntoPlan(applied,{
  composition:'centered',sectionOrder:['hero','services','contact'],motion:'calm',
  motionPlan:{required:true,pageEntry:'soft-rise',sectionReveal:'cascade',mediaMotion:'masked-reveal',navigationMotion:'underline-track',staggerMs:90},
 });
 assert.equal(merged.composition,'immersive');
 assert.deepEqual(merged.sectionOrder,['hero','gallery','contact']);
 assert.equal(merged.motion,'cinematic');
 assert.equal(merged.motionPlan.pageEntry,'cinematic-wipe');
 assert.equal(merged.motionPlan.staggerMs,0);
 assert.equal(merged.skillPacks?.disclaimer,INTERNAL_CONCEPT_DISCLAIMER);
 assert.equal(merged.skillPacks?.example,true);
 assert.match(merged.rationale[0],/Internal concept, not endorsed by the business/);

 const learned=mergeSkillPackIntoPlan(applied,{
  composition:'centered',sectionOrder:['hero','services','contact'],motion:'calm',
  motionPlan:{required:true,pageEntry:'soft-rise',sectionReveal:'cascade',mediaMotion:'masked-reveal',navigationMotion:'pill-shift',staggerMs:90},
 },{learned:true});
 assert.equal(learned.composition,'centered');
 assert.equal(learned.motion,'calm');
 assert.equal(learned.skillPacks?.ids[0],'example-night-venue');
 assert.match(learned.rationale[0],/Learned feedback kept the layout/);

 const broken=clone(applied);
 broken.sections=broken.sections.filter(section=>section.id!=='scene-hero');
 const results=evaluatePackChecks(broken);
 assert.equal(results.find(check=>check.id==='scene')?.pass,false);
 assert.equal(results.find(check=>check.id==='disclaimer')?.pass,true);

 const forged=clone(loaded) as {manifest:SkillPackManifest;pack:SkillPackBody};
 forged.pack.copy[0].disclaimer='Removed' as typeof INTERNAL_CONCEPT_DISCLAIMER;
 rejects(()=>applySkillPacks([forged],{template:'night-venue'}),/disclaimer/);
 const idle=mergeSkillPackIntoPlan(emptyAppliedSkillPacks(),{
  composition:'bento',sectionOrder:['hero'],motion:'precise',
  motionPlan:{required:true,pageEntry:'precision-reveal',sectionReveal:'indexed-rise',mediaMotion:'masked-reveal',navigationMotion:'underline-track',staggerMs:65},
 });
 assert.equal(idle.skillPacks,undefined);
 assert.deepEqual(idle.rationale,[]);
 assert.equal(idle.composition,'bento');
});

test('planGeneration consumes an active matching pack and ignores the inactive example',()=>{
 const untouched=planGeneration('Harbor Dental','medical',defaultPreferences());
 assert.equal('skillPacks' in untouched,false);
 assert.equal(untouched.motion,'calm');
 assert.equal(untouched.rationale.some(line=>line.startsWith('Skill pack')),false);

 const root=tempRoot();
 importSkillPack({source:exampleDir,root});
 const registryPath=join(root,'skill-packs','registry.json');
 const registry=loadRegistry(registryPath);
 registry.packs[0].active=true;
 writeFileSync(registryPath,`${JSON.stringify(registry,null,2)}\n`);
 const manifestPath=join(root,'skill-packs','example-night-venue','manifest.json');
 const manifest=JSON.parse(readFileSync(manifestPath,'utf8')) as SkillPackManifest;
 manifest.appliesTo=['medical'];
 writeFileSync(manifestPath,`${JSON.stringify(manifest,null,2)}\n`);

 const spec=planGeneration('Harbor Dental','medical',defaultPreferences(),root);
 assert.equal(spec.composition,'immersive');
 assert.equal(spec.motion,'cinematic');
 assert.equal(spec.skillPacks?.disclaimer,INTERNAL_CONCEPT_DISCLAIMER);
 assert.equal(spec.skillPacks?.robots,'noindex, nofollow');
 assert.deepEqual(spec.skillPacks?.ids,['example-night-venue']);
 assert.equal(JSON.stringify(spec.skillPacks).includes('owner_approved'),false);

 const other=planGeneration('Stone and Stem','landscaping',defaultPreferences(),root);
 assert.equal('skillPacks' in other,false);
 const learned=planGeneration('Harbor Dental','medical',{...defaultPreferences(),feedbackCount:1,composition:'centered'},root);
 assert.equal(learned.composition,'centered');
 assert.ok(learned.skillPacks);
});

test('import CLI dry-run and a real local zip both stay on disk',()=>{
 const root=tempRoot();
 const dry=spawnSync(process.execPath,['scripts/import-skill-pack.mjs','--root',root,'--dry-run',exampleDir],{encoding:'utf8'});
 assert.equal(dry.status,0,dry.stderr);
 assert.match(dry.stdout,/dry-run: would import example-night-venue@1.0.0/);
 assert.equal(loadRegistry(join(root,'skill-packs','registry.json')).packs.length,0);

 const folder=tempRoot();
 writeFileSync(join(folder,'manifest.json'),readFileSync(join(exampleDir,'manifest.json')));
 writeFileSync(join(folder,'pack.json'),readFileSync(join(exampleDir,'pack.json')));
 const zip=join(root,'python.zip');
 const packed=spawnSync('python3',['-c',`import zipfile; z=zipfile.ZipFile(${JSON.stringify(zip)},'w');
z.write(${JSON.stringify(join(folder,'manifest.json'))},'manifest.json');
z.write(${JSON.stringify(join(folder,'pack.json'))},'pack.json'); z.close()`],{encoding:'utf8'});
 assert.equal(packed.status,0,packed.stderr);
 const imported=spawnSync(process.execPath,['scripts/import-skill-pack.mjs','--root',root,zip],{encoding:'utf8'});
 assert.equal(imported.status,0,imported.stderr);
 assert.match(imported.stdout,/imported example-night-venue@1.0.0/);
 assert.equal(loadRegistry(join(root,'skill-packs','registry.json')).packs[0].active,false);

 const bad=spawnSync(process.execPath,['scripts/import-skill-pack.mjs','--root',root,join(root,'missing.zip')],{encoding:'utf8'});
 assert.equal(bad.status,1);
 assert.match(bad.stderr,/cannot read/);
});

function unsafeZip(name:string,data:Buffer){
 const nameBuf=Buffer.from(name);
 const local=Buffer.alloc(30);
 local.writeUInt32LE(0x04034b50,0);
 local.writeUInt16LE(20,4);
 local.writeUInt32LE(0,14);
 local.writeUInt32LE(data.length,18);
 local.writeUInt32LE(data.length,22);
 local.writeUInt16LE(nameBuf.length,26);
 const central=Buffer.alloc(46);
 central.writeUInt32LE(0x02014b50,0);
 central.writeUInt16LE(20,4);
 central.writeUInt16LE(20,6);
 central.writeUInt32LE(data.length,20);
 central.writeUInt32LE(data.length,24);
 central.writeUInt16LE(nameBuf.length,28);
 central.writeUInt32LE(0,42);
 const end=Buffer.alloc(22);
 end.writeUInt32LE(0x06054b50,0);
 end.writeUInt16LE(1,8);
 end.writeUInt16LE(1,10);
 end.writeUInt32LE(46+nameBuf.length,12);
 end.writeUInt32LE(30+nameBuf.length+data.length,16);
 return Buffer.concat([local,nameBuf,data,central,nameBuf,end]);
}
