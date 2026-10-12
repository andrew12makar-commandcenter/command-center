// Milestone definitions are kept in source control so engineering progress is reviewable.
// A code-verified baseline is not evidence of live customer validation.
export type ProjectKey='seo'|'mcat';
export type MilestoneStatus='completed'|'pending';
export type RoadmapRecord={step_id:string;status:MilestoneStatus;evidence_note?:string|null;updated_at?:string|null};
export type RoadmapStep={
 id:string;title:string;definition:string;href:string;
 baseline:MilestoneStatus;baselineEvidence?:string;
};
export type RoadmapStage={id:string;title:string;summary:string;steps:RoadmapStep[]};
export type RoadmapProject={id:ProjectKey;name:string;subtitle:string;goal:string;target:string;stages:RoadmapStage[]};
export type ActiveStep=RoadmapStep & {stageId:string;stageTitle:string;};
export type TrackedStep=RoadmapStep & {status:MilestoneStatus;evidence:string|null;updatedAt:string|null;};
export type TrackedStage=Omit<RoadmapStage,'steps'> & {steps:TrackedStep[];completed:number;total:number};
export type TrackedProject=Omit<RoadmapProject,'stages'> & {
 stages:TrackedStage[];completed:number;total:number;percent:number;
 current:ActiveStep|null;
};
const step=(id:string,title:string,definition:string,href:string,
 baseline:MilestoneStatus='pending',baselineEvidence?:string):RoadmapStep=>
 ({id,title,definition,href,baseline,baselineEvidence});

export const ROADMAP:RoadmapProject[]=[
 {id:'seo',name:'Local Business',subtitle:'Websites · SEO · Sales',goal:'A repeatable path from verified prospect to paying client',
 target:'First paying customer',stages:[
  {id:'foundation',title:'01 · Working foundation',summary:'Keep private infrastructure operational without rebuilding it.',steps:[
   step('seo-app','Private Command Center and source control','Authenticated Next.js workspace and development branch with successful CI.','/app','completed','Code and GitHub CI verified.'),
   step('seo-database','Business CRM and Supabase foundation','Persist real business records, contacts, sources and pipeline activity.','/app/leads','completed','Code implemented; prior local CRM test confirmed.'),
  ]},
  {id:'discovery',title:'02 · Credible business research',summary:'Prioritize real companies, not generated prospect counts.',steps:[
   step('seo-collector','Manual Brighton / Allston / Brookline discovery','Public-source collection stages candidates without claiming they are operating businesses.','/app/discovery','completed','Collectors tested; Brighton pilot previously staged 25 candidates.'),
   step('seo-intake','Review and verify discovery candidates','Independently review the pilot candidates, resolve duplicates and verify businesses.','/app/leads/import'),
   step('seo-official-sources','Broaden official Massachusetts and municipal sources','Add reliable filings, licenses and service-area business coverage, preserving provenance.','/app/discovery'),
  ]},
  {id:'intelligence',title:'03 · Evidence into opportunities',summary:'Technical website findings must stay separate from commercial assumptions.',steps:[
   step('seo-audit-engine','Website Intelligence and local Lighthouse fallback','Record technical findings with timestamps, warnings and inconclusive states.','/app/intelligence','completed','Assessment code and tests passed; live end-to-end integration still needs validation.'),
   step('seo-audit-live','Prove a real CRM → assessment → saved evidence flow','Complete a live audit against a reviewed business and confirm saved findings.','/app/intelligence'),
   step('seo-opportunity-board','Evidence-aware Opportunity Board','Show supported next actions rather than invented owner budgets.','/app/opportunities','completed','Board code and evidence-gating tests passed.'),
   step('seo-commercial-score','Add transparent commercial opportunity ranking','Combine verified evidence, proximity, category and fit without guessing revenue.','/app/opportunities'),
  ]},
  {id:'websites',title:'04 · Websites worth selling',summary:'A reusable renderer is only useful when actual prospects want the result.',steps:[
   step('seo-site-foundation','Reusable site blueprint and standalone export','Separate sourced facts, approved assets and presentation; export an isolated Next.js site.','/app/demos','completed','Exporter cold production build and app CI passed.'),
   step('seo-site-quality','Pass a serious client-demo visual review','Review responsive medical, home-service and professional examples against polished references.','/app/demos'),
   step('seo-site-content','Validate real client content and asset rights','Confirm services, contact links, imagery rights and required disclosures in a real sample.','/app/demos'),
   step('seo-demo-sharing','Offer access-controlled customer previews','Use protected, expiring preview links and allow approval without publishing prematurely.','/app/demos'),
   step('seo-launch','Ship one approved real customer website','Deploy, connect a domain, verify mobile/contact/SEO and establish rollback and monitoring.','/app/demos'),
  ]},
  {id:'sales',title:'05 · Sales and first revenue',summary:'Complete the work that connects good research to paying customers.',steps:[
   step('seo-proposals','Reusable proposals, packages and service agreement','Create a pricing/proposal workflow and a responsible contracting process.','/app/leads'),
   step('seo-sales-routes','Prioritized visits and outreach follow-through','Use a geographic shortlist, next-action notes and reliable follow-ups.','/app/opportunities'),
   step('seo-billing','Payment and client handoff process','Establish invoicing, deposits, delivery approvals and maintenance responsibilities.','/app/leads'),
   step('seo-first-client','Close and fulfill the first paying customer','Record an actual paid project with owner approval and working delivery.','/app/leads'),
  ]},
  {id:'scale',title:'06 · Repeatable delivery',summary:'Automate only after the source and delivery paths have been proven.',steps:[
   step('seo-recurring-scans','Approved discovery and reassessment schedules','Daily discovery, weekly website reassessment and monthly registry checks with history.','/app/discovery'),
   step('seo-retention','Ongoing SEO and client retention workflow','Monthly reports, approved Google Business Profile work and maintenance tracking.','/app/leads'),
  ]},
 ]},
 {id:'mcat',name:'MCAT Platform',subtitle:'Tutor HQ · Learning software',goal:'Turn a documented teaching method into scalable student support',
 target:'Initial working MVP · Oct 30',stages:[
  {id:'cowork',title:'01 · Tutor and developer workspace',summary:'Organize the method and development without recreating Notion or GitHub.',steps:[
   step('mcat-method','Write the teaching method and product requirements','Document study strategy, diagnostics, tutoring workflow and what software should automate.','/app/roadmap?project=mcat'),
   step('mcat-hub','Create MCAT developer co-working hub','Centralize a roadmap, decisions log and links to existing shared resources.','/app/roadmap?project=mcat'),
   step('mcat-resources','Establish the MCAT resource directory','Catalog owned and original materials; link externally to licensed third-party resources.','/app/roadmap?project=mcat'),
  ]},
  {id:'student',title:'02 · Student MVP',summary:'Make the smallest student experience that can support real tutoring.',steps:[
   step('mcat-students','Authenticated student and tutor roles','Separate student records and appropriate tutor permissions from the SEO business.','/app/roadmap?project=mcat'),
   step('mcat-planner','Individual study plan and assignment workflow','Students can receive a schedule, update progress and see the next task.','/app/roadmap?project=mcat'),
   step('mcat-progress','Progress and weak-area dashboard','Track completed work and user-entered progress without invented scores.','/app/roadmap?project=mcat'),
  ]},
  {id:'advanced',title:'03 · Scale beyond one-on-one',summary:'Build advanced tools only after testing the student MVP.',steps:[
   step('mcat-sessions','Tutoring session workflow','Schedule sessions and record follow-up assignments.','/app/roadmap?project=mcat'),
   step('mcat-collab','Collaborative study and co-working space','Add collaboration grounded in actual student workflows.','/app/roadmap?project=mcat'),
   step('mcat-ai','Permissioned AI-assisted explanations','Use original or licensed content, with transparent limitations and privacy controls.','/app/roadmap?project=mcat'),
  ]},
 ]}
];

