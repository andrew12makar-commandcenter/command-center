import {classifyIndustry} from './business-classification.ts';
import {classifyWebPresence} from './web-presence.ts';
import {DISCOVERY_AREAS} from './discovery-regions.ts';
import type {TargetService} from './discovery-campaigns.ts';

// Deterministic, evidence-only qualification. No AI call, no budget, revenue,
// traffic, ranking or purchase-probability estimates. Missing data is "unknown",
// never proof of a gap: no recorded website != no website; no GBP link != no GBP.
export const RESEARCH_STATUSES=['review_needed','shortlisted','held','disqualified','imported'] as const;
export type ResearchStatus=typeof RESEARCH_STATUSES[number];
export type TriageStatus=Exclude<ResearchStatus,'imported'>;
export const OPPORTUNITIES=['gbp','website_design','geolocation_pages','local_seo','no_clear_opportunity','unknown'] as const;
export type Opportunity=typeof OPPORTUNITIES[number];
export const STRENGTHS=['strong','moderate','weak','unknown'] as const;
export type Strength=typeof STRENGTHS[number];
export const CONFIDENCES=['high','medium','low','unknown'] as const;
export type Confidence=typeof CONFIDENCES[number];
export const READINESS=['ready','partial','not_ready'] as const;
export type Readiness=typeof READINESS[number];
export const NEXT_ACTIONS=['verify_business','find_official_website','confirm_gbp','inspect_website','inspect_location_pages',
 'find_decision_maker','prepare_opportunity_brief','generate_website_demo','hold','disqualify','none'] as const;
export type NextAction=typeof NEXT_ACTIONS[number];
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
 overrides?:{primaryOpportunity?:Opportunity|null;evidenceConfidence?:Confidence|null;nextAction?:NextAction|null};
};
export type Qualification={
 researchStatus:ResearchStatus;websitePresence:WebsitePresence;gbpStatus:GbpStatus;
 primaryOpportunity:Opportunity;opportunityStrength:Strength;evidenceConfidence:Confidence;
 contactReadiness:Readiness;nextAction:NextAction;rationale:string;reasons:string[];
 isPriorityLead:boolean;excludedReason:string|null;overridden:('primaryOpportunity'|'evidenceConfidence'|'nextAction')[];
};
type ServiceEval={service:Exclude<Opportunity,'no_clear_opportunity'|'unknown'>;strength:Strength;eligible:boolean;reason:string};
const rank:Record<Strength,number>={strong:3,moderate:2,weak:1,unknown:0};
const order:ServiceEval['service'][]=['website_design','gbp','local_seo','geolocation_pages'];
const has=(v:string|null|undefined)=>Boolean(v&&v.trim());
const scanAreaLabels=new Set(DISCOVERY_AREAS.map(a=>a.label.toLowerCase()));

// The import step copies a discovery scan area into service_area. That is where we
// searched, not where the business serves customers, so it is not location evidence.
export function serviceAreaEvidence(value:string|null|undefined,scanArea?:string|null):string|null{
 const v=(value||'').trim();
 if(!v)return null;
 const low=v.toLowerCase();
 if(scanAreaLabels.has(low)||(scanArea&&low===scanArea.trim().toLowerCase()))return null;
 return v.slice(0,200);
}

