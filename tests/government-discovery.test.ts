import test from 'node:test';
import assert from 'node:assert/strict';
import { bostonProjectedToWgs84, BRIGHTON_CENTER_ORIGIN, distanceMiles, mapBostonGovernmentCsv } from '../lib/government-discovery.ts';
import { serializeGovernmentCandidatesCsv } from '../lib/government-discovery-export.ts';

test('Boston State Plane coordinates are transformed locally into plausible WGS84 coordinates',()=>{
 const point=bostonProjectedToWgs84(745815.0952417254,2953188.1716369838);
 assert.ok(point);
 assert.ok(Math.abs(point.lat-42.351221)<0.001);
 assert.ok(Math.abs(point.lon+71.16835)<0.001);
 assert.ok(distanceMiles(BRIGHTON_CENTER_ORIGIN,point)<1.5);
});

test('government source filtering keeps only Brighton ZIP records and strips contact fields',()=>{
 const csv='businessname,dbaname,address,city,zip,licensecat,licstatus,latitude,longitude,ownername,phone\n'+
  'Legal LLC,Corner Cafe,123 Market St,Boston,02135,Restaurant,Active,42.35,-71.15,Private Person,6175550100\n'+
  'Elsewhere LLC,Other Shop,9 Main St,Boston,02116,Restaurant,Active,42.35,-71.15,Private Person,6175550100\n'+
  ',,No Name St,Boston,02135,Restaurant,Active,42.35,-71.15,Private Person,6175550100\n';
 const records=mapBostonGovernmentCsv('active-food-establishment-licenses',csv,'https://data.boston.gov/download.csv','2026-10-15T00:00:00.000Z');
 assert.equal(records.length,1);
 assert.equal(records[0].name,'Corner Cafe');
 assert.equal(records[0].legal_name,'Legal LLC');
 assert.equal(records[0].zip,'02135');
 assert.ok(records[0].distance_miles!==null);
 assert.equal(JSON.stringify(records).includes('Private Person'),false);
 assert.equal(JSON.stringify(records).includes('6175550100'),false);
});

test('Licensing Board coordinates are projected, sorted nearest first, and duplicates are flagged without merging',()=>{
 const csv='businessname,address,city,zip,licensenum,licensetype,status,gpsx,gpsy,managername\n'+
  'Far Shop,100 Main St,Boston,02135,LIC-2,Retail,Active,770000,2953000,Private Person\n'+
  'Near Shop,20 Market St,Boston,02135,LIC-1,Retail,Active,745815.0952417254,2953188.1716369838,Private Person\n'+
  'Near Shop,20 Market St,Boston,02135,LIC-3,Retail,Active,745815.0952417254,2953188.1716369838,Private Person\n';
 const records=mapBostonGovernmentCsv('licensing-board-licenses',csv,'https://data.boston.gov/download.csv','2026-10-15T00:00:00.000Z');
 assert.deepEqual(records.map(x=>x.name),['Near Shop','Near Shop','Far Shop']);
 assert.equal(new Set(records.map(x=>x.candidate_id)).size,records.length);
 assert.ok(records[0].possible_duplicate_ids.length>0);
 assert.ok(records[1].possible_duplicate_ids.length>0);
 assert.equal(records[0].location_status,'matched_coordinate');
 assert.equal(JSON.stringify(records).includes('Private Person'),false);
});

test('CSV export preserves source attribution and distance but contains no personal contact fields',()=>{
 const csv='businessname,dbaname,address,city,zip,licensecat,licstatus,latitude,longitude,ownername,phone\n'+
  'Legal LLC,"Cafe, North",123 Market St,Boston,02135,Restaurant,Active,42.35,-71.15,Private Person,6175550100\n';
 const rows=mapBostonGovernmentCsv('active-food-establishment-licenses',csv,'https://data.boston.gov/download.csv','2026-10-15T00:00:00.000Z');
 const exported=serializeGovernmentCandidatesCsv(rows);
 assert.match(exported,/"Cafe, North"/);
 assert.match(exported,/source_url/);
 assert.match(exported,/candidate_id/);
 assert.match(exported,/straight_line_miles_from_brighton_center/);
 assert.equal(exported.includes('Private Person'),false);
 assert.equal(exported.includes('6175550100'),false);
});
