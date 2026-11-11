import {cleanSiteContent, type SiteContent} from './site-blueprint.ts';
import {classifyIndustry} from './business-classification.ts';
import {applyActiveSkillPacks,mergeSkillPackIntoPlan,type SkillPackAttachment} from './skill-packs/apply.ts';
// Deterministic per-user, per-industry preference adaptation. No LLM training or external API calls.
export const templates = ['landscaping','medical','universal'] as const;
export type Template = typeof templates[number];
export const variants = ['editorial','bold'] as const;
export type Variant = typeof variants[number];
export const compositionFamilies = ['split-editorial','immersive','bento','service-index','centered','asymmetric'] as const;
export type CompositionFamily = typeof compositionFamilies[number];
export type TypographyTone = 'editorial'|'humanist'|'geometric';
export type ImageTreatment = 'full-bleed'|'framed'|'mosaic'|'minimal';
export type MotionStyle='calm'|'cinematic'|'precise';
export type MotionPlan={
 required:true;
 pageEntry:'soft-rise'|'cinematic-wipe'|'precision-reveal';
 sectionReveal:'cascade'|'layered-wipe'|'indexed-rise';
 mediaMotion:'slow-scale'|'masked-reveal'|'depth-shift';
 navigationMotion:'underline-track'|'pill-shift';
 staggerMs:number;
};

export type DesignPreferences = {
  variant: Variant;
  compact: boolean;
  conciseCopy: boolean;
  prominentNav: boolean;
  needsRealAssets: boolean;
  composition: CompositionFamily;
  /** Optional renderable section precedence. Unspecified uses template default. */
  sectionOrder?: string[];
  typography: TypographyTone;
  imageTreatment: ImageTreatment;
  cardStyle: 'bordered'|'numbered'|'flat';
  alignment: 'left'|'center'|'offset';
  negativeConstraints: string[];
  feedbackCount: number;
  learnedFrom: string[];
};
export type DemoCopy = {
  brand: string; eyebrow: string; headline: string; description: string;
  services: string[]; primaryAction: string; secondaryAction: string;
  disclaimer: string; category: string; design?: DesignPreferences;
  // Optional, user-supplied approved business photography. No stock images invented.
  heroImageUrl?: string;
  // Portable, provenance-aware content pack shared by private demos and deployable sites.
  siteContent?: SiteContent;
  // Internal-only brief, never displayed as a business claim on the mock site.
  internalBuildPlan?:{
    sourceAssessmentDate:string|null;
    confidence:'measured'|'operator_supplied'|'inconclusive'|'unmeasured';
    goals:string[];
  };
  generationSpec?:{
    schemaVersion:1;
    composition:CompositionFamily;
    typography:TypographyTone;
    imageTreatment:ImageTreatment;
    cardStyle:'bordered'|'numbered'|'flat';
    alignment:'left'|'center'|'offset';
    sectionOrder:string[];
    conversionGoal:'book'|'call'|'estimate'|'contact';
    rationale:string[];
    negativeConstraints:string[];
    motion:MotionStyle;
    motionPlan:MotionPlan;
    skillPacks?:SkillPackAttachment;
  };
};
export type FeedbackSample = {
  demo_id: string;
  user_id: string;
  template: string;
  visual_variant: string;
  rating: number;
  issue_tags?: string[] | null;
  notes?: string | null;
  created_at?: string;
};
const preferenceRegex = {
  compact: /\b(compact|smaller|less space|less padding|too much space|too much white space|oversized|tighten|too big|smaller headline|huge headline|giant|gigantic|empty cards|empty service cards|blank cards)\b/i,
  spacious: /\b(more space|more breathing room|airier|more padding|larger)\b/i,
  concise: /\b(shorter|less text|more concise|too wordy|too generic|generic copy|less copy|short headline)\b/i,
  detailed: /\b(more details|longer copy|more detail|more explanation)\b/i,
  navigation: /\b(navigation|hard to navigate|button|buttons|cta|contact button)\b/i,
  assets: /\b(photos|photography|images|picture|pictures|real imagery)\b/i,
  centered: /\b(centered|symmetrical|center aligned)\b/i,
  offset: /\b(asymmetric|asymmetrical|offset|editorial grid)\b/i,
  noCards: /\b(no cards|fewer cards|stop using cards|not cards|card grid|empty cards|empty service cards|blank cards|useless cards)\b/i,
  immersive: /\b(immersive|full bleed|full-bleed|cinematic|large photo)\b/i,
  bento: /\b(bento|modular|dashboard-like)\b/i,
  serif: /\b(serif|editorial type|magazine)\b/i,
  sans: /\b(sans serif|sans-serif|geometric|clean type)\b/i,
};
export const defaultPreferences = ():DesignPreferences => ({
  variant:'editorial', compact:false, conciseCopy:false, prominentNav:false,
  needsRealAssets:false,composition:'split-editorial',typography:'humanist',
  imageTreatment:'framed',cardStyle:'numbered',alignment:'left',negativeConstraints:[],
  feedbackCount:0,learnedFrom:[]
});