function evaluate(i:QualificationInput,site:boolean,profile:boolean,gbp:GbpStatus):ServiceEval[]{
 const a=i.audit;
 const perfGap=a?.status==='verified_gaps'&&a.performanceScore!==null&&a.performanceScore<50;
 const seoGap=a?.status==='verified_gaps'&&a.seoScore!==null&&a.seoScore<80;
 const measured=(gap:boolean)=>gap&&!a!.operatorSupplied;
 const web:ServiceEval=!site?(profile?
  {service:'website_design',strength:'moderate',eligible:true,reason:'Only a social or directory profile is recorded. This justifies website research but does not prove the business needs a new site.'}:
  {service:'website_design',strength:'unknown',eligible:true,reason:'No website recorded. That does not prove the business has none.'}):
  !a?{service:'website_design',strength:'unknown',eligible:true,reason:'Official site recorded but not yet inspected or audited.'}:
  a.status==='inconclusive'?{service:'website_design',strength:'unknown',eligible:true,reason:'Latest audit was inconclusive. It is not a verified problem.'}:
  a.status==='no_gaps'?{service:'website_design',strength:'weak',eligible:true,reason:'Latest audit found no measured gaps.'}:
  perfGap?{service:'website_design',strength:measured(perfGap)?'strong':'moderate',eligible:true,
   reason:`${a.operatorSupplied?'Operator-uploaded':'Measured'} mobile performance ${a.performanceScore}/100 on the recorded site.`}:
  {service:'website_design',strength:'weak',eligible:true,reason:'Audit flagged gaps, but mobile performance was not below 50.'};
 const gbpEval:ServiceEval=gbp==='recorded'?
  {service:'gbp',strength:'weak',eligible:true,reason:'A GBP link is recorded; its completeness has not been assessed.'}:
  has(i.street)?{service:'gbp',strength:'moderate',eligible:true,reason:'Street address recorded for a physical location; GBP not yet confirmed (a missing link does not prove there is no GBP).'}:
  {service:'gbp',strength:'unknown',eligible:true,reason:'No GBP link or street address recorded.'};
 const seo:ServiceEval=!site?{service:'local_seo',strength:'unknown',eligible:true,reason:'Local SEO needs a recorded website to inspect.'}:
  !a||a.status==='inconclusive'?{service:'local_seo',strength:'unknown',eligible:true,reason:'No conclusive SEO measurement recorded.'}:
  seoGap?{service:'local_seo',strength:measured(seoGap)?'strong':'moderate',eligible:true,
   reason:`${a.operatorSupplied?'Operator-uploaded':'Measured'} Lighthouse SEO score ${a.seoScore}/100.`}:
  {service:'local_seo',strength:'weak',eligible:true,reason:'Latest audit shows no SEO-score gap.'};
 const locations=(i.locationCount??0)>=2;
 const area=i.serviceAreaEvidence;
 const geo:ServiceEval=!locations&&!area?
  {service:'geolocation_pages',strength:'unknown',eligible:false,reason:'No recorded service-area or multi-location evidence.'}:
  {service:'geolocation_pages',strength:site?'moderate':'weak',eligible:true,
   reason:(locations?`${i.locationCount} locations recorded`:`Service area recorded: ${area}`)+(site?'; inspect the site for location pages.':'; no website recorded yet.')};
 return [web,gbpEval,seo,geo];
}

