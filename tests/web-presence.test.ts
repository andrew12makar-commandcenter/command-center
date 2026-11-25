import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyWebPresence,independentWebsite,discoveredProfile,validateBusinessWebsite} from '../lib/web-presence.ts';
import {publicWebsite} from '../lib/website-intelligence.ts';
import {scoreOpportunity,type OpportunityBusiness} from '../lib/opportunity-board.ts';
import {parseOsm,mapBostonCsv} from '../lib/discovery.ts';

const base:OpportunityBusiness={
 id:'123',name:'Zscapes Outdoor Services',category:'Landscaping',city:null,service_area:null,
 website_url:'https://www.instagram.com/zscapesoutdoorservices/',
 verification_status:'unverified',operational_status:'unknown',pipeline_status:'not_contacted',
 priority_score:null,phone:null,contact_email:null
};
test('Instagram is social evidence, not an independent website',()=>{
 const presence=classifyWebPresence(base.website_url);
 assert.equal(presence.kind,'social');
 assert.equal(presence.provider,'Instagram');
 assert.equal(independentWebsite(base.website_url),null);
 assert.equal(scoreOpportunity(base,[]).stage,'research_website');
});
test('cannot audit Instagram, Facebook or a Google Maps listing as company site',()=>{
 const profiles=['https://instagram.com/brand','https://m.facebook.com/brand',
   'https://maps.google.com/?cid=123','https://www.google.com/maps/place/brand',
   'https://g.page/brand'];
 for(const url of profiles){
  assert.equal(independentWebsite(url),null);
  assert.throws(()=>publicWebsite(url),/not first-party business websites/);
  assert.throws(()=>validateBusinessWebsite(url),/not a business website/);
 }
});
test('third-party ordering pages stay separate from independent websites',()=>{
 const url='https://order.toasttab.com/online/nakhon-brighton';
 assert.equal(classifyWebPresence(url).kind,'ordering');
 assert.equal(classifyWebPresence(url).provider,'Toast ordering');
 assert.equal(independentWebsite(url),null);
 assert.throws(()=>publicWebsite(url),/not first-party business websites/);
 assert.throws(()=>validateBusinessWebsite(url),/third-party ordering evidence/);
});
test('independent domains remain auditable; avoid suffix false positives',()=>{
 const valid=['https://www.example.org/','https://instagram.com.evil.example.org/',
  'https://brand.wixsite.com/home','https://clinic.example.org/'];
 for(const url of valid){
  assert.equal(classifyWebPresence(url).kind,'website');
  assert.ok(independentWebsite(url));
 }
});
test('missing website is unknown, not proof of missing business presence',()=>{
 assert.equal(classifyWebPresence(null).kind,'none');
 assert.equal(scoreOpportunity({...base,website_url:null},[]).stage,'research_website');
 assert.equal(classifyWebPresence('http://localhost:3000').kind,'invalid');
});
test('staged social evidence survives website separation',()=>{
 const value='https://www.instagram.com/zscapesoutdoorservices/';
 assert.equal(discoveredProfile({discovered_social_profile_url:value},null),value);
 assert.equal(discoveredProfile(null,value),value);
 const order='https://order.toasttab.com/online/nakhon-brighton';
 assert.equal(discoveredProfile({third_party_urls:order},null),order);
});
test('OpenStreetMap preserves Instagram link but leaves official site empty',()=>{
 const records=parseOsm([{type:'node',id:101,tags:{name:'Zscapes Outdoor Services',
  craft:'landscaper',website:'https://www.instagram.com/zscapesoutdoorservices/'}}],'brighton');
 assert.equal(records.length,1);
 assert.equal(records[0].website_url,'');
 assert.match(records[0].raw_data.discovered_social_profile_url,/instagram\.com/);
 assert.match(records[0].source_url,/openstreetmap\.org/);
});
test('Boston public data treats Facebook as profile, not business website',()=>{
 const csv='Business Name,Zip,Website,Industry\nABC Landscaping,02135,https://facebook.com/abc,Landscaping';
 const records=mapBostonCsv(csv,'https://data.boston.gov/example.csv','boston-certified','brighton');
 assert.equal(records.length,1);
 assert.equal(records[0].website_url,'');
 assert.equal(records[0].raw_data.discovered_social_profile_url,'https://facebook.com/abc');
});
test('OpenStreetMap preserves real independent company websites',()=>{
 const records=parseOsm([{type:'node',id:102,tags:{name:'ABC Dental',
  amenity:'dentist',website:'https://abcdental.example.org/'}}],'brighton');
 assert.equal(records[0].website_url,'https://abcdental.example.org/');
 assert.equal(records[0].raw_data.discovered_social_profile_url,undefined);
});
