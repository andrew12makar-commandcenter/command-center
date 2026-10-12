export type QualityDimension='contentAccuracy'|'conversion'|'informationArchitecture'|'visualSpecificity'|'accessibility'|'performanceReadiness';
export type QualityEvaluation={
  score:number;threshold:number;accepted:boolean;
  dimensions:Record<QualityDimension,number>;
  failures:string[];evidence:string[];
};

type EvaluatedSite={
  businessName:string;headline:string;description:string;services:string[];
  contact:{phone:string|null;email:string|null};
  content:{about:string;sourceUrl:string|null;appointmentUrl:string|null;factStatus:string;heroTreatment:string;images:Array<{role:string;permission:string;alt:string}>};
  design:{composition?:string;prominentNav:boolean;motionPlan?:{
   required?:boolean;pageEntry?:string;sectionReveal?:string;mediaMotion?:string;navigationMotion?:string
  }};
};

// Deterministic preflight. Browser/Lighthouse checks are recorded separately because
// pretending an unrendered blueprint has measured performance would be misleading.
export function evaluateSiteBlueprint(site:EvaluatedSite,threshold=78):QualityEvaluation{
 const approved=site.content.images.filter(x=>x.permission==='approved');
 const contact=Boolean(site.contact.phone||site.contact.email||site.content.appointmentUrl);
 const sourced=Boolean(site.content.sourceUrl)&&site.content.factStatus!=='unreviewed';
 const specificCopy=site.headline.trim().length>=18&&site.description.trim().length>=35&&site.content.about.trim().length>=45;
 const services=site.services.length>=1;
 const imageReady=site.content.heroTreatment!=='photo-led'||approved.some(x=>x.role==='hero');
 const altReady=approved.every(x=>x.alt.trim().length>=5);
 const motionReady=site.design.motionPlan?.required===true&&
  [site.design.motionPlan.pageEntry,site.design.motionPlan.sectionReveal,
   site.design.motionPlan.mediaMotion,site.design.motionPlan.navigationMotion].every(Boolean);
 const dimensions:QualityEvaluation['dimensions']={
  contentAccuracy:(sourced?16:4)+(site.content.factStatus==='owner_approved'?4:0),
  conversion:(contact?14:2)+(site.content.appointmentUrl?4:0)+(site.design.prominentNav?2:0),
  informationArchitecture:(services?12:4)+(site.content.about?6:0)+(contact?2:0),
  visualSpecificity:(specificCopy?10:3)+(site.design.composition?5:0)+(imageReady?5:0),
  accessibility:(altReady?10:4)+(site.businessName&&site.headline?5:0),
  performanceReadiness:approved.length<=8?5:2,
 };
 const score=Math.min(100,Object.values(dimensions).reduce((a,b)=>a+b,0));
 const failures:string[]=[];
 if(!sourced)failures.push('Business claims are not tied to a reviewed source.');
 if(!services)failures.push('Confirm at least one real service for a useful service path.');
 if(!contact)failures.push('No verified conversion destination is available.');
 if(!specificCopy)failures.push('Copy is too thin or generic to pass the specificity gate.');
 if(!imageReady)failures.push('The chosen photo-led composition lacks an approved hero image.');
 if(!altReady)failures.push('Every approved image needs meaningful alternative text.');
 if(!motionReady)failures.push('Every generated site requires an integrated page, section, media, and navigation motion system.');
 return {score,threshold,accepted:score>=threshold&&failures.length===0,dimensions,failures,
  evidence:[`${site.services.length} confirmed service${site.services.length===1?'':'s'}`,
   `${approved.length} approved image${approved.length===1?'':'s'}`,
   contact?'Verified conversion destination present':'Conversion destination absent',
   motionReady?'Required integrated motion system present':'Required motion system missing',
   'Runtime speed and responsive behavior still require rendered-page testing']};
}
