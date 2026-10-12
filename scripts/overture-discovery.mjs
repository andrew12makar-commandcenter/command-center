#!/usr/bin/env node
// Greater Boston discovery from Overture Maps Places, queried locally with
// DuckDB directly against the public release (no API key, no cost).
//
//   npm run discover:overture -- --ring 1                 Allston, Brighton, Brookline
//   npm run discover:overture -- --areas newton,watertown --limit 300
//
// Output (in .local-discovery/<run>/): candidates.json with full provenance and
// review-ready CSV part files (≤500 rows) for /app/leads/import. Nothing is
// written to Supabase. Every row is an unverified discovery candidate.
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DuckDBInstance} from '@duckdb/node-api';
import {selectAreas,validBBox} from '../lib/discovery-regions.ts';
import {OVERTURE_STAC_CATALOG,OVERTURE_ATTRIBUTION_URL,latestReleaseFromCatalog,placesPath,buildPlacesQuery,
 normalizeOvertureRow,dedupeCandidates,candidatesToCsv} from '../lib/overture-places.ts';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

export function parseArgs(argv){
 const o={areas:null,ring:null,limit:150,minConfidence:0.6,release:null,source:null,out:null};
 for(let i=0;i<argv.length;i++){
  const a=argv[i],v=()=>{if(i+1>=argv.length)throw Error(a+' needs a value');return argv[++i];};
  if(a==='--areas')o.areas=v().split(',').map(s=>s.trim()).filter(Boolean);
  else if(a==='--ring')o.ring=Number(v());
  else if(a==='--limit')o.limit=Number(v());
  else if(a==='--min-confidence')o.minConfidence=Number(v());
  else if(a==='--release')o.release=v();
  else if(a==='--source')o.source=v(); // local parquet (tests / offline copies)
  else if(a==='--out')o.out=v();
  else throw Error('Unknown option '+a);
 }
 if(!Number.isInteger(o.limit)||o.limit<1||o.limit>2000)throw Error('--limit must be 1–2000 per area');
 if(!(o.minConfidence>=0&&o.minConfidence<=1))throw Error('--min-confidence must be between 0 and 1');
 return o;
}

async function discoverRelease(){
 const res=await fetch(OVERTURE_STAC_CATALOG,{signal:AbortSignal.timeout(15000),redirect:'error'});
 if(!res.ok)throw Error('Overture STAC catalog unavailable (HTTP '+res.status+'). Pass --release explicitly.');
 return latestReleaseFromCatalog(await res.json());
}

export async function runDiscovery(opts,log=console.log){
 const areas=selectAreas({areas:opts.areas??undefined,ring:opts.ring??undefined});
 for(const a of areas)if(!validBBox(a.bbox))throw Error('Invalid bounding box for '+a.id);
 const release=opts.source?(opts.release??'local-file'):(opts.release??await discoverRelease());
 const source=opts.source?resolve(opts.source):placesPath(release);
 log(`Overture release ${release} · areas: ${areas.map(a=>a.label).join(', ')}`);
 const db=await DuckDBInstance.create(':memory:');
 const conn=await db.connect();
 try{
  if(!opts.source){
   await conn.run("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';");
  }
  const columns=(await conn.runAndReadAll(`DESCRIBE SELECT * FROM read_parquet('${source.replace(/'/g,"''")}', hive_partitioning=1)`))
   .getRowObjectsJson().map(r=>String(r.column_name));
  const all=[],queries=[];
  for(const area of areas){
   const sql=buildPlacesQuery(source,area.bbox,columns,{limit:opts.limit,minConfidence:opts.minConfidence});
   queries.push({area:area.id,sql});
   const t=Date.now();
   const rows=(await conn.runAndReadAll(sql)).getRowObjectsJson();
   const mapped=rows.map(r=>normalizeOvertureRow(r,release,areas)).filter(Boolean);
   log(`  ${area.label}: ${rows.length} rows → ${mapped.length} candidates (${((Date.now()-t)/1000).toFixed(1)}s)${rows.length>=opts.limit?' · LIMIT reached, raise --limit for fuller coverage':''}`);
   all.push(...mapped);
  }
  const candidates=dedupeCandidates(all);
  return {kind:'command-center-overture-discovery/v1',createdAt:new Date().toISOString(),release,
   areas:areas.map(({id,label,ring,bbox})=>({id,label,ring,bbox})),
   settings:{limitPerArea:opts.limit,minConfidence:opts.minConfidence},columns,queries,
   status:'unverified_discovery_candidates',
   note:'Overture records can be duplicated, closed, misplaced or incomplete. Stage through /app/leads/import and verify before outreach.',
   attribution:{source:'Overture Maps Foundation, Places theme',release,url:OVERTURE_ATTRIBUTION_URL},
   counts:{raw:all.length,unique:candidates.length,flaggedDuplicates:candidates.filter(c=>c.possibleDuplicateOf.length).length},
   candidates};
 }finally{
  conn.closeSync?.();
 }
}

export async function writeOutputs(result,outDir){
 await mkdir(outDir,{recursive:true});
 await writeFile(join(outDir,'candidates.json'),JSON.stringify(result,null,2)+'\n');
 const files=[];
 for(let i=0;i<result.candidates.length;i+=500){
  const name=`import-part-${String(i/500+1).padStart(2,'0')}.csv`;
  await writeFile(join(outDir,name),candidatesToCsv(result.candidates.slice(i,i+500)));
  files.push(name);
 }
 return files;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const opts=parseArgs(process.argv.slice(2));
  const result=await runDiscovery(opts);
  const out=resolve(opts.out||join(root,'.local-discovery','overture-'+new Date().toISOString().replaceAll(/[:.]/g,'-')));
  const files=await writeOutputs(result,out);
  const by=(k)=>Object.entries(result.candidates.reduce((m,c)=>{for(const v of [].concat(c[k]))m[v]=(m[v]||0)+1;return m;},{})).sort((a,b)=>b[1]-a[1]);
  console.log(`\n${result.counts.unique} unique candidates (${result.counts.flaggedDuplicates} flagged as possible duplicates).`);
  console.log('By template hint: '+by('templateHint').map(([k,v])=>`${k} ${v}`).join(', '));
  console.log('Review flags: '+(by('flags').map(([k,v])=>`${k} ${v}`).join(', ')||'none'));
  console.log('Saved: '+join(out,'candidates.json'));
  console.log('Import for review (Command Center → Leads → Import): '+files.map(f=>join(out,f)).join(', '));
  console.log('These are NOT verified businesses. Nothing was written to the CRM.');
 }catch(e){console.error('Overture discovery stopped: '+(e instanceof Error?e.message:String(e)));process.exitCode=1;}
}