export function qualifyProspect(i:QualificationInput):Qualification{
 const presence=classifyWebPresence(i.websiteUrl);
 const site=presence.kind==='website';
 const profileKind=classifyWebPresence(i.profileUrl).kind;
 const profile=presence.kind==='social'||presence.kind==='listing'||profileKind==='social'||profileKind==='listing';
 const websitePresence:WebsitePresence=site?'official_site_recorded':profile?'social_only':'none_recorded';
 const gbpKind=classifyWebPresence(i.gbpUrl).kind;
 const gbpStatus:GbpStatus=gbpKind==='listing'||gbpKind==='website'?'recorded':'unconfirmed';
 const researchStatus:ResearchStatus=i.imported?'imported':i.triageStatus;
 const excludedReason=i.triageStatus==='disqualified'?'Disqualified'+(has(i.disqualificationReason)?': '+i.disqualificationReason!.trim():'')+'.':
  i.operationalStatus==='closed'?'Marked closed; not a new lead.':
  i.pipelineStatus==='won'?'Existing client (won); manage as a client, not a new lead.':
  i.pipelineStatus==='lost'?'Previously lost; do not restart outreach automatically.':null;
 const evals=evaluate(i,site,profile,gbpStatus);
 const overridden:Qualification['overridden']=[];
 // Primary opportunity: strongest evidence, tie-broken by the campaign's target service.
 let primary:Opportunity,chosen:ServiceEval|undefined;
 const ov=i.overrides||{};
 if(ov.primaryOpportunity){primary=ov.primaryOpportunity;overridden.push('primaryOpportunity');chosen=evals.find(e=>e.service===primary);}
 else if(excludedReason){primary='no_clear_opportunity';}
 else{
  const ranked=evals.filter(e=>e.eligible).sort((x,y)=>rank[y.strength]-rank[x.strength]||
   (y.service===i.targetService?1:0)-(x.service===i.targetService?1:0)||order.indexOf(x.service)-order.indexOf(y.service));
  chosen=ranked[0];
  const nothingOpen=site&&i.audit?.status==='no_gaps'&&gbpStatus==='recorded'&&!evals[3].eligible;
  primary=nothingOpen?'no_clear_opportunity':!chosen||chosen.strength==='unknown'?'unknown':chosen.service;
  if(primary==='no_clear_opportunity'||primary==='unknown')chosen=primary==='unknown'?ranked.find(e=>e.service===i.targetService)??chosen:undefined;
 }
 const strength:Strength=excludedReason||primary==='no_clear_opportunity'?'weak':
  primary==='unknown'?'unknown':chosen?.strength??'unknown';
 // Evidence confidence: how much recorded, checkable evidence supports the record.
 let points=0;const official=/^boston-/.test(i.sourceType||'');
 if(has(i.sourceUrl))points++;
 if(official)points++;
 if(has(i.street)||has(i.postcode))points++;
 if(classifyIndustry(i.name,i.category).confidence==='category')points++;
 if(i.audit&&i.audit.status!=='inconclusive'&&!i.audit.operatorSupplied)points++;
 if(i.verificationStatus==='verified'&&i.operationalStatus==='operating')points+=2;
 let confidence:Confidence=points>=5?'high':points>=3?'medium':points>=1?'low':'unknown';
 if(i.duplicateWarning&&confidence==='high')confidence='medium';
 if(ov.evidenceConfidence){confidence=ov.evidenceConfidence;overridden.push('evidenceConfidence');}
 const reach=has(i.phone)||has(i.email);
 const readiness:Readiness=reach&&has(i.contactName)?'ready':reach||site||profile?'partial':'not_ready';
 // Next action: the cheapest step that removes the biggest remaining unknown.
 let next:NextAction;
 if(excludedReason)next='none';
 else if(i.triageStatus==='held')next='hold';
 else if(i.duplicateWarning||!has(i.sourceUrl))next='verify_business';
 else if(primary==='no_clear_opportunity')next='hold';
 else if(primary==='gbp'&&gbpStatus==='unconfirmed')next='confirm_gbp';
 else if(primary==='geolocation_pages')next=site?'inspect_location_pages':'find_official_website';
 else if(!site&&primary!=='gbp')next='find_official_website';
 else if(site&&(primary==='unknown'||((primary==='website_design'||primary==='local_seo')&&(!i.audit||i.audit.status==='inconclusive'))))next='inspect_website';
 else if(primary==='unknown')next='verify_business';
 else if(readiness!=='ready')next='find_decision_maker';
 else if(researchStatus==='imported'&&primary==='website_design')next='generate_website_demo';
 else next='prepare_opportunity_brief';
 if(ov.nextAction){next=ov.nextAction;overridden.push('nextAction');}
 const reasons:string[]=[];
 if(excludedReason)reasons.push(excludedReason);
 if(chosen)reasons.push(chosen.reason);
 else if(primary==='no_clear_opportunity'&&!excludedReason)reasons.push('Website audited with no measured gaps and a GBP link is recorded.');
 else if(primary==='unknown')reasons.push('Not enough recorded evidence to name an opportunity.');
 if(websitePresence==='none_recorded'&&chosen?.service!=='website_design')reasons.push('No website recorded (not proof there is none).');
 if(gbpStatus==='unconfirmed'&&chosen?.service!=='gbp')reasons.push('GBP not confirmed.');
 if(i.duplicateWarning)reasons.push('Possible duplicate of a CRM record; check before importing.');
 if(overridden.length)reasons.push('Manually set: '+overridden.map(x=>x==='primaryOpportunity'?'opportunity':x==='evidenceConfidence'?'confidence':'next action').join(', ')+'.');
 const rationale=(opportunityLabels[primary]+' · '+strengthLabels[strength]+': '+(reasons[0]||'')).slice(0,400);
 return {researchStatus,websitePresence,gbpStatus,primaryOpportunity:primary,opportunityStrength:strength,
  evidenceConfidence:confidence,contactReadiness:readiness,nextAction:next,rationale,reasons,
  isPriorityLead:!excludedReason&&i.triageStatus!=='held'&&(strength==='strong'||strength==='moderate'),
  excludedReason,overridden};
}

