export type QualityDimension='contentAccuracy'|'conversion'|'informationArchitecture'|'visualSpecificity'|'accessibility'|'performanceReadiness';
export type QualityEvaluation={
 score:number;threshold:number;accepted:boolean;
 dimensions:Record<QualityDimension,number>;
 failures:string[];evidence:string[];
 /** 0-100 is a deterministic blueprint preflight, not an aesthetic grade. */
 scoreScope:'blueprint-preflight';
 /** These require independent real-browser and human assessment. */
 unverified:['rendered visual quality','runtime performance','client acceptance'];
};

type CitedFact={text?:string|null;amount?:string|null;source?:string|null;sourceUrl?:string|null};
type ReviewFact={quote?:string|null;author?:string|null;source?:string|null;sourceUrl?:string|null};

type EvaluatedSite={
 businessName:string;headline:string;description:string;services:string[];
 contact:{phone:string|null;email:string|null};
 content:{about:string;sourceUrl:string|null;appointmentUrl:string|null;factStatus:string;heroTreatment:string;images:Array<{role:string;permission:string;alt:string}>};
 design:{composition?:string;prominentNav:boolean;motionPlan?:{
  required?:boolean;pageEntry?:string;sectionReveal?:string;mediaMotion?:string;navigationMotion?:string
 }};
 /** Required exact sentence for every site that is not an owner-approved export. */
 internalDisclaimer?:string;
 /** Required for every site that is not an owner-approved export. */
 noindex?:boolean;
 robots?:string|null;
 prices?:CitedFact[];
 hours?:CitedFact[];
 reviews?:ReviewFact[];
};

// The exporter's owner-approval gate is separate. This preflight must not set it.
export const INTERNAL_CONCEPT_DISCLAIMER='Internal concept, not endorsed by the business';

// Defense in depth: the original blueprint sanitizer validates public URLs, but
// this evaluator must reject unsafe destinations even when called directly.
function safePublicDestination(value:string|null|undefined):boolean{
 if(!value||value.length>1600)return false;
 try{
  const u=new URL(value);
  return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password&&
   u.hostname.includes('.')&&!u.hostname.includes(':')&&
   !/(^|\.)(localhost|local|internal|test|invalid)$/.test(u.hostname)&&
   !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(u.hostname);
 }catch{return false;}
}

