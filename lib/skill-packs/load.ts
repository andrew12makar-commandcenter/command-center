// Reads a pack directory and the local registry. No network and no code execution.
import {existsSync,lstatSync,readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import type {LoadedSkillPack,SkillPackRegistry} from './schema.ts';
import {SkillPackError,validateManifest,validatePack,validateReadme,validateRegistry} from './validate.ts';

const allowedNames=new Set(['manifest.json','pack.json','README.md']);

export function readJson(path:string):unknown{
 let text:string;
 try{text=readFileSync(path,'utf8');}
 catch{throw new SkillPackError(`cannot read ${path}`);}
 try{return JSON.parse(text) as unknown;}
 catch{throw new SkillPackError(`${path} is not valid JSON`);}
}
function assertRealFile(path:string){
 let stat;
 try{stat=lstatSync(path);}
 catch{throw new SkillPackError(`cannot read ${path}`);}
 if(stat.isSymbolicLink())throw new SkillPackError(`${path}: symlinks are not allowed`);
 if(!stat.isFile())throw new SkillPackError(`${path}: expected a file`);
 if(stat.size>256_000)throw new SkillPackError(`${path}: file is too large`);
}

export function loadSkillPackDir(dir:string):LoadedSkillPack{
 let stat;
 try{stat=lstatSync(dir);}
 catch{throw new SkillPackError(`cannot read ${dir}`);}
 if(stat.isSymbolicLink()||!stat.isDirectory())throw new SkillPackError(`${dir}: expected a pack directory`);
 const names=readdirSync(dir);
 for(const name of names)if(!allowedNames.has(name))throw new SkillPackError(`${dir}: unexpected file ${name}`);
 for(const name of ['manifest.json','pack.json'])if(!names.includes(name))throw new SkillPackError(`${dir}: missing ${name}`);
 const manifestPath=join(dir,'manifest.json');
 const packPath=join(dir,'pack.json');
 assertRealFile(manifestPath);
 assertRealFile(packPath);
 const manifest=validateManifest(readJson(manifestPath));
 const pack=validatePack(readJson(packPath));
 let readme:string|undefined;
 if(names.includes('README.md')){
  const readmePath=join(dir,'README.md');
  assertRealFile(readmePath);
  readme=readFileSync(readmePath,'utf8');
  validateReadme(readme);
 }
 return {manifest,pack,readme};
}

export function loadRegistry(path:string):SkillPackRegistry{
 if(!existsSync(path))return {format:1,packs:[]};
 assertRealFile(path);
 return validateRegistry(readJson(path));
}
