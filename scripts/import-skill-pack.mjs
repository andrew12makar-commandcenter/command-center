#!/usr/bin/env node
// Import a local skill-pack folder or zip. Packs stay data: no network, no activation.
import {importSkillPack} from '../lib/skill-packs/import-pack.ts';
import {SkillPackError} from '../lib/skill-packs/validate.ts';

const args=process.argv.slice(2);
let source,root,replace=false,dryRun=false;
for(let index=0;index<args.length;index++){
 const arg=args[index];
 if(arg==='--replace')replace=true;
 else if(arg==='--dry-run')dryRun=true;
 else if(arg==='--help'||arg==='-h'){usage(0);}
 else if(arg==='--root'){root=args[++index];if(!root)fail('missing value for --root');}
 else if(arg.startsWith('--'))fail(`unknown flag ${arg}`);
 else if(!source)source=arg;
 else fail(`unexpected argument ${arg}`);
}
if(!source)usage(1);

try{
 const result=importSkillPack({source,root,replace,dryRun});
 const action=result.wrote?'imported':'dry-run: would import';
 console.log(`${action} ${result.id}@${result.version} -> ${result.destination} (active: ${result.active})`);
}catch(error){
 const message=error instanceof SkillPackError?error.message:error instanceof Error?error.message:'import failed';
 fail(message);
}

function usage(code){
 console.log(`Usage: node scripts/import-skill-pack.mjs [--root <repo>] [--replace] [--dry-run] <folder-or-zip>

Copies a validated pack into skill-packs/<id>/ and registers it inactive unless that id was already active.
The pack must be local JSON and templates. Remote fetches and executable files are rejected.`);
 process.exit(code);
}
function fail(message){
 console.error(message);
 process.exit(1);
}
