// Structural evaluator for a composed + rendered candidate.
//
// Two kinds of output, kept apart on purpose:
//  - checks: objective pass/fail tests. A failed `gate` check blocks the
//    candidate (unverified CTA, unauthorized image, unsourced fact, contrast
//    below 4.5:1, missing motion coverage or reduced-motion fallback).
//  - structural metrics: 0..1 measurements of things that can be counted
//    (fact coverage, card repetition, whitespace, balance, mobile density).
// Neither is a judgement of beauty. Aesthetic preference lives in the
// feedback rules and is reported separately as `alignment` by the loop.
// Pixel-level checks belong to the optional browser pass.
import {deriveTraits,type BusinessFacts,type DesignCandidate} from './design-space.ts';
import {permittedBusinessImages,type PagePlan,type PlanSection} from './compose.ts';
import {stableHash} from './stable-hash.ts';

export type StructuralMetric='contentSpecificity'|'genericCopy'|'ctaClarity'|'typographyHierarchy'|'imagery'|'mobileLayout'|
 'accessibility'|'motionCoverage'|'reducedMotion'|'visualBalance'|'whitespace'|'cardRepetition'|'sourceCompliance';
export const structuralWeights:Record<StructuralMetric,number>={contentSpecificity:.13,genericCopy:.07,ctaClarity:.1,
 typographyHierarchy:.07,imagery:.09,mobileLayout:.09,accessibility:.1,motionCoverage:.06,reducedMotion:.05,
 visualBalance:.07,whitespace:.06,cardRepetition:.06,sourceCompliance:.05};
export type Check={id:string;pass:boolean;severity:'gate'|'warn';detail:string};
export type Evaluation={
 renderId:string;
 metrics:Record<StructuralMetric,number>;
 /** Weighted structural score. Not an aesthetic rating. */
 structural:number;
 checks:Check[];gates:string[];notes:string[];signature:string[];
};

function luminance(hex:string){
 const n=parseInt(hex.slice(1),16),ch=[(n>>16)&255,(n>>8)&255,n&255].map(v=>{const s=v/255;return s<=.03928?s/12.92:((s+.055)/1.055)**2.4;});
 return .2126*ch[0]+.7152*ch[1]+.0722*ch[2];
}
export function contrastRatio(a:string,b:string){const [x,y]=[luminance(a),luminance(b)].sort((m,n)=>n-m);return (x+.05)/(y+.05);}

/** Generic copy known to come from fallbacks or filler. Matching any of these is a gate. */
export const genericFallback=/\b(world[- ]class|best in town|second to none|one[- ]stop shop|solutions for all your|we pride ourselves|quality you can trust|lorem ipsum|your trusted partner|state[- ]of[- ]the[- ]art|a better way to meet your next customer|care starts with a clearer first step|outdoor spaces worth coming home to|details require (owner )?confirmation|will be confirmed with the business)\b/i;
const templateLabels=/^(what we offer|how it works|questions people ask|where we work|visit|credentials and affiliations|the people you will work with|recent work|a closer look|about .+)$/i;
const digits=(s:string)=>s.replace(/\D/g,'');
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const words=(s:string)=>s.toLowerCase().replace(/[^a-z0-9@.\s-]/g,' ').split(/\s+/).filter(w=>w.length>2&&!/^(and|the|for|with|our|you|your|in|of)$/.test(w));

export function layoutOf(s:PlanSection):'cards'|'grid'|'list'|'split'|'gallery'|'prose'{
 if(s.kind==='gallery')return 'gallery';
 if(s.items.length>=2&&s.columnsDesktop>=3)return 'cards';
 if(s.items.length>=2&&s.columnsDesktop===2)return 'grid';
 if(s.images.length&&s.columnsDesktop>1)return 'split';
 if(s.items.length>=2)return 'list';
 return 'prose';
}

/** Structural fingerprint used for visual-regression comparison. */
export function planSignature(p:PagePlan){
 return [
  ...p.sections.map(s=>`${s.kind}:${layoutOf(s)}:c${s.columnsDesktop}/${s.columnsMobile}:i${s.images.length}:r${s.reveal}:a${s.ctas.length}`),
  `type:${p.candidate.typography}`,`palette:${p.candidate.palette}`,`space:${p.spacingPx}`,
  `ctas:${p.globalCtas.map(c=>c.placement).join('+')}`,
 ];
}

