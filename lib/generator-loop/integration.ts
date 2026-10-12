// Narrow adapters between the feedback loop and the production app. Nothing
// here touches the database or edits production modules; each function maps
// one shape to another so the app can adopt the loop one call site at a time.
// See docs/feedback-loop-integration.md for the exact call sites.
//
// Type-only imports from production modules: if their shapes change, type
// checking flags this file instead of the app failing at runtime.
import type {DesignPreferences,FeedbackSample} from '../demo-engine.ts';
import {deriveTraits,designDimensions,type BusinessFacts,type BusinessTraits,type DesignCandidate} from './design-space.ts';
import type {Evaluation} from './evaluate.ts';
import {interpretFeedback,type FeedbackEvent} from './feedback-interpreter.ts';
import {GENERATOR_VERSION,runLoop,type Decision} from './loop.ts';
import {buildPreferenceModel,fromRuleRow,resolveRules,toRuleRow,type PreferenceModel,type Rule} from './preference-model.ts';
import {traitDefaults} from './design-space.ts';
import {memoryCache,type EvaluationCache} from './stable-hash.ts';
import {stableHash} from './stable-hash.ts';

// --- 0. Production records -> BusinessFacts ---------------------------------
// Only verified, displayable fields. `businesses.notes` (CRM notes) is never
// read. Business images enter only through the saved authorization, and the
// composer's permission gate still checks each URL's host.
type BusinessRowLike={id:string;name:string;category:string|null;city:string|null;street_address?:string|null;phone?:string|null;service_area?:string|null;website_url?:string|null};
type SiteContentLike={about?:string;audience?:string;appointmentUrl?:string|null;factStatus?:string;
 images?:{url:string;alt:string;role:string;permission:string}[];generatedImageryEnabled?:boolean;
 imageAuthorization?:{mode:string;acceptedAt:string|null;sourceHost:string|null}};
export function factsFromProduction(b:BusinessRowLike,content:SiteContentLike|null|undefined,services:string[],
 opts:{conversion:BusinessFacts['conversion'];generated:BusinessFacts['imagery']['generated'];email?:string|null}):BusinessFacts{
 const auth=content?.imageAuthorization;
 const authorizedHost=auth?.mode==='business_site_authorized'&&auth.acceptedAt&&auth.sourceHost?auth.sourceHost:null;
 const roles=['hero','gallery','team','detail'];
 return {id:b.id,name:b.name,industry:(b.category??'unknown').toLowerCase(),city:b.city??'',
  about:content?.factStatus==='unreviewed'?'':content?.about??'',offerings:services.slice(0,24),
  conversion:opts.conversion,conversionUrl:content?.appointmentUrl??null,phone:b.phone??null,email:opts.email??null,
  address:b.street_address&&b.city?`${b.street_address}, ${b.city}`:null,
  serviceArea:b.service_area?b.service_area.split(/\s*[,;]\s*/).filter(Boolean).slice(0,12):undefined,
  audience:content?.audience==='vulnerable'?'vulnerable':undefined,
  imagery:{generatedAllowed:content?.generatedImageryEnabled!==false,authorizedHost,
   businessImages:(content?.images??[]).filter(i=>i.permission==='approved'||authorizedHost)
    .map(i=>({url:i.url,alt:i.alt,role:(roles.includes(i.role)?i.role:'gallery') as BusinessFacts['imagery']['businessImages'][number]['role']})),
   generated:content?.generatedImageryEnabled===false?[]:opts.generated}};
}

// --- 1. Rating action: demo_feedback row -> FeedbackEvent ------------------
export type FeedbackRow=Pick<FeedbackSample,'demo_id'|'user_id'|'rating'|'issue_tags'|'notes'|'created_at'>&{revision_no?:number|null};
export function feedbackRowToEvent(row:FeedbackRow,ctx:{businessId:string;industry:string;reviewed:DesignCandidate;traits?:BusinessTraits|null;revisionId?:string|null}):FeedbackEvent{
 return {id:stableHash(['demo_feedback',row.demo_id,row.user_id,row.revision_no??null,row.created_at??null]),
  projectKey:ctx.businessId,industry:ctx.industry,rating:row.rating,notes:row.notes??'',tags:row.issue_tags??[],
  reviewed:ctx.reviewed,traits:ctx.traits??null,revisionId:ctx.revisionId??null,createdAt:row.created_at??null};
}