export function derivePreferences(all:FeedbackSample[], template:Template, projectDemoId?:string):DesignPreferences {
  // Prefer this industry's feedback, with fallback to general feedback on the user's account.
  // Caller MUST filter to the authenticated user and organization before passing samples.
  const ordered=[...all].filter(x=>Number.isInteger(x.rating)&&x.rating>=1&&x.rating<=5
    &&variants.includes(x.visual_variant as Variant))
    .sort((a,b)=>(b.created_at??'').localeCompare(a.created_at??''));
  const relevant=ordered.filter(x=>x.template===template);
  const project=projectDemoId?ordered.filter(x=>x.demo_id===projectDemoId):[];
  // Precedence is explicit and deterministic: project > vertical > global.
  // Earlier samples receive higher decay weights below; duplicate records are removed.
  const samples=projectDemoId?[...project,...relevant.filter(x=>x.demo_id!==projectDemoId),...ordered.filter(x=>x.template!==template)]:
   relevant.length?relevant:ordered;
  if(!samples.length)return defaultPreferences();
  const scores:Record<Variant,number>={editorial:0.15,bold:0};
  let compact=0,concise=0,nav=0,assets=0,centered=0,offset=0,noCards=0,immersive=0,bento=0,serif=0,sans=0;
  const seen=new Set<string>();
  let processed=0;
  for(const s of samples.slice(0,150)){
    // Updating a rating for the same demo/revision replaces that judgement,
    // not a second independent vote. Revision changes can be rated separately.
    const key=s.demo_id+':'+s.user_id+':'+(s.created_at??'');
    if(seen.has(key))continue;
    seen.add(key);
    const weight=1/(1+processed*0.22);
    processed++;
    scores[s.visual_variant as Variant]+=(s.rating-3)*weight;
    const tags=s.issue_tags??[],notes=s.notes??'';
    if(tags.includes('layout')||tags.includes('mobile')) compact+=weight;
    if(tags.includes('generic_copy')) concise+=weight;
    if(tags.includes('navigation')) nav+=weight;
    if(tags.includes('missing_content')||tags.includes('visuals')||preferenceRegex.assets.test(notes)) assets+=weight;
    if(preferenceRegex.assets.test(notes))assets+=weight;
    if(preferenceRegex.compact.test(notes)) compact+=weight*2;
    if(preferenceRegex.spacious.test(notes)) compact-=weight*2;
    if(preferenceRegex.concise.test(notes)) concise+=weight*2;
    if(preferenceRegex.detailed.test(notes)) concise-=weight*2;
    if(preferenceRegex.navigation.test(notes)) nav+=weight*2;
    if(preferenceRegex.centered.test(notes)) centered+=weight*2;
    if(preferenceRegex.offset.test(notes)) offset+=weight*2;
    if(preferenceRegex.noCards.test(notes)) noCards+=weight*2;
    if(preferenceRegex.immersive.test(notes)) immersive+=weight*2;
    if(preferenceRegex.bento.test(notes)) bento+=weight*2;
    if(preferenceRegex.serif.test(notes)) serif+=weight*2;
    if(preferenceRegex.sans.test(notes)) sans+=weight*2;
  }
  const variant:Variant=scores.bold>scores.editorial?'bold':'editorial';
  const negativeConstraints=[...(noCards>0.1?['Avoid repetitive card grids']:[])];
  const compositionScores:[CompositionFamily,number][]=[['immersive',immersive],['bento',bento],['asymmetric',offset],['centered',centered]];
  const strongest=compositionScores.sort((a,b)=>b[1]-a[1])[0];
  const profile:DesignPreferences={
    variant,compact:compact>0.1,conciseCopy:concise>0.1,prominentNav:nav>0.1,
    needsRealAssets:assets>0.1,
    composition:strongest[1]>0.1?strongest[0]:'split-editorial',
    typography:serif>sans?'editorial':sans>0.1?'geometric':'humanist',
    imageTreatment:immersive>0.1?'full-bleed':assets>0.1?'mosaic':'framed',
    cardStyle:noCards>0.1?'flat':variant==='bold'?'bordered':'numbered',
    alignment:offset>centered?'offset':centered>0.1?'center':'left',negativeConstraints,
    feedbackCount:processed,learnedFrom:[]
  };
  profile.learnedFrom=[
    `Preferred visual direction: ${variant==='editorial'?'Editorial / minimal':'Bold / high contrast'}`,
    profile.compact?'Tighter spacing and smaller hero sections':'Standard spacing',
    profile.conciseCopy?'Shorter, less generic default copy':'Standard copy length',
    profile.prominentNav?'More prominent navigation and contact actions':'Standard navigation',
    ...(profile.needsRealAssets?['Preferred: photo-led content when permission-approved imagery is available']:[]),
    `Composition: ${profile.composition.replaceAll('-',' ')}`,
    `Typography: ${profile.typography}`,
    ...(negativeConstraints.length?negativeConstraints:[]),
    ...(projectDemoId&&project.length?['Project-specific feedback overrides broader preferences']:[]),
  ];
  return profile;
}

