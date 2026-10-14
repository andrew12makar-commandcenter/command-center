import {classifyIndustry,isLegalStructure} from './business-classification.ts';
import {classifyWebPresence} from './web-presence.ts';
import {DISCOVERY_AREAS} from './discovery-regions.ts';
import type {TargetService} from './discovery-campaigns.ts';
import {isWebsiteCheck,websiteWeaknessCount,seoGapCount,websiteIssueLabels,type WebsiteCheck} from './website-evidence.ts';

// Deterministic, evidence-only qualification. No AI call. No revenue, budget, traffic,
// ranking or purchase-probability estimates. Missing data is "unknown", never proof.
// The campaign's selected service is always the primary evaluation lane.
export const RESEARCH_STATUSES=['review_needed','shortlisted','held','disqualified','imported'] as const;
export type ResearchStatus=typeof RESEARCH_STATUSES[number];
export type TriageStatus=Exclude<ResearchStatus,'imported'>;
export const OPPORTUNITIES=['gbp','website_design','geolocation_pages','local_seo','no_clear_opportunity','unknown'] as const;
export type Opportunity=typeof OPPORTUNITIES[number];
export type Lane='website_design'|'gbp'|'local_seo'|'geolocation_pages';
export const LANES:Lane[]=['website_design','gbp','local_seo','geolocation_pages'];
export const STRENGTHS=['strong','moderate','weak','unknown'] as const;
export type Strength=typeof STRENGTHS[number];
export const CONFIDENCES=['high','medium','low','unknown'] as const;
export type Confidence=typeof CONFIDENCES[number];
export const READINESS=['ready','partial','not_ready'] as const;
export type Readiness=typeof READINESS[number];
export const NEXT_ACTIONS=['verify_business','find_official_website','confirm_gbp','inspect_website','inspect_location_pages',
 'find_decision_maker','prepare_opportunity_brief','generate_website_demo','hold','disqualify','none'] as const;
export type NextAction=typeof NEXT_ACTIONS[number];
export const EVIDENCE_STATES=['verified_present','verified_missing','likely_weak','unknown','conflicting'] as const;
export type EvidenceState=typeof EVIDENCE_STATES[number];
export const PROGRESS=['discovered','needs_review','qualified','imported','demo_ready','pitch_ready','outreach_ready'] as const;
export type Progress=typeof PROGRESS[number];
export type WebsitePresence='official_site_recorded'|'social_only'|'none_recorded';
export type GbpStatus='recorded'|'unconfirmed';

export const researchStatusLabels:Record<ResearchStatus,string>={
 review_needed:'Review needed',shortlisted:'Shortlisted',held:'Held',disqualified:'Disqualified',imported:'Imported'};
export const opportunityLabels:Record<Opportunity,string>={
 gbp:'GBP',website_design:'Website design',geolocation_pages:'Geolocation pages',local_seo:'Local SEO',
 no_clear_opportunity:'No clear opportunity',unknown:'Unknown'};
export const strengthLabels:Record<Strength,string>={strong:'Strong',moderate:'Moderate',weak:'Weak',unknown:'Unknown'};
export const confidenceLabels:Record<Confidence,string>={high:'High',medium:'Medium',low:'Low',unknown:'Unknown'};
export const readinessLabels:Record<Readiness,string>={ready:'Ready',partial:'Partial',not_ready:'Not ready'};
export const nextActionLabels:Record<NextAction,string>={
 verify_business:'Verify business',find_official_website:'Find official website',confirm_gbp:'Confirm GBP',
 inspect_website:'Inspect website',inspect_location_pages:'Inspect location pages',find_decision_maker:'Find decision maker',
 prepare_opportunity_brief:'Prepare opportunity brief',generate_website_demo:'Generate website demo',
 hold:'Hold',disqualify:'Disqualify',none:'None'};
export const websitePresenceLabels:Record<WebsitePresence,string>={
 official_site_recorded:'Official site recorded',social_only:'Social / directory only',none_recorded:'None recorded'};
export const evidenceStateLabels:Record<EvidenceState,string>={
 verified_present:'Verified present',verified_missing:'Verified missing',likely_weak:'Likely weak',unknown:'Unknown',conflicting:'Conflicting evidence'};
export const progressLabels:Record<Progress,string>={
 discovered:'Discovered',needs_review:'Needs review',qualified:'Qualified',imported:'Imported',
 demo_ready:'Demo ready',pitch_ready:'Pitch ready',outreach_ready:'Outreach ready'};

