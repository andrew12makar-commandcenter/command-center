import type {Template,CompositionFamily,ImageTreatment} from './demo-engine.ts';
import type {SiteContent} from './site-blueprint.ts';

// Private planning only. Research is a *reference* until a person verifies it.
// No unapproved claims or source images are copied into the client site.
export type SiteRedesignReference={
 sourcePages:number;
 sourceHosts:string[];
 sourceThemeColors:string[];
 approvedImages:number;
 unapprovedImageReferences:number;
 reviewedTopics:string[];
 recommendedComposition:CompositionFamily;
 recommendedImageTreatment:ImageTreatment;
 mediaPlan:'approved-business-media'|'concept-image-brief-needed'|'typographic';
 imageBriefs:string[];
 warnings:string[];
};

const unique=<T>(items:T[])=>Array.from(new Set(items));
const sourceHost=(s:string)=>{try{return new URL(s).hostname.replace(/^www\./,'');}catch{return null;}};
const safeService=(value:string)=>value.replace(/[<>\n\r]/g,' ').trim().slice(0,65);

function conceptBrief(template:Template,services:string[]):string[]{
 // A generated *concept* must never imply it is the company's real site,
 // employees, work, treatment results, facility or customer testimonial.
 const focus=safeService(services[0]??'');
 if(template==='medical')return [
  'Editorial abstract healthcare still life: natural materials, indirect daylight, calm architectural textures. No patient, staff, identifiable facility or clinical outcome. Mark as AI concept.',
  'Non-identifiable close-up of clean materials and light in a modern healthcare-inspired environment. No identifiable practice or medical equipment claims. AI concept, not a business photograph.'
 ];
 if(template==='landscaping')return [
  `Conceptual landscape design photograph of an aspirational garden setting${focus?` inspired by ${focus}`:''}, natural seasonal light, original composition, no identifiable property or claim of completed work. Label AI concept.`,
  'Conceptual close-up of garden materials and planting textures, professionally composed, no claimed client project or company equipment. Label AI concept.'
 ];
 return [
  `Editorial still life for a professional service${focus?` in the domain of ${focus}`:''}, tactile material, natural light, original design. No employees, headquarters or claimed customer projects. Label AI concept.`,
  'Abstract premium professional-services architectural detail, restrained lighting and geometry, not a picture of the company. Label AI concept.'
 ];
}

export function deriveSiteRedesignReference(
 content:Pick<SiteContent,'researchPages'|'researchInsights'|'images'|'generatedImageryEnabled'>,
 template:Template,services:readonly string[]
):SiteRedesignReference{
 const sourceHosts=unique(content.researchPages.map(p=>sourceHost(p.url)).filter((v):v is string=>Boolean(v)));
 const sourceThemeColors=unique(content.researchPages.map(p=>p.themeColor??'')
  .filter(color=>/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(color)).map(x=>x.toLowerCase()));
 const reviewed=content.researchInsights.filter(i=>i.status==='reviewed');
 const reviewedTopics=unique(reviewed.map(i=>i.kind));
 const approvedImages=content.images.filter(i=>i.permission==='approved').length;
 const unapprovedImageReferences=content.images.filter(i=>i.permission!=='approved').length;
 const hasVisualSource=approvedImages>=2&&reviewedTopics.includes('gallery');
 let recommendedComposition:CompositionFamily;
 if(template==='medical')recommendedComposition=services.length>=5?'service-index':reviewedTopics.includes('team')?'asymmetric':'split-editorial';
 else if(template==='landscaping')recommendedComposition=hasVisualSource?'immersive':services.length>=4?'service-index':'asymmetric';
 else recommendedComposition=hasVisualSource?'asymmetric':services.length>=4?'bento':'split-editorial';
 const recommendedImageTreatment:ImageTreatment=approvedImages>=3?'mosaic':approvedImages>0||content.generatedImageryEnabled?'framed':'minimal';
 const mediaPlan=approvedImages?'approved-business-media':content.generatedImageryEnabled?'concept-image-brief-needed':'typographic';
 const warnings:string[]=[];
 if(!content.researchPages.length)warnings.push('No existing company website has been researched; design suggestions use only the supplied brief.');
 if(unapprovedImageReferences)warnings.push(`${unapprovedImageReferences} source image reference(s) lack confirmed commercial display rights.`);
 if(sourceThemeColors.length)warnings.push('Detected theme colors are unverified styling cues, not approved brand colors.');
 if(!approvedImages&&content.generatedImageryEnabled)warnings.push('Concept prompts require a separate generation step, human review and AI-image disclosure.');
 return {sourcePages:content.researchPages.length,sourceHosts,sourceThemeColors,approvedImages,
  unapprovedImageReferences,reviewedTopics,recommendedComposition,recommendedImageTreatment,
  mediaPlan,imageBriefs:mediaPlan==='concept-image-brief-needed'?conceptBrief(template,[...services]):[],warnings};
}
