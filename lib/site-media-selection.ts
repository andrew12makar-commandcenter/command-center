// Shared by private demos and standalone site exports. Photo roles and rights
// are explicit: a staff portrait is not generic project imagery, and a
// reference-only image is never rendered just because it has a URL.
import type {SiteBlueprint} from './site-blueprint.ts';
import type {GeneratedConceptSet} from './concept-imagery.ts';

export type RenderMedia={src:string;alt:string;credit:string|null|undefined;concept:boolean};

export function selectSiteMedia(site:Pick<SiteBlueprint,'design'|'content'>,conceptMedia?:GeneratedConceptSet){
 const allowed=site.design.imageTreatment!=='minimal';
 if(!allowed)return {displayHero:null as RenderMedia|null,gallery:[] as RenderMedia[]};
 const approved=site.content.images.filter(image=>image.permission==='approved');
 const hero=approved.find(image=>image.role==='hero');
 const concepts=site.content.generatedImageryEnabled?conceptMedia:undefined;
 const displayHero:RenderMedia|null=hero
  ?{src:hero.url,alt:hero.alt,credit:hero.credit,concept:false}
  :concepts?{src:concepts.hero.src,alt:concepts.hero.alt,credit:concepts.hero.disclosure,concept:true}
  :null;
 const potential:RenderMedia[]=[
  // Only gallery-tagged approved business images belong in a work gallery.
  // Team photos are deliberately held out until a dedicated team section exists.
  ...approved.filter(image=>image.role==='gallery').map(image=>({
   src:image.url,alt:image.alt,credit:image.credit,concept:false
  })),
  ...(concepts?[concepts.editorial,concepts.detail].map(image=>({
   src:image.src,alt:image.alt,credit:image.disclosure,concept:true
  })):[])
 ];
 // A single photo assigned two roles must not appear in the hero AND gallery.
 const seen=new Set(displayHero?[displayHero.src]:[]);
 const gallery=potential.filter(image=>{
  if(seen.has(image.src))return false;
  seen.add(image.src);
  return true;
 }).slice(0,8);
 return {displayHero,gallery};
}

/** Accurate copy for gallery sections, even when only one media source exists. */
export function galleryMediaDescription(images:ReadonlyArray<Pick<RenderMedia,'concept'>>):string{
 if(images.length===0)return '';
 if(images.every(image=>image.concept))
  return 'Illustrative AI-generated concepts, not photographs of this business.';
 if(images.every(image=>!image.concept))
  return 'Approved business photography presented as visual reference.';
 return 'Approved business photography alongside clearly marked AI-generated concepts.';
}