/** Cheapest checks, run before anything is composed or rendered. */
export function precheckCandidate(c:DesignCandidate,palette:{bg:string;fg:string;muted:string;accent:string;onAccent:string;surface:string}){
 const out:string[]=[];
 for(const [name,fg,bg] of [['body text',palette.fg,palette.bg],['muted text',palette.muted,palette.bg],['button text',palette.onAccent,palette.accent],
  ['text on surface',palette.fg,palette.surface],['muted on surface',palette.muted,palette.surface]] as const){
  const r=contrastRatio(fg,bg);if(r<4.5)out.push(`${name} contrast ${r.toFixed(2)}:1 is below 4.5:1 (palette ${c.palette})`);
 }
 return out;
}

export function evaluatePlan(f:BusinessFacts,p:PagePlan,html:string):Evaluation{
 const t=deriveTraits(f);
 const checks:Check[]=[],notes:string[]=[];
 const check=(id:string,pass:boolean,severity:'gate'|'warn',detail:string)=>{checks.push({id,pass,severity,detail});return pass;};
 const ids=new Set(p.sections.map(s=>s.id));
 const frags=p.sections.flatMap(s=>[s.heading,...s.body,...s.items]);
 const imgs=p.sections.flatMap(s=>s.images);

 // --- Source compliance: every fact-tagged fragment must trace to the facts.
 const factCorpus=new Set(words([f.name,f.city,f.about,...f.offerings,...(f.proof??[]),...(f.process??[]),...(f.hours??[]),
  ...(f.serviceArea??[]),f.address??'',f.phone??'',f.email??'',...(f.team??[]).flatMap(m=>[m.name,m.role]),...(f.faq??[]).flatMap(x=>[x.q,x.a])].join(' ')));
 const untraced=frags.filter(x=>x.source==='fact'&&words(x.text).some(w=>!factCorpus.has(w)));
 check('source.facts-traceable',!untraced.length,'gate',untraced.length?`untraced text: ${untraced.map(u=>u.text).slice(0,2).join(' | ')}`:'all fact text traces to verified facts');
 const permitted=new Set(permittedBusinessImages(f).ok.map(i=>i.url));
 const badImages=imgs.filter(i=>i.origin==='business'&&!permitted.has(i.src));
 check('source.image-authorization',!badImages.length,'gate',badImages.length?`business image without authorization: ${badImages[0].src}`:`${imgs.filter(i=>i.origin==='business').length} business image(s), all covered by authorization`);
 const undisclosed=imgs.filter(i=>i.origin==='generated'&&!i.disclosure);
 check('source.generated-disclosed',!undisclosed.length,'gate',undisclosed.length?`${undisclosed.length} generated image(s) without disclosure`:'generated images carry a disclosure');
 const sourceCompliance=clamp(1-untraced.length*.25-badImages.length*.5-undisclosed.length*.5);

 // --- Content specificity and generic fallback copy.
 const factChars=frags.filter(x=>x.source==='fact').reduce((n,x)=>n+x.text.length,0);
 const allChars=frags.reduce((n,x)=>n+x.text.length,0)||1;
 const available=f.offerings.length+(f.team?.length??0)+(f.process?.length??0)+(f.proof?.length??0)+(f.faq?.length??0)+
  (f.serviceArea?.length??0)+(f.hours?.length??0)+1;
 const shown=p.sections.reduce((n,s)=>n+s.items.filter(i=>i.source==='fact').length,0)+(p.sections.some(s=>s.kind==='story')?1:0);
 const coverage=Math.min(1,shown/available);
 if(coverage<.6)notes.push(`only ${shown} of ${available} verified facts reach the page`);
 const contentSpecificity=clamp(.5*factChars/allChars+.5*coverage);
 const fallback=[...frags,...p.globalCtas.map(c=>({text:c.label,source:'template' as const}))].filter(x=>genericFallback.test(x.text));
 check('copy.no-generic-fallback',!fallback.length,'gate',fallback.length?`fallback copy: ${fallback[0].text}`:'no known fallback phrases');
 const headings=p.sections.map(s=>s.heading);
 const templateHeadings=headings.filter(h=>h.source==='template'&&templateLabels.test(h.text)).length;
 const genericCopy=clamp(1-templateHeadings/Math.max(1,headings.length)*.6-fallback.length*.3);

 // --- CTA clarity and function.
 const ctas=[...p.globalCtas,...p.sections.flatMap(s=>s.ctas)];
 let invalid=0;
 for(const c of ctas){
  const ok=c.href.startsWith('#')?ids.has(c.href.slice(1)):
   c.href.startsWith('tel:')?Boolean(f.phone)&&digits(c.href)===digits(f.phone!):
   c.href.startsWith('mailto:')?c.href.slice(7)===f.email:
   /^https:\/\//.test(c.href)&&c.href===f.conversionUrl;
  if(!ok)invalid++;
  check(`cta.destination:${c.placement}:${c.label}`,ok,'gate',ok?`${c.href} is verified`:`"${c.label}" points to unverified destination ${c.href}`);
 }
 const heroPrimary=p.sections[0]?.ctas.some(c=>c.role==='primary')??false;
 check('cta.primary-in-hero',heroPrimary,'warn',heroPrimary?'primary action is in the first viewport section':'no primary action in the hero');
 const primaryLabels=new Map<string,Set<string>>();
 for(const c of ctas.filter(c=>c.role==='primary'))primaryLabels.set(c.href,(primaryLabels.get(c.href)??new Set()).add(c.label));
 const inconsistent=[...primaryLabels.values()].some(l=>l.size>1);
 const destinations=primaryLabels.size;
 let ctaClarity=(invalid?0:.4)+(heroPrimary?.25:0)+(destinations<=2?.15:0)+(inconsistent?0:.1);
 ctaClarity+=t.urgent?(p.globalCtas.some(c=>c.placement==='sticky')?.1:0):.1;
 ctaClarity=clamp(ctaClarity);

 // --- Typography and hierarchy.
 const h1=(html.match(/<h1[\s>]/g)??[]).length;
 check('a11y.single-h1',h1===1,'gate',`${h1} h1 element(s)`);
 const fs=35*p.typography.displayScale+9; // approx px at 390 wide
 const perLine=Math.max(8,Math.floor(358/(fs*.52)));
 const heroText=p.sections[0]?.heading.text??'';
 const lines=Math.ceil(heroText.length/perLine);
 const longestWord=Math.max(0,...heroText.split(/\s+/).map(w=>w.length));
 let typographyHierarchy=1;
 if(lines>4){typographyHierarchy-=.3;notes.push(`hero headline wraps to about ${lines} lines on a phone`);}
 if(longestWord>perLine){typographyHierarchy-=.3;notes.push('hero headline has a word wider than a phone line');}
 if(p.typography.display===p.typography.body&&p.typography.displayScale<.95)typographyHierarchy-=.15; // single family, weak scale contrast
 if(p.sections.some(s=>s.heading.text.length>70))typographyHierarchy-=.1;
 typographyHierarchy=clamp(typographyHierarchy);

 // --- Imagery density and relevance.
 const permittedBusiness=permitted.size;
 const availableImages=permittedBusiness+(f.imagery.generatedAllowed?f.imagery.generated.length:0);
 const generatedCount=imgs.filter(i=>i.origin==='generated').length,businessCount=imgs.length-generatedCount;
 let imagery=(imgs.length>=p.imagery.requested?.5:.25)+(t.visualProof?Math.min(1,imgs.length/3)*.5:imgs.length<=2?.5:.3);
 if(imgs.length<p.imagery.requested)notes.push(`layout asks for ${p.imagery.requested} images; ${imgs.length} placed from ${availableImages} permitted`);
 if(!t.visualProof&&generatedCount>=3){imagery-=.25;notes.push('generated imagery dominates a business whose offer is not visual');}
 if(t.visualProof&&permittedBusiness>=2&&businessCount<Math.min(3,permittedBusiness)){imagery-=.2;notes.push('authorized photos of real work are under-used');}
 if(t.visualProof&&businessCount===0&&generatedCount>0)notes.push('visual proof relies on generated concepts; real work photos need authorization');
 imagery=clamp(imagery);

 // --- Mobile layout (plan level; the browser pass measures real overflow).
 let mobileLayout=1;
 for(const s of p.sections){
  if(s.columnsMobile>2){mobileLayout-=.3;notes.push(`${s.id}: ${s.columnsMobile} columns on mobile`);}
  if(s.columnsMobile===2&&s.items.some(i=>i.text.length>24)){mobileLayout-=.15;notes.push(`${s.id}: long items in two mobile columns`);}
 }
 const estHeight=p.sections.reduce((n,s)=>n+p.spacingPx*2+80+s.items.length*28/Math.max(1,s.columnsMobile)+s.images.length*260+s.body.length*60,0);
 if(estHeight>9000){mobileLayout-=.2;notes.push(`estimated mobile length ${Math.round(estHeight)}px`);}
 if(p.globalCtas.some(c=>c.placement==='sticky')&&!/padding-bottom:8\dpx/.test(html))mobileLayout-=.2;
 mobileLayout=clamp(mobileLayout);

 // --- Accessibility.
 let accessibility=1;
 for(const g of precheckCandidate(p.candidate,p.palette)){check('a11y.contrast',false,'gate',g);accessibility-=.25;}
 if(!checks.some(c=>c.id==='a11y.contrast'))check('a11y.contrast',true,'gate','all text pairs at or above 4.5:1');
 const missingAlt=/<img(?![^>]*alt="[^"]{5,})/.test(html);
 check('a11y.alt-text',!missingAlt,'gate',missingAlt?'an image lacks meaningful alt text':'all images have alt text');
 const lang=/<html lang="/.test(html),skip=/class="skip"/.test(html);
 check('a11y.lang-and-skip',lang&&skip,'warn',`lang ${lang?'set':'missing'}, skip link ${skip?'present':'missing'}`);
 accessibility-=(h1!==1?.3:0)+(missingAlt?.3:0)+(lang?0:.1)+(skip?0:.1);
 accessibility=clamp(accessibility);

 // --- Motion: coverage is mandatory; reduced motion must be static.
 const moving=p.sections.filter(s=>s.reveal!=='none').length;
 const motionCoverage=moving/Math.max(1,p.sections.length);
 check('motion.coverage',motionCoverage===1,'gate',`${moving}/${p.sections.length} sections have an entrance transition`);
 const reducedCss=/prefers-reduced-motion:reduce\)\{\*\{transition:none!important;animation:none!important\}/.test(html);
 check('motion.reduced-static',reducedCss&&p.reducedMotion==='static','gate',reducedCss?'reduced motion disables every transition':'no reduced-motion fallback');
 const reducedMotion=reducedCss?1:0;

 // --- Visual balance: rhythm of image and text sections.
 const withImages=p.sections.map(s=>s.images.length>0);
 let run=0,longestTextRun=0;for(const w of withImages){run=w?0:run+1;longestTextRun=Math.max(longestTextRun,run);}
 const imageShare=withImages.filter(Boolean).length/Math.max(1,withImages.length);
 const [lo,hi]=t.visualProof?[.25,.7]:[0,.45];
 let visualBalance=1-(imageShare<lo?(lo-imageShare)*1.5:imageShare>hi?(imageShare-hi)*1.5:0);
 if(longestTextRun>=4){visualBalance-=.15;notes.push(`${longestTextRun} text-only sections in a row`);}
 // Split sections: a tall image beside a little text leaves a large empty
 // block on desktop (found by screenshot review, not by preference data).
 for(const sec of p.sections.filter(x=>x.images.length===1&&x.columnsDesktop>1&&x.kind!=='hero')){
  const rows=Math.ceil(sec.items.length/Math.max(1,sec.columnsDesktop))+sec.body.length*2;
  const textPx=70+rows*36,imagePx=490;
  if(textPx/imagePx<.4){visualBalance-=.12;notes.push(`${sec.id}: image beside little text leaves an empty block`);}
 }
 visualBalance=clamp(visualBalance);

 // --- Excessive whitespace: generous spacing around little content.
 const sparse=p.sections.filter(s=>s.kind!=='hero'&&s.items.length<=1&&s.body.length<=1&&!s.images.length).length;
 const sparseShare=sparse/Math.max(1,p.sections.length-1);
 let whitespace=1-sparseShare*(p.candidate.spacing==='airy'?1:p.candidate.spacing==='regular'?.5:.2);
 if(p.candidate.spacing==='airy'&&p.sections.length<=4)whitespace-=.15;
 if(whitespace<.7)notes.push(`${sparse} sparse section(s) at ${p.candidate.spacing} spacing`);
 whitespace=clamp(whitespace);

 // --- Repetitive cards.
 const layouts=p.sections.map(layoutOf);
 const cardSections=layouts.filter(l=>l==='cards').length;
 let consecutive=0,maxConsecutive=0;for(const l of layouts){consecutive=l==='cards'||l==='grid'?consecutive+1:0;maxConsecutive=Math.max(maxConsecutive,consecutive);}
 const cardRepetition=clamp(1-Math.max(0,cardSections-1)*.25-Math.max(0,maxConsecutive-1)*.2);
 if(cardRepetition<.8)notes.push(`${cardSections} card sections, ${maxConsecutive} grid-like sections in a row`);

 const metrics:Record<StructuralMetric,number>={contentSpecificity,genericCopy,ctaClarity,typographyHierarchy,imagery,mobileLayout,
  accessibility,motionCoverage,reducedMotion,visualBalance,whitespace,cardRepetition,sourceCompliance};
 const structural=(Object.keys(structuralWeights) as StructuralMetric[]).reduce((n,k)=>n+metrics[k]*structuralWeights[k],0);
 const gates=checks.filter(c=>!c.pass&&c.severity==='gate').map(c=>c.detail);
 return {renderId:stableHash(html),metrics,structural:Math.round(structural*1000)/1000,checks,gates,notes,signature:planSignature(p)};
}

/** Visual-regression diff between two signatures: what moved, appeared or vanished. */
export function signatureDiff(before:string[],after:string[]){
 const a=new Set(before),b=new Set(after);
 return {removed:before.filter(x=>!b.has(x)),added:after.filter(x=>!a.has(x))};
}
