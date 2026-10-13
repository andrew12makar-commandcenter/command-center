import test from 'node:test';
import assert from 'node:assert/strict';
import {qualifyProspect,qualifyStagedRow,qualifyBusiness,serviceAreaEvidence,auditSummary,type QualificationInput} from '../lib/prospect-qualification.ts';

const base=(u:Partial<QualificationInput>={}):QualificationInput=>({
 name:'Brighton Dental Associates',category:'amenity: dentist',city:'Boston',street:'12 Market St',postcode:'02135',
 websiteUrl:null,profileUrl:null,gbpUrl:null,sourceUrl:'https://www.openstreetmap.org/node/1',sourceType:'openstreetmap',
 phone:'617-555-0100',email:null,contactName:null,serviceAreaEvidence:null,locationCount:null,
 triageStatus:'review_needed',imported:false,duplicateWarning:false,audit:null,targetService:null,...u
});
const BANNED=/\b(budget|revenue|traffic|ranking|rankings|probability|contract value|\$\d)/i;

test('missing website means find or confirm a website, never proof of no website',()=>{
 const q=qualifyProspect(base({street:null}));
 assert.equal(q.websitePresence,'none_recorded');
 assert.notEqual(q.primaryOpportunity,'website_design');
 assert.equal(q.nextAction,'find_official_website');
 assert.match(q.reasons.join(' '),/not (prove|proof)/i);
});
test('missing GBP link means confirm GBP, never proof of no GBP',()=>{
 const q=qualifyProspect(base({targetService:'gbp'}));
 assert.equal(q.gbpStatus,'unconfirmed');
 assert.equal(q.primaryOpportunity,'gbp');
 assert.equal(q.opportunityStrength,'moderate');
 assert.equal(q.nextAction,'confirm_gbp');
 assert.match(q.rationale,/does not prove there is no GBP/);
});
test('social-only presence justifies website research but is not strong evidence',()=>{
 const q=qualifyProspect(base({street:null,profileUrl:'https://www.instagram.com/brightondental'}));
 assert.equal(q.websitePresence,'social_only');
 assert.equal(q.primaryOpportunity,'website_design');
 assert.equal(q.opportunityStrength,'moderate');
 assert.equal(q.nextAction,'find_official_website');
 assert.match(q.rationale,/does not prove/);
});
test('a social URL in the website field is not treated as an official site',()=>{
 const q=qualifyProspect(base({websiteUrl:'https://facebook.com/somebiz'}));
 assert.equal(q.websitePresence,'social_only');
});
test('inconclusive audits are not verified problems',()=>{
 const q=qualifyProspect(base({street:null,websiteUrl:'https://dental.example/',audit:{status:'inconclusive',performanceScore:20,seoScore:40,operatorSupplied:false}}));
 assert.equal(q.primaryOpportunity,'unknown');
 assert.equal(q.opportunityStrength,'unknown');
 assert.equal(q.nextAction,'inspect_website');
});
test('measured performance gap on a recorded site is a strong website-design opportunity',()=>{
 const q=qualifyProspect(base({websiteUrl:'https://dental.example/',audit:{status:'verified_gaps',performanceScore:31,seoScore:92,operatorSupplied:false}}));
 assert.equal(q.primaryOpportunity,'website_design');
 assert.equal(q.opportunityStrength,'strong');
 assert.equal(q.isPriorityLead,true);
 assert.equal(q.nextAction,'find_decision_maker');
 assert.match(q.rationale,/31\/100/);
});
test('operator-uploaded evidence is capped at moderate',()=>{
 const q=qualifyProspect(base({websiteUrl:'https://dental.example/',audit:{status:'verified_gaps',performanceScore:31,seoScore:92,operatorSupplied:true}}));
 assert.equal(q.opportunityStrength,'moderate');
});
test('measured SEO gap yields local SEO',()=>{
 const q=qualifyProspect(base({websiteUrl:'https://dental.example/',gbpUrl:'https://maps.google.com/?cid=1',audit:{status:'verified_gaps',performanceScore:88,seoScore:62,operatorSupplied:false}}));
 assert.equal(q.primaryOpportunity,'local_seo');
 assert.equal(q.opportunityStrength,'strong');
});
test('geolocation requires real location or service-area evidence',()=>{
 const none=qualifyProspect(base({websiteUrl:'https://dental.example/',targetService:'geolocation_pages'}));
 assert.notEqual(none.primaryOpportunity,'geolocation_pages');
 const ok=qualifyProspect(base({websiteUrl:'https://dental.example/',gbpUrl:'https://maps.google.com/?cid=1',targetService:'geolocation_pages',serviceAreaEvidence:'Newton, Watertown, Waltham'}));
 assert.equal(ok.primaryOpportunity,'geolocation_pages');
 assert.equal(ok.nextAction,'inspect_location_pages');
 assert.equal(serviceAreaEvidence('Brighton'),null,'a discovery scan area is not service-area evidence');
 assert.equal(serviceAreaEvidence('Mystic Valley','Mystic Valley'),null);
 assert.equal(serviceAreaEvidence('Newton and Wellesley'),'Newton and Wellesley');
});
test('closed, won, lost and disqualified records are never priority leads',()=>{
 for(const u of [{operationalStatus:'closed'},{pipelineStatus:'won'},{pipelineStatus:'lost'},
   {triageStatus:'disqualified' as const,disqualificationReason:'Permanently closed per city license record'}]){
  const q=qualifyProspect(base({websiteUrl:'https://dental.example/',audit:{status:'verified_gaps',performanceScore:20,seoScore:50,operatorSupplied:false},...u}));
  assert.equal(q.isPriorityLead,false,JSON.stringify(u));
  assert.equal(q.primaryOpportunity,'no_clear_opportunity');
  assert.equal(q.nextAction,'none');
  assert.ok(q.excludedReason);
 }
 const d=qualifyProspect(base({triageStatus:'disqualified',disqualificationReason:'Permanently closed per city license record'}));
 assert.match(d.rationale,/Permanently closed per city license record/);
});
test('held records are not priority and next action is hold',()=>{
 const q=qualifyProspect(base({triageStatus:'held',profileUrl:'https://instagram.com/x'}));
 assert.equal(q.nextAction,'hold');assert.equal(q.isPriorityLead,false);assert.equal(q.researchStatus,'held');
});
test('audited site with no gaps and recorded GBP has no clear opportunity',()=>{
 const q=qualifyProspect(base({websiteUrl:'https://dental.example/',gbpUrl:'https://g.page/x',audit:{status:'no_gaps',performanceScore:90,seoScore:95,operatorSupplied:false}}));
 assert.equal(q.primaryOpportunity,'no_clear_opportunity');assert.equal(q.nextAction,'hold');
});
test('duplicates and missing sources route to business verification',()=>{
 assert.equal(qualifyProspect(base({duplicateWarning:true,profileUrl:'https://instagram.com/x'})).nextAction,'verify_business');
 assert.equal(qualifyProspect(base({sourceUrl:null,profileUrl:'https://instagram.com/x'})).nextAction,'verify_business');
});
test('evidence confidence counts recorded, checkable evidence only',()=>{
 assert.equal(qualifyProspect(base({sourceUrl:null,street:null,postcode:null,category:null,name:'Zed'})).evidenceConfidence,'unknown');
 assert.equal(qualifyProspect(base({sourceUrl:null,street:null,postcode:null,category:null,name:'Zed',sourceType:null})).evidenceConfidence,'unknown');
 assert.equal(qualifyProspect(base()).evidenceConfidence,'medium');
 assert.equal(qualifyProspect(base({sourceType:'boston-certified',verificationStatus:'verified',operationalStatus:'operating'})).evidenceConfidence,'high');
 assert.equal(qualifyProspect(base({sourceType:'boston-certified',verificationStatus:'verified',operationalStatus:'operating',duplicateWarning:true})).evidenceConfidence,'medium');
});
test('contact readiness',()=>{
 assert.equal(qualifyProspect(base({contactName:'Dr. Lee'})).contactReadiness,'ready');
 assert.equal(qualifyProspect(base()).contactReadiness,'partial');
 assert.equal(qualifyProspect(base({phone:null})).contactReadiness,'not_ready');
});
test('manual overrides win and are visible in the rationale',()=>{
 const q=qualifyProspect(base({overrides:{primaryOpportunity:'website_design',evidenceConfidence:'high',nextAction:'prepare_opportunity_brief'}}));
 assert.equal(q.primaryOpportunity,'website_design');assert.equal(q.evidenceConfidence,'high');
 assert.equal(q.nextAction,'prepare_opportunity_brief');assert.deepEqual(q.overridden,['primaryOpportunity','evidenceConfidence','nextAction']);
 assert.match(q.reasons.join(' '),/Manually set/);
});
test('every outcome has a short rationale and never estimates money, traffic or rankings',()=>{
 const variants:Partial<QualificationInput>[]=[{},{street:null},{profileUrl:'https://instagram.com/a'},{websiteUrl:'https://a.example/'},
  {websiteUrl:'https://a.example/',audit:{status:'verified_gaps',performanceScore:10,seoScore:10,operatorSupplied:false}},
  {triageStatus:'disqualified'},{pipelineStatus:'won'},{serviceAreaEvidence:'Metro West'}];
 for(const v of variants){
  const q=qualifyProspect(base(v));
  assert.ok(q.rationale.length>10&&q.rationale.length<=400,q.rationale);
  assert.doesNotMatch(q.reasons.join(' '),BANNED);
 }
});
test('deterministic: same input, same output',()=>{
 const i=base({profileUrl:'https://instagram.com/a',targetService:'website_design'});
 assert.deepEqual(qualifyProspect(i),qualifyProspect(i));
});
test('staged-row adapter reads recorded raw evidence and import state',()=>{
 const q=qualifyStagedRow({name:'Allston Yard Care',city:'Boston',category:'craft: gardener',website_url:'',phone:'',
  source_url:'https://www.openstreetmap.org/node/9',source_type:'openstreetmap',review_status:'pending',
  raw_data:{street:'Cambridge St',housenumber:'100',postcode:'02134',search_area:'Allston',discovered_social_profile_url:'https://www.facebook.com/yard'},
  triage_status:'shortlisted'},{targetService:'website_design',duplicateWarning:false});
 assert.equal(q.researchStatus,'shortlisted');assert.equal(q.websitePresence,'social_only');
 assert.equal(q.primaryOpportunity,'website_design');
 const imported=qualifyStagedRow({name:'X Co',city:null,category:null,website_url:null,phone:null,source_url:null,source_type:null,
  review_status:'imported',raw_data:{servicearea:'Allston'},triage_status:'bogus'},{targetService:null,duplicateWarning:false});
 assert.equal(imported.researchStatus,'imported');
});
test('business adapter respects audit provenance and stored decisions',()=>{
 assert.equal(auditSummary({status:'verified_gaps',findings:{report_warnings:['x'],performance_score:10}})?.status,'inconclusive');
 assert.equal(auditSummary({status:'bogus',findings:null}),null);
 const q=qualifyBusiness({name:'Dental Co',category:'dentist',city:'Brighton',service_area:'Brighton',website_url:'https://d.example/',
  phone:'1',contact_email:null,verification_status:'verified',operational_status:'operating',pipeline_status:'contacted',next_action:'find_decision_maker'},
  {audit:auditSummary({status:'verified_gaps',findings:{performance_score:22,seo_score:90,source_method:'pagespeed_api'}}),sourceUrl:'https://x.example',sourceType:'boston-certified',profileUrl:null,targetService:'website_design'});
 assert.equal(q.primaryOpportunity,'website_design');assert.equal(q.opportunityStrength,'strong');
 assert.equal(q.nextAction,'find_decision_maker');assert.notEqual(q.primaryOpportunity,'geolocation_pages');
});