// ---- Adapters: staged discovery rows and CRM businesses ----
const str=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():null;
function pickRaw(raw:Record<string,unknown>|null|undefined,keys:string[]):string|null{
 for(const k of keys){const v=str(raw?.[k]);if(v)return v;}
 return null;
}
const oneOf=<T extends string>(list:readonly T[],v:unknown):T|null=>list.includes(v as T)?v as T:null;
export type StagedRowForQualification={
 name:string|null;city:string|null;category:string|null;website_url:string|null;phone:string|null;
 source_url:string|null;source_type:string|null;review_status:string;raw_data:Record<string,unknown>|null;
 triage_status?:string|null;primary_opportunity_override?:string|null;evidence_confidence_override?:string|null;
 next_action_override?:string|null;disqualification_reason?:string|null;
};
export function qualifyStagedRow(row:StagedRowForQualification,opts:{targetService:TargetService|null;duplicateWarning:boolean}):Qualification{
 const raw=row.raw_data||{};
 const street=[pickRaw(raw,['housenumber','streetnumber']),pickRaw(raw,['street','streetaddress','address'])].filter(Boolean).join(' ')||null;
 const count=Number(pickRaw(raw,['locationcount','locations','numberoflocations']));
 return qualifyProspect({
  name:row.name||'',category:row.category,city:row.city,street:pickRaw(raw,['street','streetaddress','address'])?street:null,
  postcode:pickRaw(raw,['postcode','postalcode','zipcode','zip']),
  websiteUrl:row.website_url,profileUrl:pickRaw(raw,['discovered_social_profile_url']),
  gbpUrl:pickRaw(raw,['googlebusinessurl','gbpurl','googlebusinessprofile','googlemapsurl']),
  sourceUrl:row.source_url,sourceType:row.source_type,phone:row.phone,
  email:pickRaw(raw,['email','contactemail']),contactName:pickRaw(raw,['contactname','owner','ownername']),
  serviceAreaEvidence:serviceAreaEvidence(pickRaw(raw,['servicearea','serviceareas']),str(raw.search_area)),
  locationCount:Number.isInteger(count)&&count>0?count:null,
  triageStatus:oneOf(['review_needed','shortlisted','held','disqualified'] as const,row.triage_status)??'review_needed',
  imported:row.review_status==='imported'||row.review_status==='duplicate',
  disqualificationReason:row.disqualification_reason,duplicateWarning:opts.duplicateWarning,audit:null,
  targetService:opts.targetService,
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
export function qualifyBusiness(b:BusinessForQualification,opts:{
 audit:AuditSummary|null;sourceUrl:string|null;sourceType:string|null;profileUrl:string|null;targetService:TargetService|null
}):Qualification{
 return qualifyProspect({
  name:b.name,category:b.category,city:b.city,street:b.street_address??null,postcode:b.postal_code??null,
  websiteUrl:b.website_url,profileUrl:opts.profileUrl,gbpUrl:b.google_business_url??null,
  sourceUrl:opts.sourceUrl,sourceType:opts.sourceType,phone:b.phone,email:b.contact_email,contactName:b.contact_name??null,
  serviceAreaEvidence:serviceAreaEvidence(b.service_area),locationCount:null,
  verificationStatus:b.verification_status,operationalStatus:b.operational_status,pipelineStatus:b.pipeline_status,
  triageStatus:'shortlisted',imported:true,duplicateWarning:false,audit:opts.audit,targetService:opts.targetService,
  overrides:{primaryOpportunity:oneOf(OPPORTUNITIES,b.primary_opportunity),
   evidenceConfidence:oneOf(CONFIDENCES,b.evidence_confidence),nextAction:oneOf(NEXT_ACTIONS,b.next_action)}
 });
}
