import {classifyIndustry,researchPriority} from './business-classification.ts';

// A triage board is NOT a sales conversion probability or verified client budget.
export type OpportunityBusiness={
 id:string;name:string;category:string|null;city:string|null;
 service_area:string|null;website_url:string|null;
 verification_status:string;operational_status:string;pipeline_status:string;
 priority_score:number|null;phone:string|null;contact_email:string|null;
};
export type AuditRecord={
 business_id:string;website_url:string|null;status:string;assessed_at:string;
 findings:Record<string,unknown>|null;
};
export type BoardStage='technical_review'|'verify_business'|'audit_website'|'research_website'|'no_measured_gaps'|'inconclusive'|'inactive';
export type BoardItem={
 business:OpportunityBusiness;stage:BoardStage;
 technicalScore:number|null;researchScore:number;reason:string;
 measuredAt:string|null;verified:boolean;
};
const ninetyDays=90*24*60*60*1000;
function sameWebsite(a:string,b:string):boolean{
 try{
  const u=new URL(a),v=new URL(b);
  // Query strings are not a new site, but a different host is.
  const hostMatch=u.hostname.toLowerCase().replace(/^www\./,'')===v.hostname.toLowerCase().replace(/^www\./,'');
  const path=(value:URL)=>value.pathname.replace(/\/+$/,'')||'/';
  return hostMatch&&path(u)===path(v);
 }catch{return false;}
}
export function currentAudit(
 business:OpportunityBusiness,audits:AuditRecord[],now=new Date()
):AuditRecord|null{
 const website=business.website_url;
 if(!website)return null;
 return audits.filter(a=>a.business_id===business.id
  && !!a.website_url&&sameWebsite(website,a.website_url)
  && Number.isFinite(Date.parse(a.assessed_at))
  && now.getTime()-Date.parse(a.assessed_at)>=0
  && now.getTime()-Date.parse(a.assessed_at)<=ninetyDays)
  .sort((a,b)=>b.assessed_at.localeCompare(a.assessed_at))[0]??null;
}
function scoreFromAudit(a:AuditRecord):number|null{
 const value=a.findings?.technical_opportunity_score;
 return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100
  ?Math.round(value):null;
}
export function scoreOpportunity(
 business:OpportunityBusiness,audits:AuditRecord[],now=new Date()
):BoardItem{
 const verified=business.verification_status==='verified'&&business.operational_status==='operating';
 const latest=currentAudit(business,audits,now);
 const technicalScore=latest?.status==='verified_gaps'?scoreFromAudit(latest):null;
 const industry=classifyIndustry(business.name,business.category);
 const researchScore=researchPriority(business.name,business.category,business.website_url,null,business.city);
 const sector=industry.confidence==='unknown'?'Industry not classified':industry.template==='medical'?
  'Medical/clinical sector hint':industry.template==='landscaping'?'Home/field-services sector hint':'Other recorded industry';
 let stage:BoardStage,reason:string;
 if(business.operational_status==='closed'||business.pipeline_status==='won'||business.pipeline_status==='lost'){
  stage='inactive';
  reason=business.operational_status==='closed'?'Marked closed in CRM; do not prospect without reconfirmation.':
   business.pipeline_status==='won'?'Already won in the sales pipeline; manage as a client rather than a new prospect.':
   'Previously marked lost; do not automatically restart outreach.';
 }else if(!business.website_url){
  stage='research_website';
  reason=sector+'; no website recorded, which does not prove absence.';
 }else if(!latest){
  stage='audit_website';
  reason='Recorded website has no recent matching PageSpeed audit. Check ownership and assess.';
 }else if(latest.status==='inconclusive'||(latest.status==='verified_gaps'&&technicalScore===null)){
  stage='inconclusive';
  reason='Latest matched audit is incomplete. Do not infer poor technical quality.';
 }else if(latest.status==='no_gaps'){
  stage='no_measured_gaps';
  reason='No gaps in the limited latest Lighthouse checks. Other improvements may exist.';
 }else if(!verified){
  stage='verify_business';
  reason='Measured technical improvement signal, but current operating status and source verification are not both confirmed.';
 }else{
  stage='technical_review';
  reason='Verified operating business with a recent Lighthouse technical improvement signal. Confirm owner needs and commercial fit before outreach.';
 }
 return {business,stage,technicalScore,researchScore,reason,
  measuredAt:latest?.assessed_at??null,verified};
}
const stageOrder:Record<BoardStage,number>={
 technical_review:0,verify_business:1,audit_website:2,research_website:3,
 inconclusive:4,no_measured_gaps:5,inactive:6
};
export function sortOpportunities(items:BoardItem[]):BoardItem[]{
 return [...items].sort((a,b)=>stageOrder[a.stage]-stageOrder[b.stage]||
  (b.technicalScore??-1)-(a.technicalScore??-1)||
  b.researchScore-a.researchScore||
  a.business.name.localeCompare(b.business.name));
}
export const stageLabels:Record<BoardStage,string>={
 technical_review:'Verified · technical review',
 verify_business:'Technical gap · verification needed',
 audit_website:'Website audit needed',
 research_website:'Find / confirm website',
 inconclusive:'Inconclusive audit',
 no_measured_gaps:'No measured technical gaps',
 inactive:'Inactive / already handled'
};