// ---- Operator review evidence (stored under raw_data.review on staged rows; source keys untouched) ----
export type ManualReview={
 website?:EvidenceState;website_url?:string|null;gbp?:EvidenceState;gbp_url?:string|null;
 identity?:'confirmed'|'unclear'|'unknown';active?:'confirmed'|'possibly_inactive'|'unknown';
 location_type?:'storefront'|'office'|'home_based'|'service_area'|'unknown';
 service_area?:string|null;note?:string|null;reviewed_at?:string;reviewed_by?:string;
 // Public contact routes found during review (business phone/email only; never personal data).
 phone?:string|null;email?:string|null;contact_name?:string|null;address?:string|null;
};
export type ReviewEvidence={manual?:ManualReview;website_check?:WebsiteCheck};
export function readReview(raw:Record<string,unknown>|null|undefined):ReviewEvidence{
 const r=raw?.review;
 if(!r||typeof r!=='object')return {};
 const o=r as Record<string,unknown>;
 return {manual:o.manual&&typeof o.manual==='object'?o.manual as ManualReview:undefined,
  website_check:isWebsiteCheck(o.website_check)?o.website_check:undefined};
}

export type AuditSummary={
 status:'verified_gaps'|'no_gaps'|'inconclusive';
 performanceScore:number|null;seoScore:number|null;operatorSupplied:boolean;
};
export type QualificationInput={
 name:string;category:string|null;city:string|null;street:string|null;postcode:string|null;
 websiteUrl:string|null;profileUrl:string|null;gbpUrl:string|null;
 sourceUrl:string|null;sourceType:string|null;
 phone:string|null;email:string|null;contactName:string|null;
 serviceAreaEvidence:string|null;locationCount:number|null;
 verificationStatus?:string|null;operationalStatus?:string|null;pipelineStatus?:string|null;
 triageStatus:TriageStatus;imported:boolean;disqualificationReason?:string|null;
 duplicateWarning:boolean;audit:AuditSummary|null;targetService:TargetService|null;
 // Evidence for the 100-point model (all optional; absent = unknown).
 legalStructure?:string|null;industryEvidence?:string|null;employees?:number|null;establishedYear?:number|null;
 neighborhood?:string|null;targetArea?:string|null;review?:ReviewEvidence;hasDemo?:boolean;now?:Date;
 overrides?:{primaryOpportunity?:Opportunity|null;evidenceConfidence?:Confidence|null;nextAction?:NextAction|null};
};
export type ScorePart={key:'need'|'fit'|'value'|'reach'|'confidence';label:string;points:number;max:number;why:string[]};
export type Penalty={key:string;label:string;points:number};
export type LaneScore={lane:Lane;need:number;state:EvidenceState;eligible:boolean;why:string};
export type Qualification={
 researchStatus:ResearchStatus;websitePresence:WebsitePresence;gbpStatus:GbpStatus;
 websiteState:EvidenceState;gbpState:EvidenceState;
 primaryOpportunity:Opportunity;opportunityStrength:Strength;evidenceConfidence:Confidence;
 contactReadiness:Readiness;nextAction:NextAction;rationale:string;reasons:string[];summary:string;
 score:number;parts:ScorePart[];penalties:Penalty[];lanes:LaneScore[];secondary:Lane[];
 // The campaign lane drives the score; the recommendation may point to a better-supported lane, flagged as outside the campaign focus.
 recommended:Lane;recommendedOutsideCampaign:boolean;
 identityConfirmed:boolean;activeConfirmed:boolean;reviewNote:string|null;reviewedAt:string|null;websiteIssues:string[];
 tasks:string[];qualified:boolean;unmet:string[];progress:Progress;industry:string;legalStructure:string|null;
 isPriorityLead:boolean;excludedReason:string|null;overridden:('primaryOpportunity'|'evidenceConfidence'|'nextAction')[];
};
const has=(v:string|null|undefined)=>Boolean(v&&v.trim());
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
const scanAreaLabels=new Set(DISCOVERY_AREAS.map(a=>a.label.toLowerCase()));
// A unit number makes the location type ambiguous. It never proves "home office".
const UNIT=/(?:#\s*\w+|\b(?:apt|apartment|unit|suite|ste)\b\.?\s*\w+)/i;
const CUSTOMER_FACING=/\b(restaurant|cafe|coffee|bakery|bar|pub|food|pizza|deli|salon|barber|spa|nail|beauty|fitness|gym|yoga|studio|dent\w*|medical|clinic|doctor|health|chiro\w*|physical therapy|vet\w*|pet|grooming|retail|shop|store|boutique|florist|landscap\w*|plumb\w*|electric\w*|hvac|roof\w*|contract\w*|construction|remodel\w*|painting|cleaning|handyman|moving|auto|repair|tutor\w*|school|daycare|child ?care|photograph\w*|law|attorney|legal|account\w*|tax|insurance|real estate|realty|travel|limo|transport\w*|catering|event\w*|hotel|optic\w*|pharmacy|laundry|dry clean\w*)\b/i;

export function serviceAreaEvidence(value:string|null|undefined,scanArea?:string|null):string|null{
 const v=(value||'').trim();
 if(!v)return null;
 const low=v.toLowerCase();
 if(scanAreaLabels.has(low)||(scanArea&&low===scanArea.trim().toLowerCase()))return null;
 return v.slice(0,200);
}
// Display only: do not repeat city/state/postcode already contained in the street field.
export function formatLocation(street:string|null|undefined,city?:string|null,state?:string|null,postcode?:string|null):string{
 const s=(street||'').trim();
 const low=s.toLowerCase();
 const extra:string[]=[];
 if(has(city)&&!low.includes(city!.trim().toLowerCase()))extra.push(city!.trim());
 if(has(state)&&!new RegExp('\\b'+state!.trim()+'\\b','i').test(s))extra.push(state!.trim());
 const place=extra.join(', ');
 const pc=has(postcode)&&!low.includes(postcode!.trim().toLowerCase())?postcode!.trim():'';
 return [s,[place,pc].filter(Boolean).join(' ')].filter(Boolean).join(', ')||'No address recorded';
}

function websiteStateOf(i:QualificationInput,site:boolean):{state:EvidenceState;why:string;check?:WebsiteCheck}{
 const m=i.review?.manual,c=i.review?.website_check;
 if(m?.website&&m.website!=='unknown')return {state:m.website,why:'Website manually reviewed: '+evidenceStateLabels[m.website].toLowerCase()+'.',check:c};
 if(c){
  if(c.status==='reachable'){
   const weak=websiteWeaknessCount(c);
   if(c.name_match===false)return {state:'conflicting',why:'Website loads but the business name was not found on it.',check:c};
   return weak>=2?{state:'likely_weak',why:'Website check found '+weak+' quality issues: '+c.issues.filter(x=>x!=='no_local_business_schema'&&x!=='no_sitemap').slice(0,3).map(x=>websiteIssueLabels[x].toLowerCase()).join('; ')+'.',check:c}:
    {state:'verified_present',why:'Website loads and names the business'+(weak?'; 1 minor quality issue':'')+'.',check:c};
  }
  if(c.status==='unreachable')return {state:'conflicting',why:'A website is recorded but its domain did not resolve or connect during the check.',check:c};
  return {state:'unknown',why:'Website check could not complete'+(c.error_code?' ('+c.error_code.replace(/^local-/,'')+')':'')+'. Needs manual verification.',check:c};
 }
 if(i.audit&&!i.audit.operatorSupplied&&i.audit.status==='verified_gaps'&&i.audit.performanceScore!==null&&i.audit.performanceScore<50)
  return {state:'likely_weak',why:'Measured mobile performance '+i.audit.performanceScore+'/100.'};
 if(site)return {state:'unknown',why:'Website recorded in the source but not yet checked.'};
 return {state:'unknown',why:'No website recorded. That does not prove the business has none.'};
}
function gbpStateOf(i:QualificationInput):{state:EvidenceState;why:string}{
 const m=i.review?.manual;
 if(m?.gbp&&m.gbp!=='unknown')return {state:m.gbp,why:'GBP manually reviewed: '+evidenceStateLabels[m.gbp].toLowerCase()+'.'};
 if(has(i.gbpUrl)||has(m?.gbp_url))return {state:'unknown',why:'A GBP link is recorded but the listing has not been reviewed.'};
 return {state:'unknown',why:'GBP not yet checked. A missing link is not proof there is no profile.'};
}

export function qualifyProspect(input:QualificationInput):Qualification{
 const m=input.review?.manual;
 // Reviewed public contact routes fill gaps; they never overwrite source values.
 const reviewedPostcode=(m?.address||'').match(/\b(\d{5})(?:-\d{4})?\b/)?.[1]||null;
 const i:QualificationInput={...input,phone:input.phone||m?.phone||null,email:input.email||m?.email||null,contactName:input.contactName||m?.contact_name||null,
  street:input.street||m?.address||null,postcode:input.postcode||reviewedPostcode};
 const recordedSite=classifyWebPresence(i.websiteUrl);
 const operatorSite=classifyWebPresence(m?.website_url||null);
 const site=recordedSite.kind==='website'||operatorSite.kind==='website';
 const profileKind=classifyWebPresence(i.profileUrl).kind;
 const profile=['social','listing'].includes(recordedSite.kind)||profileKind==='social'||profileKind==='listing';
 const websitePresence:WebsitePresence=site?'official_site_recorded':profile?'social_only':'none_recorded';
 const gbpKind=classifyWebPresence(i.gbpUrl||m?.gbp_url||null).kind;
 const gbpStatus:GbpStatus=gbpKind==='listing'||gbpKind==='website'?'recorded':'unconfirmed';
 const researchStatus:ResearchStatus=i.imported?'imported':i.triageStatus;
 const excludedReason=i.triageStatus==='disqualified'?'Disqualified'+(has(i.disqualificationReason)?': '+i.disqualificationReason!.trim():'')+'.':
  i.operationalStatus==='closed'?'Marked closed; not a new lead.':
  i.pipelineStatus==='won'?'Existing client (won); manage as a client, not a new lead.':
  i.pipelineStatus==='lost'?'Previously lost; do not restart outreach automatically.':null;
 const legalStructure=isLegalStructure(i.legalStructure)?i.legalStructure!.trim():isLegalStructure(i.category)?i.category!.trim():null;
 const industryText=[i.industryEvidence,i.category].find(x=>has(x)&&!isLegalStructure(x)&&!/^(certified business|food establishment)$/i.test(x!.trim()))||null;
 const industryDecision=classifyIndustry(i.name,industryText);
 const industryVerified=Boolean(industryText)&&industryDecision.confidence==='category';
 const industry=industryVerified?industryText!.replace(/^(amenity|shop|craft|office|cuisine):\s*/i,'').slice(0,80):'Industry not yet verified';
 const web=websiteStateOf(i,site),gbp=gbpStateOf(i);
 const check=web.check&&web.check.status==='reachable'?web.check:undefined;

 // ---- Independent lane need scores (0-30) ----
 const webNeed:Record<EvidenceState,number>={verified_missing:30,likely_weak:24,conflicting:10,verified_present:4,unknown:profile?12:6};
 const gbpNeed:Record<EvidenceState,number>={verified_missing:30,likely_weak:22,conflicting:10,verified_present:4,unknown:6};
 const seoGaps=check?seoGapCount(check):null;
 const measuredSeo=i.audit&&!i.audit.operatorSupplied&&i.audit.status!=='inconclusive'?i.audit.seoScore:null;
 const seoNeed=!site?4:measuredSeo!==null&&measuredSeo<80?28:seoGaps===null?6:seoGaps>=3?26:seoGaps===2?20:seoGaps===1?12:4;
 const seoState:EvidenceState=!site||(seoGaps===null&&measuredSeo===null)?'unknown':seoNeed>=20?'likely_weak':'verified_present';
 const area=m?.service_area||i.serviceAreaEvidence;const multi=(i.locationCount??0)>=2;
 const lanes:LaneScore[]=[
  {lane:'website_design',need:webNeed[web.state],state:web.state,eligible:true,why:web.why},
  {lane:'gbp',need:gbpNeed[gbp.state],state:gbp.state,eligible:true,why:gbp.why},
  {lane:'local_seo',need:seoNeed,state:seoState,eligible:true,
   why:!site?'Local SEO needs a website to inspect.':measuredSeo!==null&&measuredSeo<80?'Measured Lighthouse SEO '+measuredSeo+'/100.':
    seoGaps===null?'Website SEO basics not yet checked.':seoGaps+' of 4 SEO basics missing (title, description, LocalBusiness data, sitemap).'},
  {lane:'geolocation_pages',need:area||multi?(site?15:8):0,state:'unknown',eligible:Boolean(area||multi),
   why:area||multi?(multi?i.locationCount+' locations recorded.':'Service area recorded: '+area+'.'):'No recorded service-area or multi-location evidence.'}
 ];
 const ov=i.overrides||{};const overridden:Qualification['overridden']=[];
 const target:Lane|null=i.targetService&&i.targetService!=='general_research'?i.targetService as Lane:null;
 const best=[...lanes].filter(l=>l.eligible).sort((a,b)=>b.need-a.need||LANES.indexOf(a.lane)-LANES.indexOf(b.lane))[0];
 let primaryLane:Lane=target??best.lane;
 let primary:Opportunity=primaryLane;
 if(ov.primaryOpportunity){primary=ov.primaryOpportunity;overridden.push('primaryOpportunity');if(LANES.includes(primary as Lane))primaryLane=primary as Lane;}
 const lane=lanes.find(l=>l.lane===primaryLane)!;
 if(!ov.primaryOpportunity){
  if(excludedReason)primary='no_clear_opportunity';
  else if(target&&!lane.eligible)primary='unknown';
  else if(!target&&lane.state==='verified_present'&&lane.need<=4)primary='no_clear_opportunity';
 }
 const secondary=lanes.filter(l=>l.lane!==primaryLane&&l.eligible&&l.need>=20).map(l=>l.lane);
 const supported=lanes.filter(l=>l.eligible&&l.need>=15).sort((a,b)=>b.need-a.need||LANES.indexOf(a.lane)-LANES.indexOf(b.lane));
 const primaryLaneScore=lanes.find(l=>l.lane===primaryLane)!;
 const recommended:Lane=primaryLaneScore.eligible&&primaryLaneScore.need>=15?primaryLane:supported[0]?.lane??primaryLane;
 const recommendedNeed=lanes.find(l=>l.lane===recommended)!.need;

 // ---- Transparent 100-point model ----
 const need=lane.eligible?lane.need:0;
 const fitWhy:string[]=[];let fit=0;
 const targetArea=(i.targetArea||'').trim();
 const areaDef=DISCOVERY_AREAS.find(a=>a.label.toLowerCase()===targetArea.toLowerCase());
 const pc=(i.postcode||'').slice(0,5);
 if(!targetArea){fit+=8;fitWhy.push('No target area set (neutral).');}
 else if((areaDef?.postcodes||[]).includes(pc)||[i.neighborhood,i.city].some(x=>(x||'').toLowerCase()===targetArea.toLowerCase())){fit+=12;fitWhy.push('In '+targetArea+' (postcode or neighborhood).');}
 else if(pc||has(i.city)){fit+=4;fitWhy.push('Not confirmed inside '+targetArea+'.');}
 else fitWhy.push('Location not recorded.');
 if(industryVerified){fit+=8;fitWhy.push('Industry evidence: '+industry+'.');}else{fit+=2;fitWhy.push('Industry not yet verified.');}
 fit=clamp(fit,0,20);
 const valueWhy:string[]=[];let value=0;
 if(industryVerified&&CUSTOMER_FACING.test(industryText!+' '+i.name)){value+=8;valueWhy.push('Customer-facing local business type.');}
 else if(CUSTOMER_FACING.test(i.name)){value+=4;valueWhy.push('Name suggests a customer-facing business (unverified).');}
 if(i.employees&&i.employees>=10){value+=6;valueWhy.push(i.employees+' employees recorded in the source.');}
 else if(i.employees&&i.employees>=2){value+=4;valueWhy.push(i.employees+' employees recorded in the source.');}
 const nowYear=(i.now||new Date()).getUTCFullYear();
 if(i.establishedYear&&nowYear-i.establishedYear>=3){value+=3;valueWhy.push('Established '+i.establishedYear+'.');}
 if(check||profile){value+=3;valueWhy.push('Maintains an online presence.');}
 value=clamp(value,0,20);if(!valueWhy.length)valueWhy.push('No observable value signals recorded yet.');
 valueWhy.push('Observable signals only, not a revenue estimate.');
 const reachWhy:string[]=[];let reach=0;
 if(has(i.contactName)){reach+=5;reachWhy.push('Named contact.');}
 if(has(i.email)){reach+=4;reachWhy.push('Email recorded.');}
 if(has(i.phone)){reach+=4;reachWhy.push('Phone recorded.');}
 if(check&&(check.phone_on_page||check.email_on_page)){reach+=2;reachWhy.push('Contact details on the website.');}
 reach=clamp(reach,0,15);if(!reachWhy.length)reachWhy.push('No contact route recorded.');
 const confWhy:string[]=[];let conf=0;
 if(/^boston-/.test(i.sourceType||'')){conf+=4;confWhy.push('Official city record.');}else if(has(i.sourceUrl)){conf+=2;confWhy.push('Source recorded.');}
 if(m?.identity==='confirmed'||check?.name_match===true){conf+=4;confWhy.push(m?.identity==='confirmed'?'Identity confirmed in review.':'Website names the business.');}
 if(has(i.street)||has(i.postcode)){conf+=2;confWhy.push('Address recorded.');}
 if(check){conf+=2;confWhy.push('Website checked '+check.checked_at.slice(0,10)+'.');}
 if(m?.reviewed_at){conf+=3;confWhy.push('Manual review recorded.');}
 if(i.verificationStatus==='verified'&&i.operationalStatus==='operating'){conf+=3;confWhy.push('Verified operating in CRM.');}
 conf=clamp(conf,0,15);if(!confWhy.length)confWhy.push('No checkable evidence yet.');
 const penalties:Penalty[]=[];
 if(m?.identity==='unclear'||(check?.name_match===false&&m?.identity!=='confirmed'))penalties.push({key:'identity',label:'Identity unclear',points:-10});
 if(m?.active==='possibly_inactive'||i.operationalStatus==='closed'||web.check?.status==='unreachable')penalties.push({key:'inactive',label:'Possible inactivity',points:-15});
 if(UNIT.test(i.street||'')&&(!m?.location_type||m.location_type==='unknown'))penalties.push({key:'residential',label:'Location type unverified (unit number in address)',points:-3});
 if(!has(i.phone)&&!has(i.email)&&!check)penalties.push({key:'contact',label:'No contact path',points:-10});
 if(i.duplicateWarning)penalties.push({key:'duplicate',label:'Possible duplicate',points:-10});
 if(web.state==='conflicting'||gbp.state==='conflicting')penalties.push({key:'conflict',label:'Conflicting evidence',points:-8});
 const parts:ScorePart[]=[
  {key:'need',label:'Need for '+opportunityLabels[primaryLane],points:need,max:30,why:[lane.why]},
  {key:'fit',label:'Geographic and service fit',points:fit,max:20,why:fitWhy},
  {key:'value',label:'Likely commercial value',points:value,max:20,why:valueWhy},
  {key:'reach',label:'Decision-maker reachability',points:reach,max:15,why:reachWhy},
  {key:'confidence',label:'Evidence confidence',points:conf,max:15,why:confWhy}];
 const score=clamp(parts.reduce((n,p)=>n+p.points,0)+penalties.reduce((n,p)=>n+p.points,0),0,100);

 const strength:Strength=excludedReason||primary==='no_clear_opportunity'?'weak':
  lane.state==='unknown'?'unknown':lane.state==='verified_present'?'weak':need>=24?'strong':need>=15?'moderate':need>=6?'weak':'unknown';
 let confidence:Confidence=conf>=11?'high':conf>=7?'medium':conf>=3?'low':'unknown';
 if((i.duplicateWarning||penalties.some(p=>p.key==='conflict'||p.key==='identity'))&&confidence!=='unknown')
  confidence=confidence==='high'?'medium':'low';
 if(ov.evidenceConfidence){confidence=ov.evidenceConfidence;overridden.push('evidenceConfidence');}
 const reachable=has(i.phone)||has(i.email);
 const readiness:Readiness=reachable&&has(i.contactName)?'ready':reachable||site||profile?'partial':'not_ready';
 const identityOk=m?.identity==='confirmed'||check?.name_match===true;
 const activeOk=m?.active==='confirmed'||Boolean(check);

 const tasks:string[]=[];
 if(!excludedReason){
  if(i.duplicateWarning)tasks.push('Resolve the possible duplicate');
  if(!identityOk)tasks.push('Confirm business identity');
  if(!activeOk)tasks.push('Confirm the business is currently operating');
  if(web.state==='unknown')tasks.push(site?'Run the free website check':'Find or confirm an official website');
  if(gbp.state==='unknown')tasks.push('Check the Google Business Profile manually');
  if(UNIT.test(i.street||'')&&(!m?.location_type||m.location_type==='unknown'))tasks.push('Confirm location type (storefront, office or home-based)');
  if(!reachable)tasks.push('Find a public contact route');
  else if(!has(i.contactName))tasks.push('Find the decision maker');
 }
 const unmet:string[]=[];
 if(excludedReason)unmet.push(excludedReason);
 if(!identityOk)unmet.push('Identity not confirmed');
 if(!activeOk)unmet.push('Activity not confirmed');
 if(!reachable)unmet.push('No public contact route');
 if(recommendedNeed<15)unmet.push('Service need not supported by evidence');
 if(fit<8)unmet.push('Geographic relevance not shown');
 if(i.duplicateWarning)unmet.push('Unresolved duplicate warning');
 if(penalties.some(p=>p.key==='conflict'||p.key==='inactive'))unmet.push('Conflicting or inactive evidence');
 const qualified=unmet.length===0;

 let next:NextAction;
 if(excludedReason)next='none';
 else if(i.triageStatus==='held')next='hold';
 else if(i.duplicateWarning||!has(i.sourceUrl))next='verify_business';
 else if((primaryLane==='website_design'||primaryLane==='local_seo')&&site&&!web.check)next='inspect_website';
 else if(!site&&web.state==='unknown'&&primaryLane!=='gbp')next='find_official_website';
 else if(primaryLane==='gbp'&&gbp.state==='unknown')next='confirm_gbp';
 else if(primaryLane==='geolocation_pages')next=site?'inspect_location_pages':'find_official_website';
 else if(!identityOk||!activeOk)next='verify_business';
 else if(readiness!=='ready')next='find_decision_maker';
 else if(i.imported&&!i.hasDemo&&primaryLane==='website_design')next='generate_website_demo';
 else next='prepare_opportunity_brief';
 if(ov.nextAction){next=ov.nextAction;overridden.push('nextAction');}

 const progress:Progress=i.imported?(i.hasDemo?(qualified?(tasks.length===0&&readiness==='ready'?'outreach_ready':'pitch_ready'):'demo_ready'):'imported'):
  qualified&&i.triageStatus==='shortlisted'?'qualified':web.check||m?.reviewed_at||i.triageStatus!=='review_needed'?'needs_review':'discovered';

 const reasons:string[]=[];
 if(excludedReason)reasons.push(excludedReason);
 reasons.push(lane.why);
 if(recommended!==primaryLane)reasons.push('Best-supported service is '+opportunityLabels[recommended]+' (outside the campaign focus): '+lanes.find(l=>l.lane===recommended)!.why);
 else if(secondary.length)reasons.push('Secondary: '+secondary.map(l=>opportunityLabels[l]).join(', ')+'.');
 if(primaryLane!=='gbp'&&gbp.state==='unknown')reasons.push('GBP unknown (not checked).');
 if(i.duplicateWarning)reasons.push('Possible duplicate of a CRM record; check before importing.');
 if(overridden.length)reasons.push('Manually set: '+overridden.map(x=>x==='primaryOpportunity'?'opportunity':x==='evidenceConfidence'?'confidence':'next action').join(', ')+'.');
 const summary=(excludedReason??(opportunityLabels[primary]+(strength==='unknown'?' need is not yet shown: ':lane.state==='verified_present'?' need looks low: ':' need is '+strength+': ')+lane.why)).slice(0,240);
 const rationale=(opportunityLabels[primary]+' · '+strengthLabels[strength]+': '+(excludedReason||lane.why)).slice(0,400);
 return {researchStatus,websitePresence,gbpStatus,websiteState:web.state,gbpState:gbp.state,
  primaryOpportunity:primary,opportunityStrength:strength,evidenceConfidence:confidence,contactReadiness:readiness,
  nextAction:next,rationale,reasons,summary,score,parts,penalties,lanes,secondary,recommended,recommendedOutsideCampaign:recommended!==primaryLane,tasks,qualified,unmet,progress,
  identityConfirmed:identityOk,activeConfirmed:m?.active==='confirmed'||(i.verificationStatus==='verified'&&i.operationalStatus==='operating'),
  reviewNote:m?.note??null,reviewedAt:m?.reviewed_at??null,websiteIssues:web.check?.status==='reachable'?web.check.issues.map(x=>websiteIssueLabels[x]):[],
  industry,legalStructure,isPriorityLead:!excludedReason&&i.triageStatus!=='held'&&(strength==='strong'||strength==='moderate'),
  excludedReason,overridden};
}

// ---- Adapters: staged discovery rows and CRM businesses ----
const str=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():null;
function pickRaw(raw:Record<string,unknown>|null|undefined,keys:string[]):string|null{
 for(const k of keys){const v=str(raw?.[k]);if(v)return v;}
 return null;
}
const oneOf=<T extends string>(list:readonly T[],v:unknown):T|null=>list.includes(v as T)?v as T:null;
function yearOf(v:string|null):number|null{const m=(v||'').match(/\b(19|20)\d{2}\b/);return m?Number(m[0]):null;}
function intOf(v:string|null):number|null{const m=(v||'').match(/\d+/);const n=m?Number(m[0]):NaN;return Number.isFinite(n)&&n>0?n:null;}
export type StagedRowForQualification={
 name:string|null;city:string|null;category:string|null;website_url:string|null;phone:string|null;
 source_url:string|null;source_type:string|null;review_status:string;raw_data:Record<string,unknown>|null;
 triage_status?:string|null;primary_opportunity_override?:string|null;evidence_confidence_override?:string|null;
 next_action_override?:string|null;disqualification_reason?:string|null;
};
export function stagedStreet(raw:Record<string,unknown>):string|null{
 const street=pickRaw(raw,['street','streetaddress','address']);
 if(!street)return null;
 const num=pickRaw(raw,['housenumber','streetnumber']);
 return num&&!street.startsWith(num)?num+' '+street:street;
}
export function qualifyStagedRow(row:StagedRowForQualification,opts:{targetService:TargetService|null;duplicateWarning:boolean;targetArea?:string|null;hasDemo?:boolean;now?:Date}):Qualification{
 const raw=row.raw_data||{};
 const count=Number(pickRaw(raw,['locationcount','locations','numberoflocations']));
 return qualifyProspect({
  name:row.name||'',category:row.category,city:row.city,street:stagedStreet(raw),
  postcode:pickRaw(raw,['postcode','postalcode','zipcode','zip']),
  websiteUrl:row.website_url,profileUrl:pickRaw(raw,['discovered_social_profile_url']),
  gbpUrl:pickRaw(raw,['googlebusinessurl','gbpurl','googlebusinessprofile','googlemapsurl']),
  sourceUrl:row.source_url,sourceType:row.source_type,phone:row.phone,
  email:pickRaw(raw,['email','contactemail']),contactName:pickRaw(raw,['contactname','owner','ownername']),
  serviceAreaEvidence:serviceAreaEvidence(pickRaw(raw,['servicearea','serviceareas']),str(raw.search_area)),
  locationCount:Number.isInteger(count)&&count>0?count:null,
  legalStructure:pickRaw(raw,['legal_structure','businesstype']),
  industryEvidence:pickRaw(raw,['servicesprovided','original_category','industry']),
  employees:intOf(pickRaw(raw,['numberemployees','employees'])),establishedYear:yearOf(pickRaw(raw,['datebusinessestablished'])),
  neighborhood:pickRaw(raw,['neighborhood','search_area']),targetArea:opts.targetArea??null,review:readReview(raw),
  triageStatus:oneOf(['review_needed','shortlisted','held','disqualified'] as const,row.triage_status)??'review_needed',
  imported:row.review_status==='imported'||row.review_status==='duplicate',hasDemo:opts.hasDemo,
  disqualificationReason:row.disqualification_reason,duplicateWarning:opts.duplicateWarning,audit:null,
  targetService:opts.targetService,now:opts.now,
  overrides:{primaryOpportunity:oneOf(OPPORTUNITIES,row.primary_opportunity_override),
   evidenceConfidence:oneOf(CONFIDENCES,row.evidence_confidence_override),
   nextAction:oneOf(NEXT_ACTIONS,row.next_action_override)}
 });
}
export type BusinessForQualification={
 name:string;category:string|null;city:string|null;street_address?:string|null;postal_code?:string|null;
 service_area:string|null;website_url:string|null;google_business_url?:string|null;phone:string|null;
 contact_email:string|null;contact_name?:string|null;verification_status:string;operational_status:string;
 pipeline_status:string;primary_opportunity?:string|null;evidence_confidence?:string|null;next_action?:string|null;
};
export function auditSummary(a:{status:string;findings:Record<string,unknown>|null}|null):AuditSummary|null{
 if(!a||!['verified_gaps','no_gaps','inconclusive'].includes(a.status))return null;
 const f=a.findings||{};
 const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:null;
 const warnings=Array.isArray(f.report_warnings)&&f.report_warnings.length>0;
 return {status:warnings?'inconclusive':a.status as AuditSummary['status'],performanceScore:n(f.performance_score),seoScore:n(f.seo_score),
  operatorSupplied:f.source_method==='local_lighthouse_upload'};
}
// CRM rescoring is read-only and never writes. Stored opportunity/confidence/next action act as overrides.
export function qualifyBusiness(b:BusinessForQualification,opts:{
 audit:AuditSummary|null;sourceUrl:string|null;sourceType:string|null;profileUrl:string|null;targetService:TargetService|null;
 targetArea?:string|null;staged?:Record<string,unknown>|null;hasDemo?:boolean;now?:Date;
}):Qualification{
 const raw=opts.staged||{};
 return qualifyProspect({
  name:b.name,category:b.category,city:b.city,street:b.street_address??null,postcode:b.postal_code??null,
  websiteUrl:b.website_url,profileUrl:opts.profileUrl,gbpUrl:b.google_business_url??null,
  sourceUrl:opts.sourceUrl,sourceType:opts.sourceType,phone:b.phone,email:b.contact_email,contactName:b.contact_name??null,
  serviceAreaEvidence:serviceAreaEvidence(b.service_area),locationCount:null,
  legalStructure:pickRaw(raw,['legal_structure','businesstype']),industryEvidence:pickRaw(raw,['servicesprovided','original_category']),
  employees:intOf(pickRaw(raw,['numberemployees'])),establishedYear:yearOf(pickRaw(raw,['datebusinessestablished'])),
  neighborhood:pickRaw(raw,['neighborhood','search_area']),targetArea:opts.targetArea??null,review:readReview(raw),
  verificationStatus:b.verification_status,operationalStatus:b.operational_status,pipelineStatus:b.pipeline_status,
  triageStatus:'shortlisted',imported:true,duplicateWarning:false,audit:opts.audit,targetService:opts.targetService,
  hasDemo:opts.hasDemo,now:opts.now,
  overrides:{primaryOpportunity:oneOf(OPPORTUNITIES,b.primary_opportunity),
   evidenceConfidence:oneOf(CONFIDENCES,b.evidence_confidence),nextAction:oneOf(NEXT_ACTIONS,b.next_action)}
 });
}
