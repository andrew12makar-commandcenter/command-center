import test from 'node:test';
import assert from 'node:assert/strict';
import {qualifyProspect,qualifyStagedRow,qualifyBusiness,serviceAreaEvidence,auditSummary,formatLocation,compareQualificationNeed,employeeCountOf,
 type QualificationInput} from '../lib/prospect-qualification.ts';
import type {WebsiteCheck} from '../lib/website-evidence.ts';

const now=new Date('2026-10-14T12:00:00Z');
const base=(u:Partial<QualificationInput>={}):QualificationInput=>({
 name:'Brighton Dental Associates',category:'amenity: dentist',city:'Boston',street:'12 Market St',postcode:'02135',
 websiteUrl:null,profileUrl:null,gbpUrl:null,sourceUrl:'https://www.openstreetmap.org/node/1',sourceType:'openstreetmap',
 phone:'617-555-0100',email:null,contactName:null,serviceAreaEvidence:null,locationCount:null,
 triageStatus:'review_needed',imported:false,duplicateWarning:false,audit:null,targetService:'website_design',
 targetArea:'Brighton',now,...u
});
const check=(u:Partial<WebsiteCheck>={}):WebsiteCheck=>({
 checked_at:'2026-10-14T10:00:00Z',url:'https://dental.example/',final_url:'https://dental.example/',status:'reachable',
 https:true,title:'Brighton Dental Associates',description:'Dentist in Brighton',canonical:null,viewport:true,
 json_ld_types:['Dentist'],local_business_schema:true,copyright_year:2026,phone_on_page:true,email_on_page:false,
 name_match:true,robots_txt:true,sitemap:true,issues:[],...u
});
const weakCheck=check({https:false,viewport:false,description:'',copyright_year:2017,local_business_schema:false,sitemap:false,
 issues:['no_https','no_viewport','no_meta_description','old_copyright','no_local_business_schema','no_sitemap']});
const BANNED=/\b(budget|revenue|traffic|ranking|rankings|probability|contract value|\$\d)/i;