const hash=(value:string)=>[...value].reduce((n,c)=>((n*31+c.charCodeAt(0))>>>0),2166136261);
export function planMotion(composition:CompositionFamily,style:MotionStyle):MotionPlan{
 const cinematic=composition==='immersive'||style==='cinematic';
 const precise=composition==='service-index'||style==='precise';
 return {required:true,
  pageEntry:cinematic?'cinematic-wipe':precise?'precision-reveal':'soft-rise',
  sectionReveal:cinematic?'layered-wipe':precise?'indexed-rise':'cascade',
  mediaMotion:cinematic?'slow-scale':composition==='asymmetric'?'depth-shift':'masked-reveal',
  navigationMotion:composition==='centered'?'pill-shift':'underline-track',
  staggerMs:style==='calm'?90:style==='cinematic'?140:65};
}
export function planGeneration(name:string,template:Template,preferences:DesignPreferences,packRoot?:string){
 const byIndustry:Record<Template,CompositionFamily[]>={
  medical:['split-editorial','centered','asymmetric','service-index'],
  landscaping:['immersive','asymmetric','service-index','split-editorial'],
  universal:['bento','split-editorial','centered','service-index','asymmetric']
 };
 const learned=preferences.feedbackCount>0;
 let composition=learned?preferences.composition:byIndustry[template][hash(name+'|'+template)%byIndustry[template].length];
 if(preferences.negativeConstraints.some(x=>/card/i.test(x))&&composition==='bento')composition='asymmetric';
 const conversionGoal:'book'|'estimate'|'contact'=template==='medical'?'book':template==='landscaping'?'estimate':'contact';
 const motion:MotionStyle=template==='medical'?'calm':template==='landscaping'?'cinematic':'precise';
 const motionPlan=planMotion(composition,motion);
 const sectionOrder=preferences.sectionOrder?.length?[...preferences.sectionOrder]:template==='medical'?['hero','services','trust','about','contact']:
  template==='landscaping'?['hero','proof','services','process','contact']:['hero','services','about','proof','contact'];
 const pack=mergeSkillPackIntoPlan(applyActiveSkillPacks({template,root:packRoot}),{composition,sectionOrder,motion,motionPlan},{learned});
 return {
  schemaVersion:1 as const,composition:pack.composition,typography:preferences.typography,
  imageTreatment:preferences.needsRealAssets?(pack.composition==='immersive'?'full-bleed':'mosaic'):preferences.imageTreatment,
  cardStyle:preferences.cardStyle,alignment:preferences.alignment,
  sectionOrder:pack.sectionOrder,conversionGoal,motion:pack.motion,motionPlan:pack.motionPlan,
  rationale:[
   `Selected ${pack.composition.replaceAll('-',' ')} for ${template} context`,
   learned?`Applied ${preferences.feedbackCount} relevant feedback signal${preferences.feedbackCount===1?'':'s'}`:'Used deterministic business-specific variation',
   `Primary conversion path: ${conversionGoal}`,
   `Required motion system: ${pack.motionPlan.pageEntry}, ${pack.motionPlan.sectionReveal}, ${pack.motionPlan.mediaMotion}`,
   ...pack.rationale
  ],negativeConstraints:preferences.negativeConstraints,
  ...(pack.skillPacks?{skillPacks:pack.skillPacks}:{})
 };
}
export function createDraft(name:string,city:string|null,category:string|null,template:Template,preferences=defaultPreferences()):DemoCopy {
  const trade=classifyIndustry(name,category).sector==='trades';
  const headlines:Record<Template,string>={
    landscaping:'Outdoor spaces worth coming home to.',
    medical:'Care starts with a clearer first step.',
    universal:'A better way to meet your next customer.',
  };
  const shortHeadlines:Record<Template,string>={
    landscaping:'Make room for better outdoors.',
    medical:'Care, made clearer.',
    universal:'Make every first impression count.',
  };
  const intros:Record<Template,string>={
    landscaping:'See the possibilities for your outdoor project. Services and availability will be confirmed with the business.',
    medical:'Find the information you need before reaching out. Clinical services and provider details require confirmation.',
    universal:'Explore a modern online introduction to this business. Exact offerings and availability will be confirmed.',
  };
  const shortIntros:Record<Template,string>={
    landscaping:'A simpler way to explore outdoor projects. Services require confirmation.',
    medical:'Find essential information first. Clinical services require confirmation.',
    universal:'Meet the business and explore its services. Details require confirmation.',
  };
  const planned=planGeneration(name,template,preferences);
  const generationSpec=trade?{...planned,conversionGoal:'estimate' as const,
   rationale:[...planned.rationale,'Trade-safe conversion path: request an estimate without using landscaping copy.']}:planned;
  return {
    brand:name,
    eyebrow:city?`SERVING ${city.toUpperCase()}`:'LOCAL BUSINESS',
    headline:trade?'A clear starting point for your project.':preferences.conciseCopy?shortHeadlines[template]:headlines[template],
    description:trade?'Review the listed capabilities, then contact the team to discuss your project and request an estimate.':preferences.conciseCopy?shortIntros[template]:intros[template],
    services:[],category:category||'Services',
    primaryAction:trade?'Request an estimate':template==='medical'?'Get in touch':'Request information',
    secondaryAction:'Explore services',
    disclaimer:'Independent design concept. Not affiliated with or endorsed by this business. Details require owner confirmation.',
    design:preferences,
    generationSpec,
    // Feedback affects the next draft's preferred media direction; actual
    // research and legal image permission are still required before display.
    siteContent:cleanSiteContent({heroTreatment:preferences.needsRealAssets?'photo-led':'typographic'}),
  };
}
