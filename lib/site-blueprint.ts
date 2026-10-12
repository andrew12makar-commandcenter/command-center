// Reusable source-of-truth between a private sales concept and a future
// customer-approved site. No network scraping, invented facts, or asset licensing.
import type {DemoCopy,Template,MotionPlan} from './demo-engine.ts';
import {evaluateSiteBlueprint,type QualityEvaluation} from './site-evaluation.ts';
import {buildServiceSpecificCopy} from './business-specific-copy.ts';
import type {ResearchInsight,ResearchInsightKind} from './research-intelligence.ts';

export type ImageRole='hero'|'gallery'|'team'|'logo';
export type ImagePermission='reference_only'|'approved'|'rejected';
export type SiteImage={
  url:string;alt:string;sourceUrl:string;role:ImageRole;
  permission:ImagePermission;credit?:string;rightsNote?:string;rightsReviewedAt?:string;
};
export type ResearchPage={url:string;title:string;description:string;headings:string[];excerpts:string[];themeColor?:string|null};
export type ImageAuthorization={
 mode:'generated_only'|'business_site_authorized'|'manual';
 acceptedAt:string|null;
 sourceHost:string|null;
};
export type SiteContent={
  researchPages:ResearchPage[];
  researchInsights:ResearchInsight[];
  researchedAt:string|null;
  about:string;
  audience:string;
  appointmentUrl:string|null;
  sourceUrl:string|null;
  factStatus:'unreviewed'|'researched'|'owner_approved';
  images:SiteImage[];
  heroTreatment:'photo-led'|'typographic';
  generatedImageryEnabled:boolean;
  imageAuthorization:ImageAuthorization;
};
export type SiteContact={phone:string|null;email:string|null;city:string|null};
export type SiteBlueprint={
  version:1;template:Template;businessName:string;
  eyebrow:string;headline:string;description:string;
  primaryAction:string;secondaryAction:string;
  services:string[];contact:SiteContact;content:SiteContent;
  internalDisclaimer:string;
  quality:{previewReady:boolean;publishReady:boolean;blockers:string[];evaluation:QualityEvaluation};
  design:{variant:'editorial'|'bold';compact:boolean;prominentNav:boolean;
   composition:'split-editorial'|'immersive'|'bento'|'service-index'|'centered'|'asymmetric';
   typography:'editorial'|'humanist'|'geometric';imageTreatment:'full-bleed'|'framed'|'mosaic'|'minimal';
   motion:'calm'|'cinematic'|'precise';
   motionPlan:MotionPlan;
   cardStyle:'bordered'|'numbered'|'flat';alignment:'left'|'center'|'offset';sectionOrder:string[]};
  narrative:{servicesHeading:string;servicesIntro:string;aboutHeading:string;contactHeading:string;processHeading:string};
};
export type SiteSource={name:string;city?:string|null;phone?:string|null;email?:string|null};