// --- 2. design_preference_rules ---------------------------------------------
export type RuleRowInsert={organization_id:string;user_id:string;scope:string;scope_key:string;rule_kind:string;instruction:string;evidence_demo_id:string|null;active:boolean};
export function rulesToRows(model:PreferenceModel,ctx:{organizationId:string;userId:string;evidenceDemoId?:string|null}):RuleRowInsert[]{
 return model.rules.map(r=>({organization_id:ctx.organizationId,user_id:ctx.userId,...toRuleRow(r),evidence_demo_id:ctx.evidenceDemoId??null,active:true}));
}
/** Rows written by older code (free-text instructions) are ignored, not guessed. */
export function rowsToRules(rows:{scope:string;scope_key:string;instruction:string;active?:boolean|null}[]):Rule[]{
 return rows.filter(r=>r.active!==false).map(fromRuleRow).filter((r):r is Rule=>Boolean(r));
}

// --- 3. generator_evaluations -----------------------------------------------
export type EvaluationRowInsert={organization_id:string;demo_id:string;revision_no:number;evaluation_kind:'functional';
 score:number;passed:boolean;evidence:Record<string,unknown>};
/** One row per demo revision. Structural results and the decision log go in
 *  `evidence`; the score is structural only and says nothing about taste. */
export function evaluationToRow(ev:Evaluation,decisions:Decision[],ctx:{organizationId:string;demoId:string;revisionNo:number;generatorVersion:string;alignment:number|null}):EvaluationRowInsert{
 return {organization_id:ctx.organizationId,demo_id:ctx.demoId,revision_no:ctx.revisionNo,evaluation_kind:'functional',
  score:Math.round(ev.structural*100),passed:ev.gates.length===0,
  evidence:{kind:'generator-loop',generatorVersion:ctx.generatorVersion,renderId:ev.renderId,structural:ev.structural,
   metrics:ev.metrics,failedChecks:ev.checks.filter(c=>!c.pass).map(c=>({id:c.id,severity:c.severity,detail:c.detail})),
   preferenceAlignment:ctx.alignment,notes:ev.notes,
   decisions:decisions.map(d=>({dimension:d.dimension,prior:d.prior,revised:d.revised,source:d.source,outcome:d.outcome,reason:d.reason,
    structuralBefore:d.structuralBefore,structuralAfter:d.structuralAfter,evidence:d.evidence}))}};
}

// --- 4. planGeneration: candidate <-> DesignPreferences -----------------------
const typographyTone:Record<DesignCandidate['typography'],DesignPreferences['typography']>={
 'editorial-serif':'editorial','classic-serif':'editorial','humanist-sans':'humanist','geometric-sans':'geometric','grotesk-display':'geometric'};
const imageTreatment:Record<DesignCandidate['imageryDensity'],DesignPreferences['imageTreatment']>={
 none:'minimal',accent:'framed',balanced:'mosaic',immersive:'full-bleed'};
/** Decisions the current DesignPreferences shape cannot carry. planGeneration
 *  needs the documented patch before these reach the production page. */
export const unmappedDecisions=['hierarchy','palette','motionSystem','ctaStructure (only sticky-bar maps, to prominentNav)','typography (5 values -> 3 tones)'] as const;

export function candidateToPreferences(c:DesignCandidate,base:DesignPreferences,learnedFrom:string[]):DesignPreferences{
 return {...base,
  composition:c.composition,typography:typographyTone[c.typography],imageTreatment:imageTreatment[c.imageryDensity],
  compact:c.spacing==='compact',conciseCopy:c.copyDepth==='brief',prominentNav:c.ctaStructure==='sticky-bar',
  needsRealAssets:c.imageryDensity==='balanced'||c.imageryDensity==='immersive',
  cardStyle:c.composition==='bento'?'bordered':'flat',alignment:c.composition==='centered'?'center':c.composition==='asymmetric'?'offset':'left',
  // planGeneration only honours `composition` when feedbackCount > 0.
  feedbackCount:Math.max(1,base.feedbackCount),learnedFrom:learnedFrom.slice(0,12)};
}

type SpecLike={composition?:string;typography?:string;imageTreatment?:string;motion?:string;sectionOrder?:string[]};
/** Recover the decisions of a revision built by the current generator, so a
 *  rating can be attached to what the reviewer actually saw. */
