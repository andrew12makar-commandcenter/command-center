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
 // These describe proposed *new concept images*, never observed photographs.
 // Deliberately distinguish medical specialties and home-service trades.
 const topics=services.join(' ').toLowerCase();
 const focus=safeService(services[0]??'');
 if(template==='medical'){
  if(/\b(vet\w*|pets?|animal\w*|feline|canine|puppy|kitten)\b/.test(topics))return [
   'Original editorial AI concept of a healthy dog and cat in a calming pet-care-inspired setting, authentic natural textures. No claimed veterinary facility, real patients, staff, logos or treatment outcome. Clearly label as AI concept.',
   'Original AI concept of pet-care essentials in natural light with neutral background, composition suited to a veterinary website. No identifiable clinical premises, procedures or business identity. Clearly label as AI concept.'
  ];
  if(/\b(dent\w*|orthodont\w*|tooth|teeth|implant\w*)\b/.test(topics))return [
   'Original conceptual image of a contemporary dental-inspired treatment space, premium architectural lighting, no recognizable practice or patient. Not a photograph of the business. Clearly label AI concept.',
   'Original abstract dental wellness image with modern clinical material details; no actual staff, patients, proprietary brands or treatment outcome. Clearly label AI concept.'
  ];
  return [
   'Original healthcare editorial AI concept with non-identifiable wellness objects and gentle daylight, no identifiable clinic, clinicians, patients, treatments or clinical outcomes. Clearly label AI concept.',
   'Abstract healthcare-inspired material still life suitable for an information-focused primary-care site, without implying an actual office or physician. Clearly label AI concept.'
  ];
 }
 if(template==='landscaping'){
  if(/\b(plumb\w*|hvac|heat\w*|electri\w*|roof\w*|repair\w*)\b/.test(topics))return [
   'Original conceptual editorial photograph of clean home-service tools and precision materials associated with '+focus+', no claimed completed project, worker, employer branding or identifiable property. Clearly label AI concept.',
   'Close-up AI concept of textures and tools appropriate for '+focus+', editorial lighting and restrained composition, not actual business work or a client property. Clearly label AI concept.'
  ];
  return [
   'Original aspirational landscape design AI concept inspired by '+focus+', natural seasonal light and strong photographic composition; no claimed completed company project or identifiable property. Clearly label AI concept.',
   'Original garden material and planting texture AI concept, richly art-directed, no claimed company jobsite, client property or branded equipment. Clearly label AI concept.'
  ];
 }
 if(/\b(book\w*|reading|literature)\b/.test(topics))return [
  'Original editorial AI concept featuring contemporary book stacks, warm textures and reading objects, no claimed photograph of the bookstore or its actual inventory. Clearly label AI concept.',
  'Original bookshop-inspired still life, intentional lighting and typographic composition, no recognizable premises or trademarked book covers. Clearly label AI concept.'
 ];
 return [
  'Original premium editorial still life reflecting '+(focus||'professional services')+', sophisticated material, natural light and restrained visual hierarchy; no claimed business office or completed client project. Clearly label AI concept.',
  'Original abstract architectural-detail AI concept for '+(focus||'a professional service')+', no actual employee, headquarters or customer work. Clearly label AI concept.'
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
