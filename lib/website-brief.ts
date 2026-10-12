/**
 * Business Website Intelligence Brief.
 *
 * Combines per-page fact extractions (scripts/site-facts.mjs) into one review
 * document that keeps four things apart:
 *   1. source-stated facts (what the business's own pages say, with URL + time)
 *   2. conflicts (the site states different values in different places)
 *   3. design references (colors, fonts, navigation, logo candidates)
 *   4. missing information (what the generator must NOT invent)
 * plus redesign observations that are each tied to a measured page property.
 *
 * Nothing here is "verified". A business's own website can be stale or wrong.
 */
export type FactSource={url:string;capturedAt:string;method:string;excerpt:string};
export type PageFact={field:string;value:unknown;status:'source_stated';source:FactSource};
export type PageExtraction={
 kind:'command-center-site-facts/v1';url:string;capturedAt:string;facts:PageFact[];
 design:{themeColor:string|null;frequentColors:string[];fonts:string[];navigation:string[];logoCandidates:string[]};
 structure:{title:string;metaDescription:string|null;h1:string[];hasViewportMeta:boolean;lang:string|null;
  imageCount:number;imagesMissingAlt:number;formCount:number;sectionCount:number;navItemCount:number;
  hasJsonLd:boolean;textLength:number;scriptCount:number};
 needsBrowserRender:boolean;
};
export type BriefFact={value:unknown;sources:FactSource[]};
export type WebsiteBrief={
 kind:'command-center-website-brief/v1';businessName:string;website:string;generatedAt:string;
 pagesAnalyzed:string[];
 facts:Record<string,BriefFact[]>;
 conflicts:{field:string;values:unknown[];note:string}[];
 missing:{field:string;consequence:string}[];
 design:{themeColor:string|null;colors:string[];fonts:string[];navigation:string[];logoCandidates:string[]};
 observations:{finding:string;evidence:string;page:string}[];
 status:'source_stated_unverified';
};

const singleValued=['name','address','email'];
const required:[string,string][]=[
 ['phone','No phone number published: the site must not show one until confirmed with the owner.'],
 ['address','No street address found: treat as a possible service-area business; do not invent a location.'],
 ['hours','No hours found: omit hours rather than guessing.'],
 ['service','No structured service list: use only operator-reviewed service candidates.'],
 ['conversionLink','No booking, estimate or reservation link found: primary action falls back to phone or email.']
];
const key=(v:unknown)=>typeof v==='string'?v.toLowerCase().replace(/[^a-z0-9]/g,''):JSON.stringify(v);

export function buildWebsiteBrief(businessName:string,website:string,pages:PageExtraction[],now=new Date()):WebsiteBrief{
 const facts:Record<string,BriefFact[]>={};
 for(const page of pages)for(const f of page.facts){
  const list=facts[f.field]??=[];
  const existing=list.find(x=>key(x.value)===key(f.value));
  if(existing){if(!existing.sources.some(s=>s.url===f.source.url&&s.method===f.source.method))existing.sources.push(f.source);}
  else list.push({value:f.value,sources:[f.source]});
 }
 // A services list from structured data supersedes heuristic candidates only
 // in presentation; both stay recorded.
 const conflicts:WebsiteBrief['conflicts']=[];
 for(const field of singleValued){
  const values=facts[field]??[];
  if(values.length>1)conflicts.push({field,values:values.map(v=>v.value),
   note:`The site states ${values.length} different ${field} values. Confirm the current one with the owner; none was chosen automatically.`});
 }
 if((facts.phone?.length??0)>1)conflicts.push({field:'phone',values:facts.phone.map(v=>v.value),
  note:'Several phone numbers appear. They may be different departments or an outdated number. Confirm which is primary.'});

 const has=(f:string)=>(facts[f]?.length??0)>0||(f==='service'&&(facts.serviceCandidate?.length??0)>0);
 const missing=required.filter(([f])=>!has(f)).map(([field,consequence])=>({field,consequence}));

 const observations:WebsiteBrief['observations']=[];
 for(const p of pages){
  const s=p.structure,o=(finding:string,evidence:string)=>observations.push({finding,evidence,page:p.url});
  if(!s.hasViewportMeta)o('Page is not configured for mobile screens.','No <meta name="viewport"> tag.');
  if(!s.metaDescription)o('No search description.','No <meta name="description">.');
  if(s.h1.length===0)o('No main page heading.','Zero <h1> elements.');
  if(s.h1.length>1)o('Competing main headings.',`${s.h1.length} <h1> elements.`);
  if(s.navItemCount>9)o('Navigation is crowded.',`${s.navItemCount} distinct navigation links.`);
  if(s.imagesMissingAlt>0)o('Images lack text alternatives.',`${s.imagesMissingAlt} of ${s.imageCount} images have no alt attribute.`);
  if(!s.hasJsonLd)o('No structured business data for search engines.','No JSON-LD found.');
  if(p.needsBrowserRender)o('Content may only appear after JavaScript runs; a rendered capture is needed before judging it.',`${s.textLength} characters of HTML text, ${s.scriptCount} external scripts.`);
 }
 if(!has('conversionLink'))observations.push({finding:'No direct booking/estimate/reservation path.',evidence:'No link text or URL matched booking, appointment, estimate, quote or reservation.',page:website});

 const pick=<T,>(get:(p:PageExtraction)=>T[])=>[...new Set(pages.flatMap(get))];
 return {kind:'command-center-website-brief/v1',businessName,website,generatedAt:now.toISOString(),
  pagesAnalyzed:pages.map(p=>p.url),facts,conflicts,missing,
  design:{themeColor:pages.map(p=>p.design.themeColor).find(Boolean)??null,colors:pick(p=>p.design.frequentColors).slice(0,8),
   fonts:pick(p=>p.design.fonts),navigation:pick(p=>p.design.navigation).slice(0,20),logoCandidates:pick(p=>p.design.logoCandidates).slice(0,3)},
  observations,status:'source_stated_unverified'};
}

