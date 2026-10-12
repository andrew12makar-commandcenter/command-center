import type {Template} from '@/lib/demo-engine';

export type ConceptImage={
 src:string;
 alt:string;
 disclosure:string;
 role:'hero'|'editorial'|'detail';
};

export type GeneratedConceptSet={hero:ConceptImage;editorial:ConceptImage;detail:ConceptImage};

const disclosure='AI-generated concept visual. Not a photograph of the business.';
const concepts:Record<Template,GeneratedConceptSet>={
 medical:{
  hero:{src:'/concepts/medical-calm-interior-v1.jpg',alt:'Generated concept of a calm contemporary dental treatment room',disclosure,role:'hero'},
  editorial:{src:'/concepts/medical-reception-editorial-v1.jpg',alt:'Generated concept of a warm contemporary reception and consultation area',disclosure,role:'editorial'},
  detail:{src:'/concepts/medical-treatment-detail-v1.jpg',alt:'Generated concept showing a refined dental treatment-room detail',disclosure,role:'detail'}
 },
 landscaping:{
  hero:{src:'/concepts/landscaping-crafted-outdoor-v1.jpg',alt:'Generated concept of a crafted contemporary residential landscape',disclosure,role:'hero'},
  editorial:{src:'/concepts/landscaping-stone-path-v1.jpg',alt:'Generated concept of a planted natural-stone garden path',disclosure,role:'editorial'},
  detail:{src:'/concepts/landscaping-garden-threshold-v1.jpg',alt:'Generated concept showing a crafted garden threshold and material detail',disclosure,role:'detail'}
 },
 universal:{
  hero:{src:'/concepts/universal-consultation-studio-v1.jpg',alt:'Generated concept of a refined contemporary consultation studio',disclosure,role:'hero'},
  editorial:{src:'/concepts/universal-material-studio-v1.jpg',alt:'Generated concept of a tactile professional design workspace',disclosure,role:'editorial'},
  detail:{src:'/concepts/universal-collaboration-v1.jpg',alt:'Generated concept of a calm collaborative meeting space',disclosure,role:'detail'}
 }
};

/**
 * Generated visuals are first-party concept assets. Their disclosure remains
 * attached so they are never represented as photographs of the actual business.
 */
export function getGeneratedConceptSet(template:Template):GeneratedConceptSet{return concepts[template];}

/** Backward-compatible helper for callers that only need a hero. */
export function getPrivatePreviewConcept(template:Template):ConceptImage{
 return getGeneratedConceptSet(template).hero;
}
