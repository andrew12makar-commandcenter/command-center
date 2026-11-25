import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreOpportunity,sortOpportunities,type OpportunityBusiness,type AuditRecord} from '../lib/opportunity-board.ts';

const now=new Date('2026-10-10T20:00:00Z');
const lead=(updates:Partial<OpportunityBusiness>={}):OpportunityBusiness=>({
 id:'business-1',name:'Brighton Dental Associates',category:'amenity: dentist',
 city:'Brighton',service_area:null,website_url:'https://dental.example/',
 verification_status:'pending',operational_status:'unknown',pipeline_status:'not_contacted',
 priority_score:null,phone:null,contact_email:null,...updates
});
const report=(updates:Partial<AuditRecord>={}):AuditRecord=>({
 business_id:'business-1',website_url:'https://dental.example/',
 status:'verified_gaps',assessed_at:'2026-10-09T20:00:00Z',
 findings:{technical_opportunity_score:64},...updates
});
test('a PageSpeed problem alone does not make unverified business outreach ready',()=>{
 const item=scoreOpportunity(lead(),[report()],now);
 assert.equal(item.stage,'verify_business');
 assert.equal(item.technicalScore,64);
 assert.equal(item.verified,false);
});
test('verified operating business with measured gaps enters review queue',()=>{
 const item=scoreOpportunity(lead({verification_status:'verified',operational_status:'operating'}),[report()],now);
 assert.equal(item.stage,'technical_review');
 assert.equal(item.measuredAt,'2026-10-09T20:00:00Z');
});
test('a website not recorded is an unknown, not a bad website',()=>{
 const item=scoreOpportunity(lead({website_url:null}),[report()],now);
 assert.equal(item.stage,'research_website');
 assert.equal(item.technicalScore,null);
});
test('stale audit does not supply an opportunity score',()=>{
 const item=scoreOpportunity(lead(),[report({assessed_at:'2026-02-01T20:00:00Z'})],now);
 assert.equal(item.stage,'audit_website');
 assert.equal(item.technicalScore,null);
});
test('audit for another website or path is not reused',()=>{
 for(const website_url of ['https://different.example','https://dental.example/new-page']){
  const item=scoreOpportunity(lead({website_url}),[report()],now);
  assert.equal(item.stage,'audit_website');
 }
});
test('incomplete audit evidence remains inconclusive, with no technical score',()=>{
 const item=scoreOpportunity(lead(),[report({findings:{technical_opportunity_score:null}})],now);
 assert.equal(item.stage,'inconclusive');
 assert.equal(item.technicalScore,null);
});
test('a newer inconclusive report overrides a previous gap, rather than cherry-picking',()=>{
 const item=scoreOpportunity(lead(),[
  report({assessed_at:'2026-10-08T20:00:00Z'}),
  report({status:'inconclusive',assessed_at:'2026-10-09T20:00:00Z',findings:{}})
 ],now);
 assert.equal(item.stage,'inconclusive');
});
test('clean audit does not get labeled verified technical gap',()=>{
 const item=scoreOpportunity(lead({verification_status:'verified',operational_status:'operating'}),[
  report({status:'no_gaps',findings:{technical_opportunity_score:1}})
 ],now);
 assert.equal(item.stage,'no_measured_gaps');
 assert.equal(item.technicalScore,null);
});
test('opportunity ordering prefers verified technical review over unverified and unknown',()=>{
 const first=scoreOpportunity(lead({id:'a',verification_status:'verified',operational_status:'operating'}),[
  report({business_id:'a'})
 ],now);
 const second=scoreOpportunity(lead({id:'b',name:'ABC Corp',category:null,website_url:null}),[],now);
 const third=scoreOpportunity(lead({id:'c'}),[report({business_id:'c'})],now);
 const sorted=sortOpportunities([second,third,first]);
 assert.deepEqual(sorted.map(x=>x.business.id),['a','c','b']);
});

test('closed, won, and lost businesses are not active prospect opportunities',()=>{
 const changes:Partial<OpportunityBusiness>[]=[
  {operational_status:'closed',verification_status:'verified'},
  {pipeline_status:'won',verification_status:'verified',operational_status:'operating'},
  {pipeline_status:'lost',verification_status:'verified',operational_status:'operating'}
 ];
 for(const change of changes){
  const item=scoreOpportunity(lead(change),[report()],now);
  assert.equal(item.stage,'inactive');
 }
});

test('locally uploaded Lighthouse evidence needs review even when business verified',()=>{
 const item=scoreOpportunity(lead({verification_status:'verified',operational_status:'operating'}),[
  report({findings:{technical_opportunity_score:75,source_method:'local_lighthouse_upload'}})
 ],now);
 assert.equal(item.stage,'verify_business');
 assert.match(item.reason,/operator-uploaded/i);
 assert.equal(item.technicalScore,75);
});
