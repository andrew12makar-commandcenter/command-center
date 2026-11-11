// Copies a local folder or zip into skill-packs/<id>/ and updates the registry.
// Import never activates a pack and never contacts the network.
import {lstatSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,renameSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve,sep} from 'node:path';
import {loadRegistry,loadSkillPackDir} from './load.ts';
import type {SkillPackRegistry} from './schema.ts';
import {SkillPackError,validateReadme} from './validate.ts';
import {readZip} from './zip.ts';

const allowed=new Set(['manifest.json','pack.json','README.md']);
const ignored=new Set(['.DS_Store']);

export type ImportResult={id:string;version:string;destination:string;wrote:boolean;active:boolean};

export function importSkillPack(opts:{source:string;root?:string;replace?:boolean;dryRun?:boolean}):ImportResult{
 const files=packFiles(opts.source);
 if(!files.has('manifest.json')||!files.has('pack.json'))throw new SkillPackError('pack is missing manifest.json or pack.json');
 const staging=mkdtempSync(join(tmpdir(),'skill-pack-'));
 try{
  for(const [name,data] of files)writeFileSync(join(staging,name),data);
  if(files.has('README.md'))validateReadme(files.get('README.md')!.toString('utf8'));
  const loaded=loadSkillPackDir(staging);
  const root=resolve(opts.root??process.cwd());
  const destination=resolve(root,'skill-packs',loaded.manifest.id);
  assertInsidePacks(root,destination);
  const registryPath=join(root,'skill-packs','registry.json');
  const registry=loadRegistry(registryPath);
  const existing=registry.packs.find(entry=>entry.id===loaded.manifest.id);
  if(existing&&!opts.replace)throw new SkillPackError(`${loaded.manifest.id} is already imported; pass --replace to update it`);
  const active=existing?.active??false;
  if(opts.dryRun)return {id:loaded.manifest.id,version:loaded.manifest.version,destination,wrote:false,active};
  const next:SkillPackRegistry={
   format:1,
   packs:[...registry.packs.filter(entry=>entry.id!==loaded.manifest.id),{
    id:loaded.manifest.id,version:loaded.manifest.version,example:loaded.manifest.example,active,path:loaded.manifest.id,
   }],
  };
  mkdirSync(destination,{recursive:true});
  writeFileSync(join(destination,'manifest.json'),`${JSON.stringify(loaded.manifest,null,2)}\n`);
  writeFileSync(join(destination,'pack.json'),`${JSON.stringify(loaded.pack,null,2)}\n`);
  if(loaded.readme!==undefined)writeFileSync(join(destination,'README.md'),loaded.readme);
  writeRegistry(registryPath,next);
  return {id:loaded.manifest.id,version:loaded.manifest.version,destination,wrote:true,active};
 }finally{
  rmSync(staging,{recursive:true,force:true});
 }
}

function packFiles(source:string){
 let stat;
 try{stat=lstatSync(source);}
 catch{throw new SkillPackError(`cannot read ${source}`);}
 if(stat.isSymbolicLink())throw new SkillPackError('source cannot be a symlink');
 if(stat.isDirectory())return filesFromDirectory(source);
 if(stat.isFile())return unwrapZip(readZip(readFileSync(source)));
 throw new SkillPackError('source must be a folder or a zip file');
}
function filesFromDirectory(dir:string){
 const files=new Map<string,Buffer>();
 for(const name of readdirSync(dir)){
  if(ignored.has(name))continue;
  if(!allowed.has(name))throw new SkillPackError(`unexpected file ${name}`);
  const path=join(dir,name);
  const stat=lstatSync(path);
  if(stat.isSymbolicLink())throw new SkillPackError(`${name}: symlinks are not allowed`);
  if(!stat.isFile())throw new SkillPackError(`${name}: expected a file`);
  files.set(name,readFileSync(path));
 }
 return files;
}
function unwrapZip(files:Map<string,Buffer>){
 const cleaned=new Map<string,Buffer>();
 for(const [name,data] of files){
  const base=name.split('/').at(-1)??name;
  if(name.startsWith('__MACOSX/')||ignored.has(base))continue;
  cleaned.set(name,data);
 }
 const names=[...cleaned.keys()];
 const tops=new Set(names.map(name=>name.split('/')[0]));
 let flat=cleaned;
 if(names.length&&names.every(name=>name.includes('/'))&&tops.size===1){
  const prefix=`${[...tops][0]}/`;
  flat=new Map([...cleaned].map(([name,data])=>[name.slice(prefix.length),data]));
 }
 for(const name of flat.keys())if(!allowed.has(name))throw new SkillPackError(`unexpected file ${name}`);
 return flat;
}
function writeRegistry(path:string,registry:SkillPackRegistry){
 mkdirSync(dirname(path),{recursive:true});
 const temporary=join(dirname(path),`.registry-${process.pid}.json`);
 writeFileSync(temporary,`${JSON.stringify(registry,null,2)}\n`);
 renameSync(temporary,path);
}
export function assertInsidePacks(root:string,destination:string){
 const packsDir=resolve(root,'skill-packs');
 if(destination!==packsDir&&!destination.startsWith(packsDir+sep))throw new SkillPackError('destination escapes skill-packs');
}
