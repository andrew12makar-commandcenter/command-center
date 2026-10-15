import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DuckDBInstance} from '@duckdb/node-api';
import {latestReleaseFromCatalog,buildPlacesQuery,placesPath} from '../lib/overture-places.ts';
import {selectAreas,validBBox,DISCOVERY_AREAS} from '../lib/discovery-regions.ts';
import {runDiscovery,writeOutputs,parseArgs} from '../scripts/overture-discovery.mjs';

test('latest release comes from the catalog, ignoring betas and malformed ids',()=>{
 const catalog={links:[{rel:'root',href:'./catalog.json'},{rel:'child',href:'./2026-08-20.0/catalog.json'},
  {rel:'child',href:'./2026-09-17.1/catalog.json'},{rel:'child',href:'./2026-09-17.0/catalog.json'},
  {rel:'child',href:'./2026-10-15-beta.0/catalog.json'},{rel:'child',href:'./junk/catalog.json'}]};
 assert.equal(latestReleaseFromCatalog(catalog),'2026-09-17.1');
 assert.equal(latestReleaseFromCatalog({latest:'2026-09-17.1',links:[]}),'2026-09-17.1');
 assert.throws(()=>latestReleaseFromCatalog({links:[]}),/--release/);
 assert.throws(()=>placesPath("2026'; DROP"),/Invalid/);
});

test('query adapts to schema drift and stays bounded',()=>{
 const box=DISCOVERY_AREAS[0].bbox;
 const old=buildPlacesQuery('x.parquet',box,['id','names','bbox','categories','confidence'],{limit:99999,minConfidence:2});
 assert.match(old,/categories/);assert.doesNotMatch(old,/basic_category|operating_status/);
 assert.match(old,/LIMIT 5000$/);assert.match(old,/confidence >= 1/);
 const next=buildPlacesQuery("it's.parquet",box,['id','names','bbox','basic_category','taxonomy','operating_status'],{limit:10,minConfidence:0.5});
 assert.match(next,/basic_category, taxonomy/);assert.match(next,/permanently_closed/);assert.match(next,/'it''s\.parquet'/);
 assert.throws(()=>buildPlacesQuery('x',box,['id','bbox'],{limit:1,minConfidence:0}),/names/);
});

test('areas are configurable rings with bounded boxes',()=>{
 assert.ok(DISCOVERY_AREAS.every(a=>validBBox(a.bbox)),'all boxes valid and bounded');
 assert.deepEqual(selectAreas({}).map(a=>a.id),['allston','brighton','brookline']);
 assert.ok(selectAreas({ring:2}).some(a=>a.id==='somerville'));
 assert.throws(()=>selectAreas({areas:['mars']}),/Unknown/);
 assert.throws(()=>parseArgs(['--limit','0']),/limit/);
});

async function fixture(path){
 const db=await DuckDBInstance.create(':memory:');const c=await db.connect();
 const row=(id,name,lon,lat,{cat='dentist',conf=0.9,phone='+16175550100',site=null,street=null,city='Brighton',zip='02135',status='open'}={})=>
  `SELECT '${id}' AS id, {'primary':'${name.replace(/'/g,"''")}'} AS names, {'primary':${cat?`'${cat}'`:'NULL'},'alternate':[]::VARCHAR[]} AS categories,
   ${conf} AS confidence, ${site?`['${site}']`:'[]::VARCHAR[]'} AS websites, ['${phone}'] AS phones,
   [{'freeform':${street===null?`'${id.charCodeAt(0)} Example St'`:street?`'${street}'`:'NULL'},'locality':'${city}','postcode':'${zip}','region':'MA','country':'US'}] AS addresses,
   {'xmin':${lon},'xmax':${lon},'ymin':${lat},'ymax':${lat}} AS bbox, [{'dataset':'meta','record_id':'r${id}','update_time':'2026-07-01'}] AS sources,
   '${status}' AS operating_status`;
 const rows=[
  row('a','Harbor Dental',-71.15,42.35,{site:'https://harbordental.example.org'}),
  // Same practice from another dataset: different id, 20 m away, same phone.
  row('b','Harbor Dental Studio',-71.1502,42.3501,{site:'https://www.harbordental.example.org/'}),
  // Franchise with the same name across town: name alone must not merge.
  row('c','Harbor Dental',-71.12,42.31,{phone:'+16175559999',city:'Brookline',zip:'02446'}),
  row('d','Fenway Flow Plumbing',-71.13,42.355,{cat:'plumbing',street:'',city:'Allston',zip:'02134',phone:'+16175550123'}),
  row('e','Closed Cafe',-71.15,42.352,{cat:'cafe',status:'permanently_closed'}),
  row('f','=HYPERLINK("x")',-71.151,42.349,{cat:'restaurant',conf:0.7,phone:'+16175550777'}),
  row('g','Low Confidence Shop',-71.16,42.34,{cat:'retail',conf:0.3}),
  row('h','Far Away Inc',-70.5,41.9,{cat:'retail'}),
  // Inside the Allston box but a Cambridge postcode: must not count as Allston.
  row('i','Harvard Square Cafe',-71.12,42.371,{cat:'cafe',city:'Cambridge',zip:'02138',phone:'+16175550888'}),
  // Not a prospect even though it is a mapped place.
  row('j','Ringer Park',-71.14,42.352,{cat:'park',phone:'+16175550999'}),
  // Leading zero dropped by a source.
  row('k','Brighton Tailor',-71.155,42.35,{cat:'tailor',zip:'2135',phone:'+16175550444'}),
  // Same chain, two far-apart branches: a branch, not a duplicate.
  row('l','Citizens Bank',-71.155,42.348,{cat:'bank',site:'https://www.citizensbank.com/',phone:'+16175551111',street:'414 Washington St'}),
  row('m','Citizens Bank',-71.125,42.355,{cat:'bank',site:'https://www.citizensbank.com/',phone:'+16175552222',street:'200 Harvard Ave',city:'Allston',zip:'02134'})
 ];
 await c.run(`COPY (${rows.join(' UNION ALL ')}) TO '${path}' (FORMAT parquet)`);
 c.closeSync?.();
}

