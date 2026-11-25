// The generator's searchable design space. Every candidate is one assignment of
// a value to each dimension, so feedback can name the exact decision it
// affects ("imageryDensity was immersive, now accent") and the loop can test
// alternatives deterministically before anyone considers a paid model call.
import {stableHash} from './stable-hash.ts';

export const designDimensions={
 composition:['split-editorial','immersive','bento','service-index','centered','asymmetric'],
 hierarchy:['offer-first','proof-first','story-first','action-first'],
 typography:['editorial-serif','classic-serif','humanist-sans','geometric-sans','grotesk-display'],
 palette:['ink-paper','harbor','forest','clay','graphite','orchard'],
 imageryDensity:['none','accent','balanced','immersive'],
 ctaStructure:['single','paired','sticky-bar','section-inline'],
 motionSystem:['minimal','calm','precise','cinematic'],
 spacing:['compact','regular','airy'],
 copyDepth:['brief','standard','detailed'],
} as const;

export type Dimension=keyof typeof designDimensions;
export type DimensionValue<D extends Dimension=Dimension>=typeof designDimensions[D][number];
export type DesignCandidate={[D in Dimension]:DimensionValue<D>};

export const dimensionNames=Object.keys(designDimensions) as Dimension[];
/** Ordinal dimensions accept "more" / "less" feedback; their values are ordered low to high. */
export const ordinalDimensions:ReadonlySet<Dimension>=new Set(['imageryDensity','motionSystem','spacing','copyDepth']);

export function isDimension(value:string):value is Dimension{return value in designDimensions;}
export function isValue<D extends Dimension>(dimension:D,value:string):value is DimensionValue<D>{
 return (designDimensions[dimension] as readonly string[]).includes(value);
}
export function ordinalStep<D extends Dimension>(dimension:D,value:DimensionValue<D>,direction:'up'|'down'):DimensionValue<D>{
 const values=designDimensions[dimension] as readonly DimensionValue<D>[];
 const i=values.indexOf(value)+(direction==='up'?1:-1);
 return values[Math.max(0,Math.min(values.length-1,i))];
}
export function candidateKey(candidate:DesignCandidate){return stableHash(candidate);}

/** Colour tokens. Contrast is measured by the evaluator, never assumed. */
export const palettes:Record<DimensionValue<'palette'>,{bg:string;fg:string;muted:string;accent:string;onAccent:string;surface:string}>={
 'ink-paper':{bg:'#fbfaf7',fg:'#16171a',muted:'#55575e',accent:'#1f3b73',onAccent:'#ffffff',surface:'#f0eee8'},
 harbor:{bg:'#f4f7f9',fg:'#0f2230',muted:'#4a5d6b',accent:'#0b6e8a',onAccent:'#ffffff',surface:'#e3ebf0'},
 forest:{bg:'#f3f5f0',fg:'#17251b',muted:'#4b5a4f',accent:'#2f5d3a',onAccent:'#ffffff',surface:'#e2e8dd'},
 clay:{bg:'#faf6f2',fg:'#2a1d17',muted:'#6a5a51',accent:'#9a4a2c',onAccent:'#ffffff',surface:'#efe5dc'},
 graphite:{bg:'#121417',fg:'#f2f3f5',muted:'#a9adb5',accent:'#e8c35a',onAccent:'#16171a',surface:'#1d2025'},
 orchard:{bg:'#fffdf6',fg:'#1d1a12',muted:'#5e584a',accent:'#c2410c',onAccent:'#ffffff',surface:'#f4eedd'},
};

export const typePairs:Record<DimensionValue<'typography'>,{display:string;body:string;displayScale:number}>={
 'editorial-serif':{display:'Newsreader',body:'Manrope',displayScale:1.0},
 'classic-serif':{display:'Literata',body:'Inter Tight',displayScale:0.92},
 'humanist-sans':{display:'Manrope',body:'Manrope',displayScale:0.9},
 'geometric-sans':{display:'Archivo',body:'Inter Tight',displayScale:0.95},
 'grotesk-display':{display:'Archivo',body:'Literata',displayScale:1.12},
};

// ---------------------------------------------------------------------------
// Business facts. Every optional field is either verified for a real business
// or explicitly fictional in a benchmark fixture. Absent means unknown: the
// composer omits the section instead of filling it.
export type ConversionKind='book'|'call'|'order'|'visit'|'donate'|'enroll'|'quote'|'contact'|'consult';
export type BusinessImage={url:string;alt:string;role:'hero'|'gallery'|'team'|'detail';
 /** Operator judgement of the photo itself; unknown counts as usable. */
 quality?:'high'|'usable'|'low'};
export type GeneratedImage={src:string;alt:string;disclosure:string};
export type BusinessFacts={
 id:string;name:string;industry:string;city:string;
 about:string;offerings:string[];
 conversion:ConversionKind;conversionUrl?:string|null;
 phone?:string|null;email?:string|null;address?:string|null;hours?:string[]|null;
 team?:{name:string;role:string}[];process?:string[];proof?:string[];
 faq?:{q:string;a:string}[];serviceArea?:string[];
 /** Visual proof is central: the work itself is what people judge (food, portfolios, spaces, products). */
 visualWork?:boolean;
 /** Same-day or emergency need is part of the offer. */
 urgent?:boolean;
 /** Where the service happens. Inferred from address and service area when absent. */
 serviceMode?:'at-location'|'on-site'|'remote'|'mixed';
 /** Who the site mainly speaks to. */
 audience?:'general'|'professional'|'vulnerable'|'families';
 imagery:{
  generatedAllowed:boolean;
  /** Host covered by a saved authorization attestation, or null. */
  authorizedHost:string|null;
  businessImages:BusinessImage[];
  generated:GeneratedImage[];
 };
};