test('a website-design campaign evaluates website design as its primary service',()=>{
 // Even when the GBP lane is just as unknown, the campaign lane stays primary.
 const q=qualifyProspect(base({targetService:'website_design'}));
 assert.equal(q.primaryOpportunity,'website_design');
 assert.equal(q.parts[0].label,'Need for Website design');
 const g=qualifyProspect(base({targetService:'gbp'}));
 assert.equal(g.primaryOpportunity,'gbp');
 // The 16-candidate defect: address + no GBP link must not make GBP primary in a website campaign.
 const r=qualifyStagedRow({name:'Welland & Co., LLC',city:'Boston',category:'Limited Liability Company (LLC)',website_url:'https://wellandandco.example/',
  phone:'617',source_url:'https://data.boston.gov/x',source_type:'boston-certified',review_status:'pending',
  raw_data:{address:'72 Saybrook Street, #3, Boston, MA 02135',postcode:'02135',businesstype:'Limited Liability Company (LLC)'}},
  {targetService:'website_design',duplicateWarning:false,targetArea:'Brighton',now});
 assert.equal(r.primaryOpportunity,'website_design');
});
test('website design, GBP and local SEO receive independent lane scores',()=>{
 const q=qualifyProspect(base({websiteUrl:'https://dental.example/',review:{website_check:weakCheck}}));
 const lane=(k:string)=>q.lanes.find(l=>l.lane===k)!;
 assert.equal(lane('website_design').need,24);
 assert.equal(lane('gbp').need,6);
 assert.equal(lane('local_seo').need,26);
 assert.deepEqual(q.secondary,['local_seo']);
});
test('directory websites in raw source remain visible to qualification when mapped field is empty',()=>{
 const q=qualifyStagedRow({name:'Brighton Bookshop',city:'Brighton',category:'Bookstore',website_url:null,phone:null,
  source_url:'https://data.example/business',source_type:'boston-certified',review_status:'pending',raw_data:{website:'https://bookshop.example/'}},
  {targetService:'website_design',duplicateWarning:false,targetArea:'Brighton',now});
 assert.equal(q.websitePresence,'official_site_recorded');
 assert.match(q.tasks.join(' '),/Run the free website check/);
});
test('a third-party ordering URL is research evidence, not the business website',()=>{
 const q=qualifyStagedRow({name:'Nakhon',city:'Brighton',category:'restaurant',website_url:'',phone:'617',
  source_url:'https://data.example/business',source_type:'public directory',review_status:'pending',
  raw_data:{third_party_urls:'https://order.toasttab.com/online/nakhon-brighton'}},
  {targetService:'website_design',duplicateWarning:false,targetArea:'Brighton',now});
 assert.equal(q.websitePresence,'ordering_only');
 assert.equal(q.websiteState,'unknown','an ordering platform does not prove an independent site is missing');
 assert.equal(q.lanes.find(l=>l.lane==='website_design')?.need,12,'third-party-only presence is a research clue, not verified need');
 assert.equal(q.nextAction,'find_official_website');
});
test('employee bands use conservative counts and never turn less-than ten into ten',()=>{
 assert.equal(employeeCountOf('Less than 10'),9);
 assert.equal(employeeCountOf('Under 10 employees'),9);
 assert.equal(employeeCountOf('10 to 19'),10);
 assert.equal(employeeCountOf('5'),5);
 assert.equal(employeeCountOf('unknown'),null);
});
test('an unknown GBP URL never becomes "GBP missing"',()=>{
 const q=qualifyProspect(base({targetService:'gbp'}));
 assert.equal(q.gbpState,'unknown');
 assert.equal(q.opportunityStrength,'unknown');
 assert.equal(q.nextAction,'confirm_gbp');
 assert.doesNotMatch(q.summary+q.reasons.join(' '),/no (gbp|google business profile)\b(?! link)/i);
 assert.match(q.summary,/not proof/);
 const v=qualifyProspect(base({targetService:'gbp',review:{manual:{gbp:'verified_missing',reviewed_at:'2026-10-14'}}}));
 assert.equal(v.gbpState,'verified_missing');assert.equal(v.opportunityStrength,'strong');
});
test('a missing website stays unknown until review supports "verified missing"',()=>{
 const q=qualifyProspect(base({street:null}));
 assert.equal(q.websiteState,'unknown');
 assert.equal(q.nextAction,'find_official_website');
 assert.match(q.reasons.join(' '),/not prove/i);
 const m=qualifyProspect(base({review:{manual:{website:'verified_missing',identity:'confirmed',active:'confirmed',reviewed_at:'2026-10-14'}}}));
 assert.equal(m.websiteState,'verified_missing');assert.equal(m.opportunityStrength,'strong');
});
test('website check evidence sets explicit evidence states',()=>{
 const present=qualifyProspect(base({websiteUrl:'https://dental.example/',review:{website_check:check()}}));
 assert.equal(present.websiteState,'verified_present');assert.equal(present.opportunityStrength,'weak');assert.match(present.summary,/looks low/);
 assert.equal(qualifyProspect(base({websiteUrl:'https://dental.example/',review:{website_check:check({status:'error',error_code:'local-unavailable'})}})).websiteState,'unknown');
 assert.equal(qualifyProspect(base({websiteUrl:'https://dental.example/',review:{website_check:weakCheck}})).websiteState,'likely_weak');
 assert.equal(qualifyProspect(base({websiteUrl:'https://dental.example/',review:{website_check:check({name_match:false,issues:['name_not_found']})}})).websiteState,'conflicting');
 assert.equal(qualifyProspect(base({websiteUrl:'https://dental.example/',review:{website_check:check({status:'unreachable'})}})).websiteState,'conflicting');
 const tls=qualifyProspect(base({websiteUrl:'https://dental.example/',review:{website_check:check({status:'tls_error',
  error_code:'local-tls',issues:['tls_certificate_error']})}}));
 assert.equal(tls.websiteState,'likely_weak');
 assert.match(tls.reasons.join(' '),/TLS certificate/i);
 assert.equal(qualifyProspect(base({websiteUrl:'https://dental.example/',review:{website_check:check({status:'denied'})}})).websiteState,'unknown');
});
test('fresh matching local Lighthouse evidence improves staged prospect qualification',()=>{
 const local={website_url:'https://dental.example/',assessed_at:'2026-10-14T11:55:00Z',status:'verified_gaps' as const,
  findings:{version:1 as const,provider:'Local Chrome Lighthouse' as const,strategy:'mobile' as const,
   analyzed_url:'https://dental.example/',final_url:'https://dental.example/',measured_at:'2026-10-14T11:55:00Z',
   performance_score:42,seo_score:73,technical_opportunity_score:58,measured_checks:4,flagged_checks:2,
   note:'Local mobile lab result.',source_method:'local_lighthouse_execution' as const,
   technical_signals:{metrics:{fcp_ms:1600,lcp_ms:4200,speed_index_ms:2100,blocking_time_ms:120,layout_shift:0.1},insights:[]}},
  evidence:[]};
 const row={name:'Brighton Dental Associates',city:'Brighton',category:'Dentist',website_url:'https://dental.example/',phone:null,
  source_url:'https://data.example/business',source_type:'public directory',review_status:'pending',raw_data:{review:{local_lighthouse:local}}};
 const q=qualifyStagedRow(row,{targetService:'website_design',duplicateWarning:false,targetArea:'Brighton',now});
 assert.equal(q.websiteState,'likely_weak');
 assert.equal(q.lanes.find(l=>l.lane==='local_seo')?.need,28);
});
test('staged Lighthouse evidence for a different website or operator upload cannot affect ranking',()=>{
 const local={website_url:'https://other.example/',assessed_at:'2026-10-14T11:55:00Z',status:'verified_gaps' as const,
  findings:{version:1 as const,provider:'Local Chrome Lighthouse' as const,strategy:'mobile' as const,
   analyzed_url:'https://other.example/',final_url:'https://other.example/',measured_at:'2026-10-14T11:55:00Z',
   performance_score:10,seo_score:20,technical_opportunity_score:90,measured_checks:4,flagged_checks:2,
   note:'Local mobile lab result.',source_method:'local_lighthouse_upload' as const},evidence:[]};
 const q=qualifyStagedRow({name:'Brighton Dental Associates',city:'Brighton',category:'Dentist',website_url:'https://dental.example/',phone:null,
  source_url:'https://data.example/business',source_type:'public directory',review_status:'pending',raw_data:{review:{local_lighthouse:local}}},
  {targetService:'website_design',duplicateWarning:false,targetArea:'Brighton',now});
 assert.equal(q.websiteState,'unknown');
 assert.equal(q.lanes.find(l=>l.lane==='local_seo')?.need,6);
});
test('an address or unit number never becomes a storefront or home-office conclusion',()=>{
 const q=qualifyProspect(base({street:'72 Saybrook Street, #3'}));
 const text=JSON.stringify(q);
 assert.doesNotMatch(text,/home office|home-based business|storefront business|physical location/i);
 assert.ok(q.penalties.some(p=>p.key==='residential'&&p.points===-3));
 assert.ok(q.tasks.some(t=>/location type/.test(t)));
 const ok=qualifyProspect(base({street:'72 Saybrook Street, #3',review:{manual:{location_type:'office'}}}));
 assert.ok(!ok.penalties.some(p=>p.key==='residential'));
});
test('the 100-point model is transparent and sums to the shown score',()=>{
 const q=qualifyProspect(base({websiteUrl:'https://dental.example/',email:'a@b.example',contactName:'Dr. Lee',
  sourceType:'boston-certified',review:{website_check:weakCheck,manual:{identity:'confirmed',active:'confirmed',reviewed_at:'2026-10-14'}}}));
 assert.deepEqual(q.parts.map(p=>p.max),[30,20,20,15,15]);
 const sum=q.parts.reduce((n,p)=>n+p.points,0)+q.penalties.reduce((n,p)=>n+p.points,0);
 assert.equal(q.score,Math.max(0,Math.min(100,sum)));
 for(const p of q.parts){assert.ok(p.points>=0&&p.points<=p.max,p.key);assert.ok(p.why.length>0);}
 assert.ok(q.parts.find(p=>p.key==='value')!.why.some(w=>/not a revenue estimate/.test(w)));
 assert.equal(q.qualified,true);
});
test('scores are deterministic from the same evidence',()=>{
 const i=base({websiteUrl:'https://dental.example/',review:{website_check:weakCheck}});
 assert.deepEqual(qualifyProspect(i),qualifyProspect(i));
});
test('conflicting or incomplete evidence reduces confidence and score',()=>{
 const clean=qualifyProspect(base({websiteUrl:'https://dental.example/',sourceType:'boston-certified',review:{website_check:check(),manual:{identity:'confirmed',reviewed_at:'2026-10-14'}}}));
 const conflict=qualifyProspect(base({websiteUrl:'https://dental.example/',sourceType:'boston-certified',review:{website_check:check({name_match:false,issues:['name_not_found']}),manual:{reviewed_at:'2026-10-14'}}}));
 assert.ok(conflict.penalties.some(p=>p.key==='conflict'));
 assert.ok(['low','medium'].includes(conflict.evidenceConfidence));
 assert.ok(conflict.score<clean.score);
 const dup=qualifyProspect(base({duplicateWarning:true}));
 assert.ok(dup.penalties.some(p=>p.key==='duplicate'));assert.equal(dup.nextAction,'verify_business');
 const none=qualifyProspect(base({sourceUrl:null,street:null,postcode:null,phone:null,sourceType:null}));
 assert.equal(none.evidenceConfidence,'unknown');
 assert.ok(none.penalties.some(p=>p.key==='contact'));
});
test('legal entity type is never treated as an industry',()=>{
 for(const cat of ['Limited Liability Company (LLC)','Corporation','Sole Proprietorship']){
  const q=qualifyProspect(base({name:'Welland & Co., LLC',category:cat}));
  assert.equal(q.industry,'Industry not yet verified',cat);
  assert.equal(q.legalStructure,cat);
  assert.doesNotMatch(q.parts.find(p=>p.key==='fit')!.why.join(' '),/Other business/);
 }
 const s=qualifyProspect(base({name:'Spotless LLC',category:'Corporation',industryEvidence:'Painting and handyman services'}));
 assert.equal(s.industry,'Painting and handyman services');
});
test('geolocation requires real location or service-area evidence',()=>{
 const none=qualifyProspect(base({websiteUrl:'https://dental.example/',targetService:'geolocation_pages'}));
 assert.equal(none.primaryOpportunity,'unknown');
 assert.equal(serviceAreaEvidence('Brighton'),null,'a discovery scan area is not service-area evidence');
 const ok=qualifyProspect(base({websiteUrl:'https://dental.example/',targetService:'geolocation_pages',serviceAreaEvidence:'Newton, Watertown'}));
 assert.equal(ok.primaryOpportunity,'geolocation_pages');assert.equal(ok.nextAction,'inspect_location_pages');
});
test('closed, won, lost and disqualified records are never priority leads',()=>{
 for(const u of [{operationalStatus:'closed'},{pipelineStatus:'won'},{pipelineStatus:'lost'},
   {triageStatus:'disqualified' as const,disqualificationReason:'Permanently closed per city license record'}]){
  const q=qualifyProspect(base({websiteUrl:'https://dental.example/',review:{website_check:weakCheck},...u}));
  assert.equal(q.isPriorityLead,false);assert.equal(q.primaryOpportunity,'no_clear_opportunity');
  assert.equal(q.nextAction,'none');assert.equal(q.qualified,false);
 }
});
test('qualification requires identity, activity, contact, need, geography and no duplicate',()=>{
 const q=qualifyProspect(base());
 assert.equal(q.qualified,false);
 assert.ok(q.unmet.includes('Identity not confirmed'));
 assert.ok(q.unmet.some(item=>item.startsWith('Service need not supported by evidence')));
});
test('progress states move from discovered to outreach ready',()=>{
 assert.equal(qualifyProspect(base()).progress,'discovered');
 assert.equal(qualifyProspect(base({websiteUrl:'https://d.example/',review:{website_check:check()}})).progress,'needs_review');
 const good={websiteUrl:'https://d.example/',email:'a@b.example',contactName:'Dr. Lee',
  review:{website_check:weakCheck,manual:{identity:'confirmed' as const,active:'confirmed' as const,gbp:'verified_present' as const,reviewed_at:'2026-10-14'}}};
 assert.equal(qualifyProspect(base({...good,triageStatus:'shortlisted'})).progress,'qualified');
 assert.equal(qualifyProspect(base({...good,imported:true})).progress,'imported');
 assert.equal(qualifyProspect(base({...good,imported:true,hasDemo:true})).progress,'outreach_ready');
 assert.equal(qualifyProspect(base({...good,imported:true,hasDemo:true,contactName:null})).progress,'pitch_ready');
});
test('manual overrides win and are visible',()=>{
 const q=qualifyProspect(base({overrides:{primaryOpportunity:'gbp',evidenceConfidence:'high',nextAction:'prepare_opportunity_brief'}}));
 assert.equal(q.primaryOpportunity,'gbp');assert.equal(q.evidenceConfidence,'high');
 assert.match(q.reasons.join(' '),/Manually set/);
});
test('no outcome estimates money, traffic or rankings',()=>{
 for(const v of [{},{street:null},{profileUrl:'https://instagram.com/a'},{websiteUrl:'https://a.example/',review:{website_check:weakCheck}},
  {triageStatus:'disqualified' as const},{pipelineStatus:'won'},{serviceAreaEvidence:'Metro West'}]){
  const q=qualifyProspect(base(v));
  assert.doesNotMatch([q.summary,...q.reasons,...q.parts.flatMap(p=>p.why).filter(w=>!/not a revenue estimate/.test(w))].join(' '),BANNED);
 }
});
test('location formatting does not repeat city, state or postcode',()=>{
 assert.equal(formatLocation('72 Saybrook Street, #3, Boston, MA 02135','Boston','MA','02135'),'72 Saybrook Street, #3, Boston, MA 02135');
 assert.equal(formatLocation('100 Cambridge St','Boston','MA','02134'),'100 Cambridge St, Boston, MA 02134');
 assert.equal(formatLocation(null,null,null,null),'No address recorded');
});
test('business adapter is read-only and respects audit provenance',()=>{
 assert.equal(auditSummary({status:'verified_gaps',findings:{report_warnings:['x'],performance_score:10}})?.status,'inconclusive');
 const b={name:'Dental Co',category:'dentist',city:'Brighton',service_area:'Brighton',website_url:'https://d.example/',
  phone:'1',contact_email:null,verification_status:'verified',operational_status:'operating',pipeline_status:'contacted',next_action:'find_decision_maker'};
 const copy=JSON.stringify(b);
 const q=qualifyBusiness(b,{audit:auditSummary({status:'verified_gaps',findings:{performance_score:22,seo_score:90,source_method:'pagespeed_api'}}),
  sourceUrl:'https://x.example',sourceType:'boston-certified',profileUrl:null,targetService:'website_design',now});
 assert.equal(q.primaryOpportunity,'website_design');assert.equal(q.websiteState,'likely_weak');
 assert.equal(q.nextAction,'find_decision_maker');
 assert.equal(JSON.stringify(b),copy,'rescoring never mutates the record');
});

