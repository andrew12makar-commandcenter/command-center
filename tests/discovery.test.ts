import assert from 'node:assert/strict';
import test from 'node:test';
import {parseOsm,mapBostonCsv,uniqueCandidates,osmQuery,queryOsm} from '../lib/discovery.ts';
test('OSM preserves exact link and evidence without asserting verification',()=>{
 const r=parseOsm([{type:'node',id:42,lat:42.35,lon:-71.12,tags:{name:'Example Roofing',craft:'roofer','addr:city':'Boston',website:'https://roofing.example'}}],'allston');
 assert.equal(r.length,1);assert.equal(r[0].source_url,'https://www.openstreetmap.org/node/42');
 assert.equal(r[0].raw_data.provider,'OpenStreetMap contributors');assert.equal(r[0].category,'craft: roofer');
});
test('OSM duplicates and vacant shops excluded',()=>{
 const r=parseOsm([{type:'node',id:5,tags:{name:'Shop',shop:'hardware'}},{type:'node',id:5,tags:{name:'Shop',shop:'hardware'}},{type:'node',id:6,tags:{name:'Empty',shop:'vacant'}}],'allston');
 assert.equal(r.length,1);
});
test('City source maps ZIP and preserves origin',()=>{
 const csv='Business Name,Zip,Website\nYard Company,02135,https://yard.example\nAnother,02121,\nAllston Pro,02134,';
 const r=mapBostonCsv(csv,'https://data.boston.gov/sample.csv','boston-certified','brighton');
 assert.equal(r.length,1);assert.equal(r[0].name,'Yard Company');assert.equal(r[0].raw_data.postcode,'02135');
 assert.equal(mapBostonCsv(csv,'https://data.boston.gov/sample.csv','boston-certified','allston').length,1);
});
test('distinct sources do not silently collapse',()=>{
 const x={name:'Same',city:'Boston',category:'shop',website_url:'',phone:'',source_url:'https://www.openstreetmap.org/node/9',source_type:'osm',external_id:'node/9',raw_data:{}};
 assert.equal(uniqueCandidates([x,{...x,source_type:'boston-food',external_id:'other'}]).length,2);
});

test('OSM query is bounded geographically, capped and cheaper on fallback',()=>{
 const initial=osmQuery('brighton'),backup=osmQuery('brighton',true);
 assert.match(initial,/\[timeout:12\]/);
 assert.match(initial,/out center 180;/);
 assert.match(backup,/node\["name"\]\["shop"\]/);
 assert.match(backup,/out center 90;/);
 assert.doesNotMatch(backup,/around:/);
 assert.ok(!backup.includes('nwr['));
});
test('HTTP 504 switches to a smaller second query at backup provider',async()=>{
 const called:{url:string;body:string}[]=[];
 const mock:typeof fetch=async (url,init)=>{
  called.push({url:String(url),body:String(init?.body??'')});
  if(called.length===1)return new Response('gateway timeout',{status:504});
  return new Response(JSON.stringify({elements:[{type:'node',id:109,tags:{name:'Brighton Bakery',shop:'bakery'}}]}),{status:200});
 };
 const rows=await queryOsm('brighton',mock);
 assert.equal(called.length,2);
 assert.match(called[0].url,/private\.coffee/);
 assert.match(called[1].url,/overpass-api\.de/);
 assert.ok(called[0].body.includes('out+center+180'));
 assert.ok(called[1].body.includes('out+center+90'));
 assert.equal(rows[0]?.name,'Brighton Bakery');
});
test('rate-limit response stops without trying to bypass it',async()=>{
 let count=0;
 const mock:typeof fetch=async ()=>{count++;return new Response('slow down',{status:429});};
 await assert.rejects(queryOsm('allston',mock),/rate limiting requests/);
 assert.equal(count,1);
});
test('two 504s report failure instead of staging fake data',async()=>{
 let count=0;
 const mock:typeof fetch=async ()=>{count++;return new Response('timeout',{status:504});};
 await assert.rejects(queryOsm('brookline',mock),/Both OpenStreetMap servers could not complete/);
 assert.equal(count,2);
});