test('end to end against an Overture-shaped parquet: bounded, attributed, flagged, never merged',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'overture-test-'));
 try{
  const file=join(dir,'places.parquet');await fixture(file);
  const result=await runDiscovery({areas:['allston','brighton','brookline'],ring:null,limit:50,minConfidence:0.6,release:'2026-09-17.0',source:file},()=>{});
  const ids=result.candidates.map(c=>c.externalId).sort();
  assert.deepEqual(ids,['a','b','c','d','f','k','l','m'],'closed, low-confidence, non-prospect and out-of-postcode records are excluded');
  assert.equal(result.counts.excludedOutsideAreaOrNonProspect>=2,true);
  assert.equal(result.candidates.find(c=>c.externalId==='k').postcode,'02135');
  const l=result.candidates.find(c=>c.externalId==='l');
  assert.deepEqual(l.possibleDuplicateOf,[],'chain branches are not duplicates');
  assert.ok(l.flags.includes('multi_location_business'));
  assert.ok(result.candidates.indexOf(l)>result.candidates.findIndex(c=>c.externalId==='a'),'independent businesses are listed before chain branches');
  const a=result.candidates.find(c=>c.externalId==='a');
  assert.ok(a.areas.includes('brighton'));
  assert.equal(a.templateHint,'medical');
  assert.equal(a.release,'2026-09-17.0');
  assert.match(a.possibleDuplicateOf.join(),/^b \(/,'same phone + website + proximity is flagged');
  assert.ok(!a.possibleDuplicateOf.some(x=>x.startsWith('c')),'same name far away is not flagged');
  const d=result.candidates.find(c=>c.externalId==='d');
  assert.ok(d.flags.includes('no_street_address_possible_service_area_business'));
  assert.equal(d.templateHint,'universal','plumbing uses the trade-safe general layout, not outdoor landscaping');
  assert.equal(result.status,'unverified_discovery_candidates');
  const files=await writeOutputs(result,join(dir,'out'));
  const csv=await readFile(join(dir,'out',files[0]),'utf8');
  assert.match(csv.split('\n')[0],/^name,city,category,website,phone,source_url,source_type,external_id,street,postcode/);
  assert.match(csv,/"'=HYPERLINK\(""x""\)"/,'formula injection neutralized');
  assert.match(csv,/overture_maps_places/);
  assert.match(csv,/Overture Maps Foundation release 2026-09-17\.0/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('remote runs download the area envelope once into a local cache and reuse it',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'overture-cache-'));
 try{
  const file=join(dir,'remote.parquet');await fixture(file);
  const logs=[];const opts={areas:['allston','brighton','brookline'],ring:null,limit:50,minConfidence:0.6,release:'2026-09-23.1',
   source:null,remoteOverride:file,cacheDir:join(dir,'cache'),cache:true};
  const first=await runDiscovery(opts,m=>logs.push(m));
  assert.ok(logs.some(l=>/Downloading map data/.test(l)));
  logs.length=0;
  const second=await runDiscovery(opts,m=>logs.push(m));
  assert.ok(logs.some(l=>/Using local copy/.test(l)));
  assert.deepEqual(second.candidates.map(c=>c.externalId).sort(),first.candidates.map(c=>c.externalId).sort());
  assert.ok(first.candidates.some(c=>c.externalId==='a'));
  assert.ok(!first.candidates.some(c=>c.externalId==='j'),'non-prospects are also filtered out of the cache');
 }finally{await rm(dir,{recursive:true,force:true});}
});