test('reviewed public contact routes fill gaps without overwriting source values',()=>{
 const q=qualifyProspect(base({phone:null,review:{manual:{phone:'(617) 555-0199',reviewed_at:'2026-10-14'}}}));
 assert.notEqual(q.contactReadiness,'not_ready');
 assert.ok(!q.unmet.includes('No public contact route'));
});

test('the campaign lane drives the score while a better-supported service is flagged, not swapped in',()=>{
 const q=qualifyProspect(base({websiteUrl:'https://d.example/',review:{website_check:check(),manual:{gbp:'likely_weak',identity:'confirmed',active:'confirmed',reviewed_at:'2026-10-14'}}}));
 assert.equal(q.primaryOpportunity,'website_design');
 assert.equal(q.parts[0].label,'Need for Website design');
 assert.equal(q.parts[0].points,4);
 assert.equal(q.recommended,'gbp');assert.equal(q.recommendedOutsideCampaign,true);
 assert.ok(q.reasons.some(r=>/outside the campaign focus/.test(r)));
 assert.ok(q.unmet.some(r=>/Service need not supported by evidence for Website design/.test(r)));
 assert.equal(q.qualified,false,'an alternative opportunity cannot qualify a weak campaign fit');
 const withDemo=qualifyProspect(base({websiteUrl:'https://d.example/',imported:true,hasDemo:true,
  review:{website_check:check(),manual:{gbp:'likely_weak',identity:'confirmed',active:'confirmed',reviewed_at:'2026-10-14'}}}));
 assert.notEqual(withDemo.progress,'pitch_ready','a demo cannot make an unsupported campaign opportunity pitch-ready');
});