const show=(v:unknown):string=>{
 if(typeof v==='string')return v;
 const o=(v&&typeof v==='object'?v:{}) as {question?:string;text?:string;href?:string};
 if(o.question)return 'Q: '+o.question;
 if(o.href)return (o.text||'(no text)')+' → '+o.href;
 return JSON.stringify(v);
};
const labels:Record<string,string>={name:'Business name',businessType:'Declared type',phone:'Phone',email:'Email',address:'Address',geo:'Coordinates',
 hours:'Hours',serviceArea:'Service area',service:'Services (structured data)',serviceCandidate:'Service candidates (from headings, review needed)',
 conversionLink:'Booking / estimate links',profileLink:'Linked profiles',priceRange:'Price range',faq:'FAQ',logo:'Logo'};

export function briefToMarkdown(b:WebsiteBrief):string{
 const L=[`# Website Intelligence Brief: ${b.businessName}`,'',`Source site: ${b.website} · generated ${b.generatedAt} · ${b.pagesAnalyzed.length} page(s)`,'',
  '> Everything below is **stated by the business\'s own website**, not independently verified. Confirm with the owner before using it in a client site.','',
  '## Source-stated facts',''];
 const fields=Object.keys(labels).filter(f=>b.facts[f]?.length);
 if(!fields.length)L.push('No business facts could be extracted.');
 for(const f of fields){
  L.push(`**${labels[f]}**`);
  for(const v of b.facts[f].slice(0,12))L.push(`- ${show(v.value)} _(${v.sources.map(s=>`${s.method}, ${s.url}, ${s.capturedAt.slice(0,10)}`).join('; ')})_`);
  L.push('');
 }
 L.push('## Conflicts','');
 if(!b.conflicts.length)L.push('None detected.');
 for(const c of b.conflicts)L.push(`- **${c.field}:** ${c.values.map(show).join(' | ')}. ${c.note}`);
 L.push('','## Missing information (do not invent)','');
 if(!b.missing.length)L.push('Core fields were all found at least once.');
 for(const m of b.missing)L.push(`- **${m.field}:** ${m.consequence}`);
 L.push('','## Design references','',`- Theme color: ${b.design.themeColor??'none declared'}`,`- Frequent colors: ${b.design.colors.join(', ')||'none found in inline CSS'}`,
  `- Fonts: ${b.design.fonts.join(', ')||'not identifiable from HTML'}`,`- Navigation: ${b.design.navigation.join(' · ')||'none found'}`,
  `- Logo candidates (reference only, rights not cleared): ${b.design.logoCandidates.join(', ')||'none'}`,'','## Redesign observations','');
 if(!b.observations.length)L.push('No structural problems detected in the analyzed HTML.');
 for(const o of b.observations)L.push(`- ${o.finding} Evidence: ${o.evidence} (${o.page})`);
 return L.join('\n')+'\n';
}
