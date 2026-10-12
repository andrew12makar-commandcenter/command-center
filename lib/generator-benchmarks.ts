import {createDraft,defaultPreferences,type Template} from './demo-engine.ts';
import {buildSiteBlueprint,type SiteBlueprint} from './site-blueprint.ts';

export type BenchmarkCase={
 id:string;vertical:Template;holdout:boolean;name:string;city:string;
 category:string;services:string[];about:string;conversion:'booking'|'call'|'estimate'|'contact';
};

// Synthetic fixtures exercise structure only. They are never presented as real businesses
// and contain no copied claims, identities, testimonials, or third-party assets.
export const generatorBenchmarks:BenchmarkCase[]=[
 {id:'dental-core',vertical:'medical',holdout:false,name:'Harbor Dental Studio',city:'Brighton',category:'dentist',services:['Preventive care','Restorative consultations','Emergency visits'],about:'A fictional neighborhood dental practice fixture used to test clear service navigation, trust context, and booking pathways.',conversion:'booking'},
 {id:'medical-core',vertical:'medical',holdout:false,name:'Northfield Family Health',city:'Cambridge',category:'primary care',services:['Primary care visits','Preventive screenings','Care coordination'],about:'A fictional medical-practice fixture used to test accessible information architecture and a restrained, patient-centered presentation.',conversion:'booking'},
 {id:'landscape-core',vertical:'landscaping',holdout:false,name:'Stone and Stem',city:'Newton',category:'landscaping',services:['Landscape design','Seasonal maintenance','Hardscape planning'],about:'A fictional landscape company fixture used to test visual proof, service-area clarity, and estimate-focused conversion.',conversion:'estimate'},
 {id:'service-core',vertical:'universal',holdout:false,name:'Common Thread Studio',city:'Boston',category:'professional services',services:['Strategy sessions','Project delivery','Ongoing support'],about:'A fictional service-business fixture used to test a premium introduction, scannable offerings, and a direct contact path.',conversion:'contact'},
 {id:'holdout-home',vertical:'universal',holdout:true,name:'Beacon Home Organizing',city:'Brookline',category:'home organizer',services:['In-home consultation','Room organization','Move planning'],about:'A fictional holdout fixture intentionally outside the core categories to test generalization without a bespoke template.',conversion:'call'},
 {id:'holdout-vet',vertical:'medical',holdout:true,name:'Charles River Veterinary Care',city:'Watertown',category:'veterinarian',services:['Wellness exams','Diagnostic visits','Senior pet care'],about:'A fictional holdout fixture used to test whether medical information patterns transfer without inventing provider or treatment claims.',conversion:'booking'}
];

export function buildBenchmark(caseData:BenchmarkCase):SiteBlueprint{
 const draft=createDraft(caseData.name,caseData.city,caseData.category,caseData.vertical,defaultPreferences());
 draft.headline=caseData.vertical==='landscaping'?'Thoughtful landscapes, built around daily life.':
  caseData.vertical==='medical'?'Clear information for a more confident next step.':'Expert help, organized around what comes next.';
 draft.description=`Explore ${caseData.services.length} verified fixture services and a clear path to ${caseData.conversion}. This copy exists only for generator testing.`;
 draft.services=caseData.services;
 draft.siteContent={...draft.siteContent!,about:caseData.about,sourceUrl:'https://example.org/benchmark-source',appointmentUrl:'https://example.org/contact',factStatus:'owner_approved'};
 draft.design={...draft.design!,prominentNav:true};
 return buildSiteBlueprint(caseData.vertical,draft,{name:caseData.name,city:caseData.city,phone:'617-555-0100'});
}

export function runBenchmarkCorpus(){
 return generatorBenchmarks.map(item=>{
  const site=buildBenchmark(item);
  return {id:item.id,vertical:item.vertical,holdout:item.holdout,composition:site.design.composition,
   score:site.quality.evaluation.score,accepted:site.quality.evaluation.accepted,failures:site.quality.evaluation.failures};
 });
}