test('a scan target area is not treated as the business neighborhood or a geographic match',()=>{
 const q=qualifyStagedRow({name:'Dash Cafe',city:'Boston',category:'amenity: cafe',website_url:'https://dash.example/',phone:'617',
  source_url:'https://www.openstreetmap.org/node/1',source_type:'openstreetmap',review_status:'pending',
  raw_data:{postcode:'02134',search_area:'Brighton'}},{targetService:'website_design',duplicateWarning:false,targetArea:'Brighton',now});
 assert.ok(!q.parts.find(part=>part.key==='fit')!.why.some(reason=>/In Brighton \(postcode or neighborhood\)/.test(reason)));
 assert.ok(q.parts.find(part=>part.key==='fit')!.why.some(reason=>/Not confirmed inside Brighton/.test(reason)));
});

test('evidence-backed service need ranks ahead of reachability penalties',()=>{
 const noSite=qualifyProspect(base({name:'ABC',category:null,city:null,street:null,postcode:null,phone:null,
  sourceUrl:null,sourceType:null,duplicateWarning:true,review:{manual:{website:'verified_missing'}}}));
 const weakNeed=qualifyProspect(base({websiteUrl:'https://d.example/',review:{website_check:check()}}));
 assert.ok(noSite.score<weakNeed.score,'total score may reward reachability and site presence');
 assert.ok(compareQualificationNeed(noSite,weakNeed)<0,'higher need is ordered first independent of total score');
});