export type BusinessTraits={
 trust:'standard'|'elevated'|'high';
 conversion:'appointment'|'purchase'|'quote'|'donation'|'consultation'|'enrollment';
 imagery:'none'|'scarce'|'adequate'|'rich';
 complexity:'simple'|'moderate'|'complex';
 locality:'at-location'|'on-site'|'remote'|'mixed';
 urgent:boolean;
 audience:'general'|'professional'|'vulnerable'|'families';
 contentDepth:'thin'|'moderate'|'rich';
 visualProof:boolean;
};
export type TraitKey=keyof BusinessTraits;
export const traitKeys:TraitKey[]=['trust','conversion','imagery','complexity','locality','urgent','audience','contentDepth','visualProof'];
/** The unremarkable value of each trait. A rule learned from businesses that
 *  merely share an unremarkable value is not conditioned on it. */
export const unmarkedTrait:Partial<Record<TraitKey,string|boolean>>={trust:'standard',imagery:'adequate',complexity:'moderate',
 audience:'general',contentDepth:'moderate',urgent:false,visualProof:false};

const credential=/\b(dr|md|do|dds|dmd|dvm|esq|cpa|cfp|rn|np|pa-c|dpt|licensed|certified|board[- ]certified|accredited|admitted)\b/i;
const hostOf=(url:string)=>{try{return new URL(url).hostname.toLowerCase().replace(/^www\./,'');}catch{return null;}};

/** Traits come only from the facts, never from the industry label, so an
 *  unusual business is handled by what it offers rather than a lookup table. */
export function deriveTraits(f:BusinessFacts):BusinessTraits{
 const credentials=(f.proof??[]).filter(p=>credential.test(p)).length+(f.team??[]).filter(t=>credential.test(t.name+' '+t.role)).length;
 const audience=f.audience??'general';
 const trust:BusinessTraits['trust']=credentials>=2||(credentials>=1&&audience==='vulnerable')?'high':credentials>=1||(f.proof?.length??0)>=2||audience==='vulnerable'?'elevated':'standard';
 const conversion:BusinessTraits['conversion']={book:'appointment',call:'consultation',order:'purchase',visit:'purchase',
  donate:'donation',enroll:'enrollment',quote:'quote',contact:'consultation',consult:'consultation'}[f.conversion] as BusinessTraits['conversion'];
 const host=f.imagery.authorizedHost?.replace(/^www\./,'')??null;
 const permitted=host?f.imagery.businessImages.filter(i=>hostOf(i.url)===host&&i.quality!=='low').length:0;
 const imagery:BusinessTraits['imagery']=permitted>=4?'rich':permitted>=2?'adequate':permitted>=1||(f.imagery.generatedAllowed&&f.imagery.generated.length)?'scarce':'none';
 const steps=(f.process?.length??0)+(f.faq?.length??0);
 const complexity:BusinessTraits['complexity']=f.offerings.length>=6||steps>=6?'complex':f.offerings.length<=2&&steps<2?'simple':'moderate';
 const locality=f.serviceMode??(f.address&&f.serviceArea?.length?'mixed':f.serviceArea?.length?'on-site':f.address?'at-location':'remote');
 const depth=[f.team?.length,f.process?.length,f.proof?.length,f.faq?.length,f.hours?.length,f.serviceArea?.length]
  .filter(n=>(n??0)>0).length+Math.min(3,Math.floor(f.offerings.length/3));
 return {trust,conversion,imagery,complexity,locality,urgent:Boolean(f.urgent),audience,
  contentDepth:depth>=4?'rich':depth>=2?'moderate':'thin',visualProof:Boolean(f.visualWork)};
}

/** Deterministic starting point from traits. Feedback rules and the search
 *  loop move away from it; nothing here names an industry. */
export function traitDefaults(t:BusinessTraits,seed:string):DesignCandidate{
 const pick=<D extends Dimension>(d:D,options:DimensionValue<D>[])=>options[parseInt(stableHash(seed+d).slice(0,6),16)%options.length];
 const visual=t.visualProof&&t.imagery!=='none';
 return {
  composition:visual?pick('composition',['immersive','asymmetric']):t.complexity==='complex'?pick('composition',['service-index','split-editorial']):pick('composition',['split-editorial','centered','bento']),
  hierarchy:t.urgent||t.conversion==='purchase'?'action-first':t.trust==='high'?'proof-first':t.conversion==='donation'?'story-first':'offer-first',
  typography:pick('typography',t.visualProof?['editorial-serif','grotesk-display']:['humanist-sans','classic-serif','geometric-sans']),
  palette:pick('palette',['ink-paper','harbor','forest','clay','orchard']),
  imageryDensity:t.imagery==='none'?'none':visual?(t.imagery==='rich'?'immersive':'balanced'):'accent',
  ctaStructure:t.urgent?'sticky-bar':'paired',
  motionSystem:t.visualProof?'cinematic':'calm',
  spacing:'regular',
  copyDepth:t.contentDepth==='rich'?'standard':'brief',
 };
}
