import assert from 'node:assert/strict';
import test from 'node:test';
import {parseOsm,mapBostonCsv,uniqueCandidates} from '../lib/discovery.ts';
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