test('a verified gap ranks ahead of an unchecked website',()=>{
 const unknown=qualifyProspect(base({name:'Brighton Family Dentistry',category:'dentist',websiteUrl:null}));
 const gap=qualifyProspect(base({name:'Brighton Family Dentistry',category:'dentist',websiteUrl:'https://d.example/',
  review:{website_check:weakCheck}}));
 assert.equal(unknown.websiteState,'unknown');
 assert.equal(gap.websiteState,'likely_weak');
 assert.equal(gap.isPriorityLead,true);
 assert.ok(compareQualificationNeed(gap,unknown)<0,'an observed gap should outrank an unchecked site');
});

test('target-fit clues lift local customer businesses while flagging out-of-scope records for review',()=>{
 const local=qualifyProspect(base({name:'Brighton Family Dentistry',category:'dentist'}));
 const agency=qualifyProspect(base({name:'Brighton Digital Marketing Agency',category:'marketing agency'}));
 const unknown=qualifyProspect(base({name:'ABC Holdings',category:null}));
 const chain=qualifyProspect(base({name:'National Coffee Chain Branch',category:'coffee shop'}));
 assert.equal(local.targetFit,'likely_target');
 assert.equal(agency.targetFit,'possible_out_of_scope');
 assert.equal(unknown.targetFit,'review_fit');
 assert.equal(chain.targetFit,'review_fit');
 assert.match(chain.targetFitReason,/local owner can choose/);
 assert.equal(agency.researchStatus,'review_needed','fit signals never auto-disqualify a lead');
 assert.match(local.targetFitReason,/ownership still need review/);
});
test('strong technical need from an obvious out-of-scope business is not a priority lead',()=>{
 const agency=qualifyProspect(base({name:'Brighton Digital Marketing Agency',category:'marketing agency',
  websiteUrl:'https://agency.example/',review:{website_check:weakCheck}}));
 assert.equal(agency.targetFit,'possible_out_of_scope');
 assert.equal(agency.opportunityStrength,'strong');
 assert.equal(agency.isPriorityLead,false);
});