const asText=(x:unknown,max:number)=>typeof x==='string'?x.trim().slice(0,max):'';
export function safePublicUrl(raw:unknown):string|null {
 if(typeof raw!=='string'||raw.length>1600)return null;
 try{
  const u=new URL(raw.trim());
  if(!['https:','http:'].includes(u.protocol)||u.username||u.password||
     !u.hostname.includes('.')||/(^|\.)(localhost|local|internal|test|invalid)$/.test(u.hostname)||
     u.hostname.includes(':')||/^(?:\d{1,3}\.){3}\d{1,3}$/.test(u.hostname))
    return null;
  return u.toString();
 }catch{return null;}
}
const hostOf=(value:string|null)=>{try{return value?new URL(value).hostname.toLowerCase().replace(/^www\./,''):null;}catch{return null;}};
export function businessImageAuthorization(sourceUrl:string|null,accepted:boolean):ImageAuthorization{
 return accepted&&sourceUrl?{mode:'business_site_authorized',acceptedAt:new Date().toISOString(),sourceHost:hostOf(sourceUrl)}:
  {mode:'generated_only',acceptedAt:null,sourceHost:null};
}
export function canAutoUseBusinessImage(authorization:ImageAuthorization,sourceUrl:string):boolean{
 return authorization.mode==='business_site_authorized'&&Boolean(authorization.acceptedAt)&&
  Boolean(authorization.sourceHost)&&hostOf(safePublicUrl(sourceUrl))===authorization.sourceHost;
}
export function safeImage(raw:Partial<SiteImage>):SiteImage|null{
 const url=safePublicUrl(raw.url),sourceUrl=safePublicUrl(raw.sourceUrl);
 const role:ImageRole=['hero','gallery','team','logo'].includes(raw.role||'')?
  raw.role as ImageRole:'gallery';
 if(!url||!sourceUrl)return null;
 return {url,sourceUrl,role,alt:asText(raw.alt,180)||'Business imagery',
  permission:raw.permission==='approved'?'approved':raw.permission==='rejected'?'rejected':'reference_only',
  credit:asText(raw.credit,140)||undefined,
  rightsNote:asText(raw.rightsNote,500)||undefined,
  rightsReviewedAt:typeof raw.rightsReviewedAt==='string'&&Number.isFinite(Date.parse(raw.rightsReviewedAt))?raw.rightsReviewedAt:undefined};
}
export function cleanSiteContent(value:unknown):SiteContent{
 const o=value&&typeof value==='object'?value as Record<string,unknown>:{};
 const raw=Array.isArray(o.images)?o.images.slice(0,24):[];
 const images=raw.map(x=>x&&typeof x==='object'?safeImage(x as Partial<SiteImage>):null)
  .filter((x):x is SiteImage=>Boolean(x));
 const research=Array.isArray(o.researchPages)?o.researchPages.slice(0,5):[];
 const researchPages:ResearchPage[]=research.map(item=>{
  const p=item&&typeof item==='object'?item as Record<string,unknown>:{};
  return {
   url:safePublicUrl(p.url)||'',
   title:asText(p.title,170),description:asText(p.description,280),
   // Sanitized HTML theme metadata is a *reference cue*, never an approved brand color.
   themeColor:typeof p.themeColor==='string'&&/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(p.themeColor)?p.themeColor.toLowerCase():null,
   headings:Array.isArray(p.headings)?p.headings.slice(0,24).map(x=>asText(x,140)).filter(Boolean):[],
   excerpts:Array.isArray(p.excerpts)?p.excerpts.slice(0,7).map(x=>asText(x,230)).filter(Boolean):[]
  };
 }).filter(p=>Boolean(p.url));
 const rawInsights=Array.isArray(o.researchInsights)?o.researchInsights.slice(0,60):[];
 const insightKinds:ResearchInsightKind[]=['service','team','gallery','trust','faq','booking','contact'];
 const researchInsights:ResearchInsight[]=rawInsights.map((item,index)=>{
  const insight=item&&typeof item==='object'?item as Record<string,unknown>:{},sourceUrl=safePublicUrl(insight.sourceUrl);
  const kind=insightKinds.includes(insight.kind as ResearchInsightKind)?insight.kind as ResearchInsightKind:null;
  if(!sourceUrl||!kind)return null;
  return {id:asText(insight.id,80)||String(index),kind,label:asText(insight.label,140),
   detail:asText(insight.detail,260),sourceUrl,status:insight.status==='reviewed'?'reviewed':'candidate'};
 }).filter((x):x is ResearchInsight=>Boolean(x&&x.label));
 const stamp=typeof o.researchedAt==='string'&&Number.isFinite(Date.parse(o.researchedAt))?o.researchedAt:null;
 const rawAuthorization=o.imageAuthorization&&typeof o.imageAuthorization==='object'?o.imageAuthorization as Record<string,unknown>:{};
 const authorizationMode=['business_site_authorized','manual'].includes(String(rawAuthorization.mode))?
  rawAuthorization.mode as ImageAuthorization['mode']:'generated_only';
 const authorizationStamp=typeof rawAuthorization.acceptedAt==='string'&&Number.isFinite(Date.parse(rawAuthorization.acceptedAt))?rawAuthorization.acceptedAt:null;
 const authorizationHost=typeof rawAuthorization.sourceHost==='string'&&/^[a-z0-9.-]+$/i.test(rawAuthorization.sourceHost)?rawAuthorization.sourceHost.toLowerCase().replace(/^www\./,''):null;
 const seen=new Set<string>();
 return {
  researchPages,researchInsights,researchedAt:stamp,
  about:asText(o.about,1100),audience:asText(o.audience,200),
  appointmentUrl:safePublicUrl(o.appointmentUrl),
  sourceUrl:safePublicUrl(o.sourceUrl),
  factStatus:o.factStatus==='owner_approved'?'owner_approved':
    o.factStatus==='researched'?'researched':'unreviewed',
  images:images.filter(x=>{const k=x.url+'|'+x.role;if(seen.has(k))return false;seen.add(k);return true;}),
  heroTreatment:o.heroTreatment==='photo-led'?'photo-led':'typographic',
  generatedImageryEnabled:o.generatedImageryEnabled!==false,
  imageAuthorization:{mode:authorizationMode,acceptedAt:authorizationStamp,sourceHost:authorizationHost}
 };
}
export function buildSiteBlueprint(
 template:Template,copy:Partial<DemoCopy>,business:SiteSource
):SiteBlueprint{
 const content=cleanSiteContent(copy.siteContent);
 // Legacy hero URLs from old drafts are not silently considered licensed.
 // They can be reviewed and explicitly approved in the content editor.
 if(copy.heroImageUrl&&!content.images.some(i=>i.role==='hero'&&i.url===copy.heroImageUrl)){
  const url=safePublicUrl(copy.heroImageUrl);
  if(url){
   const source=safePublicUrl(copy.siteContent?.sourceUrl)||url;
   const maybe=safeImage({url,sourceUrl:source,role:'hero',permission:'reference_only',
     alt:'Business hero photograph for review'});
   if(maybe)content.images.unshift(maybe);
  }
 }
 const approved=content.images.filter(i=>i.permission==='approved');
 const hero=approved.find(i=>i.role==='hero');
 const hasApprovedHero=Boolean(hero);
 const services=(copy.services??[]).filter(x=>typeof x==='string')
  .map(x=>asText(x,110)).filter(Boolean).slice(0,8);
 const contact:SiteContact={
  phone:asText(business.phone,80)||null,email:asText(business.email,140)||null,
  city:asText(business.city,100)||null
 };
 const blockers:string[]=[];
 if(!content.about)blockers.push('Add a sourced, business-specific About statement.');
 if(!services.length)blockers.push('Confirm actual services and enter them into the content pack.');
 if(content.heroTreatment==='photo-led'&&!hasApprovedHero)blockers.push('Photo-led layout needs an explicitly approved hero image.');
 if(!content.sourceUrl)blockers.push('Record the source URL for researched business information.');
 if(!contact.phone&&!contact.email&&!content.appointmentUrl)
  blockers.push('Confirm a working contact or appointment destination.');
 if(content.factStatus==='unreviewed')blockers.push('Review factual claims before any external preview.');
 if(content.factStatus!=='owner_approved')blockers.push('Obtain business-owner approval before a live client publication.');
 if(content.images.some(i=>i.permission==='reference_only'))
  blockers.push('Some collected image references have no confirmed display rights. Never publish them.');
 const previewReady=content.factStatus!=='unreviewed'&&services.length>0&&Boolean(content.about);
 const design={variant:copy.design?.variant==='bold'?'bold' as const:'editorial' as const,
   compact:Boolean(copy.design?.compact),prominentNav:Boolean(copy.design?.prominentNav),
   composition:copy.generationSpec?.composition??copy.design?.composition??'split-editorial',
   typography:copy.generationSpec?.typography??copy.design?.typography??'humanist',
   imageTreatment:copy.generationSpec?.imageTreatment??copy.design?.imageTreatment??'framed',
   motion:copy.generationSpec?.motion??(template==='medical'?'calm':template==='landscaping'?'cinematic':'precise'),
   motionPlan:copy.generationSpec?.motionPlan??{required:true as const,pageEntry:'soft-rise' as const,
    sectionReveal:'cascade' as const,mediaMotion:'masked-reveal' as const,
    navigationMotion:'underline-track' as const,staggerMs:90},
   cardStyle:copy.generationSpec?.cardStyle??copy.design?.cardStyle??'numbered',
   alignment:copy.generationSpec?.alignment??copy.design?.alignment??'left',
   sectionOrder:copy.generationSpec?.sectionOrder??['hero','services','about','contact']};
 const serviceText=services.join(' ').toLowerCase();
 const dental=template==='medical'&&/dental|dentistry|sedation|orthodont|invisalign/.test(serviceText);
 const place=contact.city?`A ${contact.city} practice`:'A local practice';
 const narrative=template==='medical'?{
   servicesHeading:dental?'Comfort-focused dentistry, clearly explained.':'Care options, clearly explained.',
   servicesIntro:dental?'Review the practice’s confirmed areas of dental care before requesting an appointment.':'Review confirmed care options before contacting the practice.',
   aboutHeading:dental?`${place} centered on clarity and comfort.`:'A clearer introduction to the practice.',
   contactHeading:dental?'Ready to plan your visit?':'Take the next step with the practice.',
   processHeading:'A simpler path from questions to an appointment.'
  }:template==='landscaping'?{
   servicesHeading:'Outdoor work, organized around your property.',
   servicesIntro:'Review confirmed capabilities before starting a project conversation.',
   aboutHeading:'A closer look at the company behind the work.',
   contactHeading:'Start a conversation about your property.',
   processHeading:'From first conversation to a clearer project plan.'
  }:{
   servicesHeading:'Expertise organized around what comes next.',
   servicesIntro:'Review the business’s confirmed services and choose the most relevant next step.',
   aboutHeading:'A more useful introduction to the business.',
   contactHeading:'Talk directly with the team.',
   processHeading:'A direct path from interest to action.'
  };
 const businessName=asText(copy.brand,140)||asText(business.name,140);
 // An untouched generated headline can be rewritten from reviewed service
 // information. Custom owner/user-authored headlines are preserved.
 const specific=buildServiceSpecificCopy({
  headline:asText(copy.headline,200),description:asText(copy.description,800),
  services,city:contact.city,businessName,factsReviewed:content.factStatus!=='unreviewed'
 });
 const candidate={
  version:1 as const,template,businessName:asText(copy.brand,140)||asText(business.name,140),
  eyebrow:asText(copy.eyebrow,140),
  headline:specific.headline,
  description:specific.description,
  primaryAction:asText(copy.primaryAction,80)||'Get in touch',
  secondaryAction:asText(copy.secondaryAction,80)||'Explore services',
  services,contact,content,
  internalDisclaimer:asText(copy.disclaimer,400)||
   'Independent private design concept; not endorsed or published by the business.',
  design,narrative
 };
 const evaluation=evaluateSiteBlueprint(candidate);
 for(const failure of evaluation.failures)if(!blockers.includes(failure))blockers.push(failure);
 const publishReady=content.factStatus==='owner_approved'&&blockers.length===0&&evaluation.accepted;
 return {...candidate,quality:{previewReady,publishReady,blockers,evaluation}};
}