export function candidateFromProduction(spec:SpecLike|null|undefined,prefs:Partial<DesignPreferences>|null|undefined,fallback:DesignCandidate):DesignCandidate{
 const pick=<K extends keyof DesignCandidate>(k:K,v:string|undefined|null):DesignCandidate[K]=>
  v&&(designDimensions[k] as readonly string[]).includes(v)?v as DesignCandidate[K]:fallback[k];
 const tone=spec?.typography??prefs?.typography;
 const second=spec?.sectionOrder?.[1];
 return {
  composition:pick('composition',spec?.composition??prefs?.composition),
  hierarchy:pick('hierarchy',second==='services'?'offer-first':second==='trust'||second==='proof'?'proof-first':second==='about'?'story-first':undefined),
  typography:pick('typography',tone==='editorial'?'editorial-serif':tone==='humanist'?'humanist-sans':tone==='geometric'?'geometric-sans':undefined),
  palette:fallback.palette,
  imageryDensity:pick('imageryDensity',{minimal:'none',framed:'accent',mosaic:'balanced','full-bleed':'immersive'}[String(spec?.imageTreatment??prefs?.imageTreatment)]),
  ctaStructure:prefs?.prominentNav?'sticky-bar':fallback.ctaStructure,
  motionSystem:pick('motionSystem',spec?.motion),
  spacing:prefs?.compact?'compact':fallback.spacing,
  copyDepth:prefs?.conciseCopy?'brief':fallback.copyDepth,
 };
}

// --- 5. Production renderer: motion system -> MotionPlan-shaped hints --------
export function motionHints(c:DesignCandidate){
 const m=c.motionSystem;
 return {required:true as const,
  pageEntry:m==='cinematic'?'cinematic-wipe' as const:m==='precise'?'precision-reveal' as const:'soft-rise' as const,
  sectionReveal:m==='cinematic'?'layered-wipe' as const:m==='precise'?'indexed-rise' as const:'cascade' as const,
  mediaMotion:m==='cinematic'?'slow-scale' as const:'masked-reveal' as const,
  navigationMotion:c.composition==='centered'?'pill-shift' as const:'underline-track' as const,
  staggerMs:m==='minimal'?0:m==='calm'?90:m==='precise'?60:140};
}

// --- 6. Benchmark gallery rows ----------------------------------------------
export function galleryRow(facts:BusinessFacts,split:'train'|'holdout',chosen:{candidate:DesignCandidate;evaluation:Evaluation;alignment:number}){
 return {id:facts.id,name:facts.name,industry:facts.industry,split,traits:deriveTraits(facts),design:chosen.candidate,
  structural:chosen.evaluation.structural,alignment:Math.round(chosen.alignment*1000)/1000,
  failedChecks:chosen.evaluation.checks.filter(c=>!c.pass).map(c=>c.detail),
  label:'Structural checks only. Not an aesthetic rating.'};
}

// --- 7. Orchestration helpers (pure; the server action only fetches data) ---
export type ReviewInput={row:FeedbackRow;revisionContent:{generationSpec?:SpecLike|null;design?:Partial<DesignPreferences>|null}|null;facts:BusinessFacts};
/** Rebuild the user's preference model from their reviews. Deterministic, so
 *  interpretations need not be stored; evaluation constraints persisted in
 *  design_preference_rules (src=evaluation) are passed back in. */
export function learnFromReviews(reviews:ReviewInput[],persistedConstraints:Rule[]=[]):{model:PreferenceModel;events:FeedbackEvent[]}{
 const events=reviews.map(r=>{
  const traits=deriveTraits(r.facts);
  const fallback=traitDefaults(traits,r.facts.id);
  return feedbackRowToEvent(r.row,{businessId:r.facts.id,industry:r.facts.industry,traits,
   reviewed:candidateFromProduction(r.revisionContent?.generationSpec,r.revisionContent?.design,fallback)});
 });
 return {model:buildPreferenceModel(events.flatMap(e=>interpretFeedback(e).signals),persistedConstraints.filter(c=>c.source==='evaluation')),events};
}
/** Plan the next revision for one business. Returns the production-shaped
 *  preferences plus the evidence to store in generator_evaluations. */
export function planNextRevision(facts:BusinessFacts,model:PreferenceModel,base:DesignPreferences,
 cache:EvaluationCache<Evaluation>=memoryCache<Evaluation>()){
 const traits=deriveTraits(facts);
 const active=resolveRules(model,{projectKey:facts.id,industry:facts.industry,traits});
 const result=runLoop({facts,active,cache,mode:'rules+search',budget:{maxEvaluations:40}});
 const learnedFrom=result.decisions.filter(d=>d.outcome==='accepted').map(d=>`${d.dimension}: ${d.prior} -> ${d.revised} (${d.reason})`);
 return {candidate:result.chosen.candidate,preferences:candidateToPreferences(result.chosen.candidate,base,learnedFrom),
  motion:motionHints(result.chosen.candidate),decisions:result.decisions,evaluation:result.chosen.evaluation,
  alignment:result.chosen.alignment,ledger:result.ledger,generatorVersion:GENERATOR_VERSION};
}
