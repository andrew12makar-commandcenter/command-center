// Reusable source-of-truth between a private sales concept and a future
// customer-approved site. No network scraping, invented facts, or asset licensing.
import type {DemoCopy,Template} from './demo-engine.ts';
import {classifyWebPresence} from './web-presence.ts';

export type ImageRole='hero'|'gallery'|'team'|'logo';
export type ImagePermission='reference_only'|'approved';
export type SiteImage={
  url:string;alt:string;sourceUrl:string;role:ImageRole;
  permission:ImagePermission;credit?:string;
};
export type ResearchPage={url:string;title:string;description:string;headings:string[];excerpts:string[]};
export type SiteContent={
  researchPages:ResearchPage[];
  researchedAt:string|null;
  about:string;
  audience:string;
  appointmentUrl:string|null;
  sourceUrl:string|null;
  factStatus:'unreviewed'|'researched'|'owner_approved';
  images:SiteImage[];
  heroTreatment:'photo-led'|'typographic';
};
export type SiteContact={phone:string|null;email:string|null;city:string|null};
export type SiteBlueprint={
  version:1;template:Template;businessName:string;
  eyebrow:string;headline:string;description:string;
  primaryAction:string;secondaryAction:string;
  services:string[];contact:SiteContact;content:SiteContent;
  internalDisclaimer:string;
  quality:{previewReady:boolean;publishReady:boolean;blockers:string[]};
  design:{variant:'editorial'|'bold';compact:boolean;prominentNav:boolean};
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
export function safeImage(raw:Partial<SiteImage>):SiteImage|null{
 const url=safePublicUrl(raw.url),sourceUrl=safePublicUrl(raw.sourceUrl);
 const role:ImageRole=['hero','gallery','team','logo'].includes(raw.role||'')?
  raw.role as ImageRole:'gallery';
 if(!url||!sourceUrl)return null;
 return {url,sourceUrl,role,alt:asText(raw.alt,180)||'Business imagery',
  permission:raw.permission==='approved'?'approved':'reference_only',
  credit:asText(raw.credit,140)||undefined};
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
   headings:Array.isArray(p.headings)?p.headings.slice(0,24).map(x=>asText(x,140)).filter(Boolean):[],
   excerpts:Array.isArray(p.excerpts)?p.excerpts.slice(0,7).map(x=>asText(x,230)).filter(Boolean):[]
  };
 }).filter(p=>Boolean(p.url));
 const stamp=typeof o.researchedAt==='string'&&Number.isFinite(Date.parse(o.researchedAt))?o.researchedAt:null;
 const seen=new Set<string>();
 return {
  researchPages,researchedAt:stamp,
  about:asText(o.about,1100),audience:asText(o.audience,200),
  appointmentUrl:safePublicUrl(o.appointmentUrl),
  sourceUrl:safePublicUrl(o.sourceUrl),
  factStatus:o.factStatus==='owner_approved'?'owner_approved':
    o.factStatus==='researched'?'researched':'unreviewed',
  images:images.filter(x=>{const k=x.url+'|'+x.role;if(seen.has(k))return false;seen.add(k);return true;}),
  heroTreatment:o.heroTreatment==='photo-led'?'photo-led':'typographic'
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
 const publishReady=content.factStatus==='owner_approved'&&blockers.length===0;
 return {
  version:1,template,businessName:asText(copy.brand,140)||asText(business.name,140),
  eyebrow:asText(copy.eyebrow,140),
  headline:asText(copy.headline,200),
  description:asText(copy.description,800),
  primaryAction:asText(copy.primaryAction,80)||'Get in touch',
  secondaryAction:asText(copy.secondaryAction,80)||'Explore services',
  services,contact,content,
  internalDisclaimer:asText(copy.disclaimer,400)||
   'Independent private design concept; not endorsed or published by the business.',
  quality:{previewReady,publishReady,blockers},
  design:{variant:copy.design?.variant==='bold'?'bold':'editorial',
   compact:Boolean(copy.design?.compact),prominentNav:Boolean(copy.design?.prominentNav)}
 };
}
