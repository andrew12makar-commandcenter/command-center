import type {Template} from '@/lib/demo-engine';
import {classifyIndustry,type BusinessLine} from './business-classification.ts';

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

const tradeDisclosure='Typographic concept mark. Not a photograph of the business.';
const tradeLabel:Record<Exclude<BusinessLine,null>,string>={
 barber:'Barber',salon:'Salon',produce:'Produce',deli:'Deli',convenience:'Convenience'
};

// A mark is not a stand-in photograph. Dental, landscape, and studio JPEGs stay
// on the trades they were drawn for.
function tradeMark(line:Exclude<BusinessLine,null>):GeneratedConceptSet{
 const label=tradeLabel[line];
 const image=(role:ConceptImage['role'],caption:string):ConceptImage=>{
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" fill="#f6f3ec"/><text x="80" y="88" text-anchor="middle" font-size="18" font-family="Georgia,serif" fill="#1c2b38">${caption}</text></svg>`;
  return {
   src:`data:image/svg+xml,${encodeURIComponent(svg)}`,
   alt:`Typographic concept mark for a ${label.toLowerCase()} business, ${caption}. Not a photograph of the business.`,
   disclosure:tradeDisclosure,
   role
  };
 };
 return {
  hero:image('hero',label+' mark'),
  editorial:image('editorial',label+' section'),
  detail:image('detail',label+' detail')
 };
}

/**
 * The legacy concept library is NOT a universal stock photo bank. A dental
 * chair on a veterinary site is harmful even when disclosed as conceptual.
 * Barber, salon, produce, deli, and convenience businesses get a typographic
 * mark instead of the studio or dental photographs. Other unmatched subtypes
 * stay without a concept image until a rights-cleared match exists.
 */
export function getMatchedConceptSet(
 template:Template,category:string|null|undefined,services:readonly string[]=[],
 businessName=''
):GeneratedConceptSet|undefined{
 const subject=[category??'',...services,businessName].join(' ');
 const recorded=classifyIndustry(businessName,category);
 const hinted=classifyIndustry(subject,category||subject);
 const line=recorded.line??hinted.line;
 if(line)return tradeMark(line);
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