test('government registration supports entity evidence but never proves the shop is open or qualified',()=>{
 const unregistered=qualifyProspect(base({name:'Brighton Bakery',category:'bakery'}));
 const registered=qualifyProspect(base({name:'Brighton Bakery',category:'bakery',review:{manual:{
  registry_result:'found_match',registry_url:'https://corp.sec.state.ma.us/CorpWeb/CorpSearch/CorpSummary.aspx?FEIN=123',
  registry_note:'Legal entity name matches; registered office address only'
 }}}));
 assert.equal(registered.identityConfirmed,false);
 assert.equal(registered.activeConfirmed,false);
 assert.equal(registered.qualified,false);
 assert.equal(registered.parts.find(part=>part.key==='confidence')?.points,unregistered.parts.find(part=>part.key==='confidence')!.points+2);
 assert.match(registered.parts.find(part=>part.key==='confidence')!.why.join(' '),/does not confirm current operation or the storefront/);
});

test('a Google Maps search is not a recorded GBP listing, but a CID link is still unreviewed',()=>{
 const search=qualifyProspect(base({gbpUrl:'https://www.google.com/maps/search/?api=1&query=Nakhon',targetService:'gbp'}));
 assert.equal(search.gbpLinkStatus,'unconfirmed');
 assert.equal(search.gbpState,'unknown');
 assert.match(search.reasons.join(' '),/search link|not a confirmed/i);
 const specific=qualifyProspect(base({gbpUrl:'https://maps.google.com/?cid=4',targetService:'gbp'}));
 assert.equal(specific.gbpLinkStatus,'recorded');
 assert.equal(specific.gbpState,'unknown');
});
