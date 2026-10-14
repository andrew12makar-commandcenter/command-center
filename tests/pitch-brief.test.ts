import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPitchBrief,type PitchInput} from '../lib/pitch-brief.ts';
import {qualifyProspect} from '../lib/prospect-qualification.ts';
import {buildSalesBrief} from '../lib/sales-brief.ts';

const input=(u:Partial<PitchInput>={},qa:Parameters<typeof qualifyProspect>[0]['audit']=null,extra:Record<string,unknown>={}):PitchInput=>{
 const business={name:'Allston Yard Care',category:'craft: gardener',street_address:'100 Cambridge St',city:'Boston',state:'MA',postal_code:'02134',
  website_url:null,google_business_url:null,verification_status:'pending',operational_status:'unknown',contact_name:null,service_area:null,...extra};
 const q=qualifyProspect({name:business.name,category:business.category,city:business.city,street:business.street_address,postcode:business.postal_code,
  websiteUrl:business.website_url as string|null,profileUrl:'https://facebook.com/yard',gbpUrl:null,sourceUrl:'https://www.openstreetmap.org/node/9',
  sourceType:'openstreetmap',phone:'617',email:null,contactName:null,serviceAreaEvidence:null,locationCount:null,
  triageStatus:'shortlisted',imported:true,duplicateWarning:false,audit:qa,targetService:'website_design'});
 return {business:business as PitchInput['business'],campaign:{name:'Allston landscapers',target_service:'website_design',target_area:'Allston',target_industry:'Home'},
  q,sales:buildSalesBrief(business.name,null),auditUrl:null,
  sources:[{url:'https://www.openstreetmap.org/node/9',label:'openstreetmap'},{url:'javascript:alert(1)',label:'bad'}],
  demoUrl:null,generatedAt:'2026-10-14T12:00:00Z',...u};
};
test('pitch brief is evidence-bounded and lists claims that must not be made',()=>{
 const b=buildPitchBrief(input());
 assert.equal(b.locationVerified,false);
 assert.match(b.location,/not verified/);
 assert.match(b.opportunity,/Website design/);
 assert.match(b.openingOffer,/website they control/);
 assert.ok(b.doNotClaim.some(x=>/no website/.test(x)));
 assert.ok(b.doNotClaim.some(x=>/no Google Business Profile/.test(x)));
 assert.ok(b.doNotClaim.some(x=>/revenue, traffic, rankings/.test(x)));
 assert.ok(b.unknowns.some(x=>/decision maker/.test(x)));
 assert.deepEqual(b.sources.map(s=>s.url),['https://www.openstreetmap.org/node/9'],'unsafe URLs are dropped');
});
test('markdown is copyable and contains every required section',()=>{
 const m=buildPitchBrief(input({demoUrl:'/app/demos/abc'})).markdown;
 for(const h of ['Recommended opening offer','Verify before contacting','Score breakdown','Supporting evidence','Important unknowns','Website audit summary','Existing links','Website demo','Claims that must not be made','Sources'])
  assert.match(m,new RegExp('## '+h));
 assert.match(m,/Campaign:\*\* Allston landscapers/);
 assert.match(m,/Internal demo draft: \/app\/demos\/abc/);
 assert.doesNotMatch(m.replace(/## Claims that must not be made[\s\S]*?## Sources/,'').replace(/not a revenue estimate/g,''),/\b(revenue|traffic|ranking)\b/i);
});
test('verified, measured business has fewer unknowns and keeps recorded links',()=>{
 const b=buildPitchBrief(input({},null,{website_url:'https://yard.example/',google_business_url:'https://maps.google.com/?cid=4',verification_status:'verified',operational_status:'operating'}));
 assert.equal(b.locationVerified,true);
 assert.deepEqual(b.links.map(l=>l.label),['Website','Google Business Profile']);
 assert.ok(!b.unknowns.some(x=>/currently operating/.test(x)));
});

test('location is not repeated when the street already holds the full address',()=>{
 const b=buildPitchBrief(input({},null,{street_address:'72 Saybrook Street, #3, Boston, MA 02135',city:'Boston',state:'MA',postal_code:'02135'}));
 assert.equal(b.location,'72 Saybrook Street, #3, Boston, MA 02135 (as recorded; not verified)');
 assert.match(b.score,/^\d+\/100$/);
 assert.ok(b.verifyFirst.length>0);
});

test('pitch brief clearly distinguishes Maps searches from specific listing links',()=>{
 const b=buildPitchBrief(input({},null,{google_business_url:'https://www.google.com/maps/search/?api=1&query=Allston+Yard+Care'}));
 assert.equal(b.links[0]?.label,'Google Maps search (listing unverified)');
 assert.ok(b.doNotClaim.some(x=>/search, not an exact business listing/.test(x)));
 assert.ok(!b.links.some(x=>x.label==='Google Business Profile'));
});