const blankCitation=/^(?:n\/a|na|none|unknown|tbd|todo|placeholder|unknown\s*\/\s*to confirm)$/i;
function cited(source:string|null|undefined,sourceUrl:string|null|undefined):boolean{
 const label=(source??'').trim();
 if(label.length>=3&&!blankCitation.test(label))return true;
 return safePublicDestination(sourceUrl);
}
const placeholderCopy=/\blorem ipsum\b|\bdolor sit amet\b|\bplaceholder\b|\byour text here\b|\bcoming soon\b|\bexample data\b|\btbd\b|\btodo\b|\[(?:insert|business name|your [^\]]+)\]|\bxxx+\b|\bsample text\b|\bthis is a test\b/i;
const genericCopy=/expertise organized around what comes next|a more useful introduction to the business|a better way to meet your next customer|make every first impression count|explore a modern online introduction to this business|talk directly with the team|request information|what we offer|services and expertise|your trusted partner|world[- ]class|best in town|one[- ]stop shop|we pride ourselves|quality you can trust|state[- ]of[- ]the[- ]art|\blocal business\b|care starts with a clearer first step|outdoor spaces worth coming home to/i;
const priceProse=/\$\s?\d|\b\d{1,4}\.\d{2}\s*(?:dollars|usd)\b|\b(?:priced?|pricing)\s+at\s+\$?\d/i;
const hoursProse=/\b(?:open|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b[^.\n]{0,60}\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)\b/i;
const reviewProse=/\b\d(?:\.\d)?\s*-?\s*stars?\b|\brated\s+\d(?:\.\d)?\b|\btestimonial\b|\bcustomers?\s+say\b|\breviews?\s+say\b|[“"][^“”"]{12,}[”"]/i;

function proseHasCitation(copy:string):boolean{
 return /https?:\/\//i.test(copy)||/\bsource\s*:/i.test(copy);
}

// Deterministic preflight. Browser/Lighthouse checks are recorded separately because
// pretending an unrendered blueprint has measured performance would be misleading.
export function evaluateSiteBlueprint(site:EvaluatedSite,threshold=78):QualityEvaluation{
 const approved=site.content.images.filter(x=>x.permission==='approved');
 const safeAppointment=site.content.appointmentUrl===null||safePublicDestination(site.content.appointmentUrl);
 const contact=Boolean(site.contact.phone||site.contact.email||(site.content.appointmentUrl&&safeAppointment));
 const sourced=safePublicDestination(site.content.sourceUrl)&&site.content.factStatus!=='unreviewed';
 const copyText=[site.headline,site.description,site.content.about,...site.services].join('\n');
 const placeholder=placeholderCopy.test(copyText);
 const generic=genericCopy.test(copyText);
 const specificCopy=!placeholder&&!generic&&site.headline.trim().length>=18&&site.description.trim().length>=35&&site.content.about.trim().length>=45;
 const services=site.services.length>=1;
 const imageReady=site.content.heroTreatment!=='photo-led'||approved.some(x=>x.role==='hero');
 const altReady=approved.every(x=>x.alt.trim().length>=5);
 const motionReady=site.design.motionPlan?.required===true&&
  [site.design.motionPlan.pageEntry,site.design.motionPlan.sectionReveal,
   site.design.motionPlan.mediaMotion,site.design.motionPlan.navigationMotion].every(Boolean);
 const internal=site.content.factStatus!=='owner_approved';
 const disclaimer=(site.internalDisclaimer??'').includes(INTERNAL_CONCEPT_DISCLAIMER);
 const noindex=site.noindex===true||(site.robots??'').toLowerCase().includes('noindex');
 const proseCited=proseHasCitation(copyText);
 const prices=[...(site.prices??[])];
 const hours=[...(site.hours??[])];
 const reviews=[...(site.reviews??[])];
 const unsourcedPrice=prices.some(item=>!cited(item.source,item.sourceUrl))||(!proseCited&&priceProse.test(copyText));
 const unsourcedHours=hours.some(item=>!cited(item.source,item.sourceUrl))||(!proseCited&&hoursProse.test(copyText));
 const unsourcedReview=reviews.some(item=>!(item.quote??'').trim()||!(item.author??'').trim()||!cited(item.source,item.sourceUrl))||(!proseCited&&reviewProse.test(copyText));
 const dimensions:QualityEvaluation['dimensions']={
  contentAccuracy:(sourced&&!unsourcedPrice&&!unsourcedHours&&!unsourcedReview?16:4)+(site.content.factStatus==='owner_approved'?4:0),
  conversion:(contact?14:2)+(site.content.appointmentUrl?4:0)+(site.design.prominentNav?2:0),
  informationArchitecture:(services?12:4)+(site.content.about?6:0)+(contact?2:0),
  visualSpecificity:(specificCopy?10:3)+(site.design.composition?5:0)+(imageReady?5:0),
  accessibility:(altReady?10:4)+(site.businessName&&site.headline?5:0),
  performanceReadiness:approved.length<=8?5:2,
 };
 const score=Math.min(100,Object.values(dimensions).reduce((a,b)=>a+b,0));
 const failures:string[]=[];
 if(!sourced)failures.push('Business claims are not tied to a reviewed, safe public source URL.');
 if(!safeAppointment)failures.push('The appointment destination is not a safe public URL.');
 if(!services)failures.push('Confirm at least one real service for a useful service path.');
 if(!contact)failures.push('No verified conversion destination is available.');
 if(placeholder)failures.push('Copy uses placeholder text.');
 else if(!specificCopy)failures.push(generic?'Copy uses generic template language.':'Copy is too thin or generic to pass the specificity gate.');
 if(!imageReady)failures.push('The chosen photo-led composition lacks an approved hero image.');
 if(!altReady)failures.push('Every approved image needs meaningful alternative text.');
 if(!motionReady)failures.push('Every generated site requires an integrated page, section, media, and navigation motion system.');
 if(internal&&!disclaimer)failures.push('Internal concept is missing the disclaimer "Internal concept, not endorsed by the business".');
 else if(!(site.internalDisclaimer??'').trim())failures.push('The site is missing a disclaimer.');
 if(internal&&!noindex)failures.push('Internal concept is missing noindex.');
 if(unsourcedPrice)failures.push('A price is stated without a source.');
 if(unsourcedHours)failures.push('Hours are stated without a source.');
 if(unsourcedReview)failures.push('A review is missing a quote, author, or source.');
 return {score,threshold,accepted:score>=threshold&&failures.length===0,dimensions,failures,
  scoreScope:'blueprint-preflight',
  unverified:['rendered visual quality','runtime performance','client acceptance'],
  evidence:[`${site.services.length} confirmed service${site.services.length===1?'':'s'}`,
   `${approved.length} approved image${approved.length===1?'':'s'}`,
   contact?'Verified conversion destination present':'Conversion destination absent',
   motionReady?'Required integrated motion system present':'Required motion system missing',
   internal?(disclaimer?'Required internal-concept disclaimer present':'Required internal-concept disclaimer missing'):'Owner-approved export is outside the internal-concept disclaimer gate',
   internal?(noindex?'noindex present':'noindex missing'):'Owner-approved export is outside the internal-concept noindex gate',
   unsourcedPrice||unsourcedHours||unsourcedReview?'Unsourced price, hours, or review present':'No unsourced price, hours, or review detected',
   placeholder?'Placeholder copy present':generic?'Generic template copy present':'Placeholder or generic template copy not detected',
   'Runtime speed and responsive behavior still require rendered-page testing']};
}