export const allStepIds=new Set(ROADMAP.flatMap(p=>p.stages.flatMap(s=>s.steps.map(t=>t.id))));
export function findStep(id:string):{project:RoadmapProject;step:RoadmapStep}|null{
 for(const project of ROADMAP)for(const stage of project.stages)for(const entry of stage.steps){
  if(entry.id===id)return {project,step:entry};
 }
 return null;
}
export function summarizeRoadmap(records:readonly RoadmapRecord[]=[]):TrackedProject[]{
 const overrides=new Map(records.filter(r=>allStepIds.has(r.step_id)&&
  (r.status==='completed'||r.status==='pending')).map(r=>[r.step_id,r]));
 return ROADMAP.map(project=>{
  const stages:TrackedStage[]=project.stages.map(stage=>{
   const steps=stage.steps.map(item=>{
    const override=overrides.get(item.id);
    return {...item,status:override?.status??item.baseline,
     evidence:override?.evidence_note??item.baselineEvidence??null,
     updatedAt:override?.updated_at??null};
   });
   return {...stage,steps,total:steps.length,completed:steps.filter(t=>t.status==='completed').length};
  });
  const all=stages.flatMap(s=>s.steps.map(t=>({...t,stageId:s.id,stageTitle:s.title})));
  const current=all.find(t=>t.status==='pending')??null;
  const completed=all.filter(t=>t.status==='completed').length;
  return {...project,stages,completed,total:all.length,
   percent:Math.round(100*completed/Math.max(1,all.length)),current};
 });
}
