import {cleanSiteContent, type SiteContent} from './site-blueprint.ts';
// Deterministic per-user, per-industry preference adaptation. No LLM training or external API calls.
export const templates = ['landscaping','medical','universal'] as const;
export type Template = typeof templates[number];
export const variants = ['editorial','bold'] as const;
export type Variant = typeof variants[number];

export type DesignPreferences = {
  variant: Variant;
  compact: boolean;
  conciseCopy: boolean;
  prominentNav: boolean;
  needsRealAssets: boolean;
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
  compact: /\b(compact|smaller|less space|less padding|too much space|oversized|tighten|too big|smaller headline|huge headline)\b/i,
  spacious: /\b(more space|more breathing room|airier|more padding|larger)\b/i,
  concise: /\b(shorter|less text|more concise|too wordy|too generic|generic copy|less copy|short headline)\b/i,
  detailed: /\b(more details|longer copy|more detail|more explanation)\b/i,
  navigation: /\b(navigation|hard to navigate|button|buttons|cta|contact button)\b/i,
  assets: /\b(photos|photography|images|picture|pictures|real imagery)\b/i,
};
export const defaultPreferences = ():DesignPreferences => ({
  variant:'editorial', compact:false, conciseCopy:false, prominentNav:false,
  needsRealAssets:false,feedbackCount:0,learnedFrom:[]
});

export function derivePreferences(all:FeedbackSample[], template:Template):DesignPreferences {
  // Prefer this industry's feedback, with fallback to general feedback on the user's account.
  // Caller MUST filter to the authenticated user and organization before passing samples.
  const ordered=[...all].filter(x=>Number.isInteger(x.rating)&&x.rating>=1&&x.rating<=5
    &&variants.includes(x.visual_variant as Variant))
    .sort((a,b)=>(b.created_at??'').localeCompare(a.created_at??''));
  const relevant=ordered.filter(x=>x.template===template);
  const samples=relevant.length?relevant:ordered;
  if(!samples.length)return defaultPreferences();
  const scores:Record<Variant,number>={editorial:0.15,bold:0};
  let compact=0,concise=0,nav=0,assets=0;
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
  }
  const variant:Variant=scores.bold>scores.editorial?'bold':'editorial';
  const profile:DesignPreferences={
    variant,compact:compact>0.1,conciseCopy:concise>0.1,prominentNav:nav>0.1,
    needsRealAssets:assets>0.1,feedbackCount:processed,learnedFrom:[]
  };
  profile.learnedFrom=[
    `Preferred visual direction: ${variant==='editorial'?'Editorial / minimal':'Bold / high contrast'}`,
    profile.compact?'Tighter spacing and smaller hero sections':'Standard spacing',
    profile.conciseCopy?'Shorter, less generic default copy':'Standard copy length',
    profile.prominentNav?'More prominent navigation and contact actions':'Standard navigation',
    ...(profile.needsRealAssets?['Preferred: photo-led content when permission-approved imagery is available']:[]),
  ];
  return profile;
}
export function createDraft(name:string,city:string|null,category:string|null,template:Template,preferences=defaultPreferences()):DemoCopy {
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
  return {
    brand:name,
    eyebrow:city?`SERVING ${city.toUpperCase()}`:'LOCAL BUSINESS',
    headline:preferences.conciseCopy?shortHeadlines[template]:headlines[template],
    description:preferences.conciseCopy?shortIntros[template]:intros[template],
    services:[],category:category||'Services',
    primaryAction:template==='medical'?'Get in touch':'Request information',
    secondaryAction:'Explore services',
    disclaimer:'Independent design concept. Not affiliated with or endorsed by this business. Details require owner confirmation.',
    design:preferences,
    // Feedback affects the next draft's preferred media direction; actual
    // research and legal image permission are still required before display.
    siteContent:cleanSiteContent({heroTreatment:preferences.needsRealAssets?'photo-led':'typographic'}),
  };
}
