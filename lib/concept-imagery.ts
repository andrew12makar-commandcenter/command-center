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

/**
 * The legacy concept library is NOT a universal stock photo bank. A dental
 * chair on a veterinary site is harmful even when disclosed as conceptual.
 * Unknown subtypes use typographic previews pending appropriately matched
 * and rights-cleared imagery.
 */
export function getMatchedConceptSet(
 template:Template,category:string|null|undefined,services:readonly string[]=[],
 businessName=''
):GeneratedConceptSet|undefined{
 const subject=[category??'',...services,businessName].join(' ').toLowerCase();
 const vet=/\b(vets?|veterinar\w*|animal\w*|pets?|canine|feline|puppy|kitten)\b/i;
 const dental=/\b(dent(?:al|ist|istry)|orthodont\w*|implants?|invisalign|teeth|tooth|endodont\w*)\b/i;
 const fieldOther=/\b(plumb\w*|hvac|heat(?:ing)?|air condition\w*|roof\w*|electri\w*|pest control|floor\w*|painting|garage|mason\w*)\b/i;
 const garden=/\b(landscap\w*|garden\w*|hardscap\w*|lawn\w*|plant(?:ing)?|irrigation|groundskeep\w*|outdoor design)\b/i;
 const hospitality=/\b(restaurant|cafe|coffee|bakery|bookstore|retail|salon|barber|fitness|gym|hotel|food|catering|pet|veterinar\w*)\b/i;
 const professional=/\b(consult\w*|strateg\w*|advis\w*|account\w*|law|attorney|architect\w*|design stud\w*|creative stud\w*|professional servic\w*)\b/i;
 if(template==='medical')return !vet.test(subject)&&dental.test(subject)?concepts.medical:undefined;
 if(template==='landscaping')return !fieldOther.test(subject)&&garden.test(subject)?concepts.landscaping:undefined;
 return !hospitality.test(subject)&&professional.test(subject)?concepts.universal:undefined;
}
