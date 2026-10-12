// Structured, provenance-carrying business facts from ONE already-fetched,
// already-guarded public HTML page. Parsing only: this module never fetches,
// so it cannot bypass the bounded research workflow's network safety checks.
//
// Every fact records where it came from (url, capturedAt, method) and the exact
// source excerpt. Facts are "source-stated", never "verified": a business's own
// website can be outdated or wrong.
import * as cheerio from 'cheerio';

const clean=(s,max=300)=>String(s??'').replace(/\s+/g,' ').trim().slice(0,max);
const phoneRe=/(?:\+?1[\s.-]?)?\(?([2-9]\d{2})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})\b/;
const emailRe=/^[^\s@<>()]{1,64}@[a-z0-9.-]{1,200}\.[a-z]{2,24}$/i;
const bookingRe=/\b(book|booking|appointment|schedule|request (?:an? )?(?:estimate|quote|consult\w*)|free (?:estimate|consultation)|get a quote|reserve|reservation|order online|start a project|start your project|get started)\b/i;
// Ordinary site pages that are never services, by link text.
const standardPage=/^(?:home|about(?: us)?|contact(?: us)?|blog|news|portfolio|gallery|projects?|our work|careers?|jobs|team|our team|staff|reviews?|testimonials?|faqs?|privacy(?: policy)?|terms.*|login|log in|sign in|account|shop|store|cart|checkout|sitemap|locations?|directions|patient forms|new patients|insurance|financing|payment.*|resources|events|press|media|community.*|start a project|get started|request.*|book.*|schedule.*|houzz|facebook|instagram|twitter|x|linkedin|youtube|tiktok|pinterest|yelp|google)$/i;
// A street address written as text: "740 Boston Post Road, Sudbury, MA 01776".
const streetAddressRe=/\b\d{1,5}\s+(?:[A-Z][a-zA-Z.'’-]*\s+){1,5}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Place|Pl|Court|Ct|Parkway|Pkwy|Highway|Hwy|Square|Sq|Terrace|Ter|Circle|Cir|Turnpike|Tpke)\.?(?:,?\s+(?:Unit|Suite|Ste|#|Floor|Fl)\.?\s*[\w-]+)?,?\s+[A-Z][a-zA-Z.'’ -]{1,30},?\s+(?:MA|Massachusetts|NH|RI|CT|ME|VT)\.?\s+\d{5}(?:-\d{4})?\b/g;
const serviceHint=/\b(services?|treatments?|what we do|capabilities|our work|practice areas|menu|specialt(?:y|ies))\b/i;
const dayRe=/\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i;
const timeRe=/\b\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)/i;

export function normalizePhone(raw){
 const m=String(raw||'').match(phoneRe);
 return m?`(${m[1]}) ${m[2]}-${m[3]}`:null;
}
function safeLink(href,base){
 try{
  const u=new URL(href,base);
  if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.port)return null;
  if(!u.hostname.includes('.')||/(^|\.)(localhost|local|internal|test|invalid)$/i.test(u.hostname)||/^[\d.]+$/.test(u.hostname))return null;
  u.hash='';return u.href;
 }catch{return null;}
}
const asArray=v=>v==null?[]:Array.isArray(v)?v:[v];

// Flatten JSON-LD (including @graph) and keep only plausible business nodes.
export function jsonLdNodes($){
 const out=[];
 $('script[type="application/ld+json"]').each((_,el)=>{
  const text=$(el).text();
  if(text.length>200_000)return;
  let data;try{data=JSON.parse(text);}catch{return;}
  const stack=[...asArray(data)];
  while(stack.length&&out.length<50){
   const n=stack.shift();
   if(!n||typeof n!=='object')continue;
   if(n['@graph'])stack.push(...asArray(n['@graph']));
   out.push(n);
  }
 });
 return out;
}
const typesOf=n=>asArray(n['@type']).map(String);
const isBusiness=n=>typesOf(n).some(t=>/LocalBusiness|Organization|Dentist|Physician|MedicalClinic|VeterinaryCare|Restaurant|Store|Plumber|HVACBusiness|Electrician|RoofingContractor|HomeAndConstructionBusiness|LegalService|Attorney|AccountingService|ProfessionalService|LandscapingBusiness|FoodEstablishment|HealthAndBeautyBusiness|SportsActivityLocation|AutoRepair/i.test(t));

export function extractBusinessFacts(html,url,capturedAt=new Date().toISOString()){
 if(typeof html!=='string'||html.length>2_000_000)throw Error('Invalid or oversized HTML');
 const $=cheerio.load(html);
 const facts=[];
 const seen=new Set();
 const fact=(field,value,method,excerpt)=>{
  if(value==null||value==='')return;
  const key=field+'|'+JSON.stringify(value);
  if(seen.has(key))return;seen.add(key);
  facts.push({field,value,status:'source_stated',source:{url,capturedAt,method,excerpt:clean(excerpt??value,240)}});
 };

 // 1. Structured data is the highest-signal source a site publishes about itself.
 const nodes=jsonLdNodes($);
 for(const n of nodes.filter(isBusiness)){
  const ex=clean(JSON.stringify({type:n['@type'],name:n.name}),200);
  fact('name',clean(n.name,140),'json-ld',ex);
  fact('businessType',typesOf(n).join(', '),'json-ld',ex);
  if(n.telephone)fact('phone',normalizePhone(n.telephone)||clean(n.telephone,40),'json-ld',n.telephone);
  if(n.email)fact('email',clean(String(n.email).replace(/^mailto:/i,''),140),'json-ld',n.email);
  for(const a of asArray(n.address)){
   if(typeof a==='string'){fact('address',clean(a,200),'json-ld',a);continue;}
   const line=[a.streetAddress,a.addressLocality,a.addressRegion,a.postalCode].filter(Boolean).map(x=>clean(x,80)).join(', ');
   if(line)fact('address',line,'json-ld',line);
  }
  if(n.geo?.latitude&&n.geo?.longitude)fact('geo',{lat:Number(n.geo.latitude),lon:Number(n.geo.longitude)},'json-ld',`${n.geo.latitude},${n.geo.longitude}`);
  for(const h of asArray(n.openingHours))fact('hours',clean(h,120),'json-ld',h);
  for(const s of asArray(n.openingHoursSpecification)){
   if(!s||typeof s!=='object')continue;
   const days=asArray(s.dayOfWeek).map(d=>String(d).replace(/^https?:\/\/schema\.org\//,'')).join(', ');
   if(days&&s.opens&&s.closes)fact('hours',`${days} ${s.opens}–${s.closes}`,'json-ld',`${days} ${s.opens}-${s.closes}`);
  }
  for(const area of asArray(n.areaServed))fact('serviceArea',clean(typeof area==='string'?area:area?.name,120),'json-ld',typeof area==='string'?area:area?.name);
  for(const s of asArray(n.sameAs)){const l=safeLink(s,url);if(l)fact('profileLink',l,'json-ld',s);}
  if(n.priceRange)fact('priceRange',clean(n.priceRange,40),'json-ld',n.priceRange);
  const offers=[...asArray(n.makesOffer),...asArray(n.hasOfferCatalog?.itemListElement)];
  for(const o of offers){
   const name=clean(o?.itemOffered?.name||o?.name,110);
   if(name)fact('service',name,'json-ld',name);
  }
  if(n.logo){const l=safeLink(typeof n.logo==='string'?n.logo:n.logo.url,url);if(l)fact('logo',l,'json-ld',l);}
 }
 for(const n of nodes.filter(n=>typesOf(n).includes('FAQPage')))
  for(const q of asArray(n.mainEntity).slice(0,15)){
   const question=clean(q?.name,200),answer=clean(q?.acceptedAnswer?.text?.replace(/<[^>]+>/g,' '),400);
   if(question&&answer)fact('faq',{question,answer},'json-ld',question);
  }

 // 2. Explicit contact links.
 $('a[href^="tel:"]').each((_,a)=>{const p=normalizePhone($(a).attr('href'));if(p)fact('phone',p,'tel-link',$(a).text()||$(a).attr('href'));});
 $('a[href^="mailto:"]').each((_,a)=>{
  const e=decodeURIComponent(($(a).attr('href')||'').slice(7).split('?')[0]).trim();
  if(emailRe.test(e))fact('email',e.toLowerCase(),'mailto-link',$(a).text()||e);
 });
 $('address').each((_,el)=>{const t=clean($(el).text(),200);if(t.length>8)fact('address',t,'address-element',t);});

 // 1b. Without structured data, the homepage title usually starts with the
 // business name ("Sudbury Design Group", "Contact : Sudbury Design Group").
 if(!facts.some(f=>f.field==='name')&&new URL(url).pathname==='/'){
  const title=clean($('title').first().text(),140).split(/\s+[|:–—-]\s+/)[0];
  if(title.length>=3&&title.split(/\s+/).length<=7&&!/^(home|welcome|index)$/i.test(title))fact('name',title,'page-title',$('title').first().text());
 }

 // 2b. Street addresses written as plain text (footers, contact blocks).
 // Several offices are kept as several facts; the brief does not pick one.
 const bodyText=clean($('body').text(),400_000);
 for(const m of bodyText.matchAll(streetAddressRe))fact('address',clean(m[0],200),'text-pattern',m[0]);

 // 3. Conversion paths: booking, estimate, reservation links.
 $('a[href]').each((_,a)=>{
  const text=clean($(a).text()||$(a).attr('aria-label'),80);
  const href=safeLink($(a).attr('href'),url);
  if(href&&bookingRe.test(text+' '+href))fact('conversionLink',{text,href},'link-text',text||href);
 });

 // 4. Hours written as text (only lines that contain both a day and a time).
 $('li,p,tr,dd,div').each((_,el)=>{
  if($(el).children('li,p,tr,div').length)return;
  const t=clean($(el).text(),140);
  if(t.length<10||t.length>140)return;
  if(dayRe.test(t)&&timeRe.test(t))fact('hours',t,'text-pattern',t);
 });

 // Marketing headings and claims are not services. Seen on a live plumbing
 // site: "Signs You May Need Repiping", symptoms, "Over 150 years of combined
 // experience", "Certified technicians". Claims are kept separately below.
 const notService=t=>t.length<3||t.length>60||t.split(/\s+/).length>7||/[?!:]$/.test(t)||/[.!?].+[.!?]/.test(t)||phoneRe.test(t)||
  /^(?:signs?|why|how|what|when|where|who|is|are|do|does|can|should|upgrade|get|call|contact|book|schedule|request|choose|meet|learn|read|our|your|the|we|over|trusted|recent|welcome|about|testimonials?|reviews?)\b/i.test(t)||
  /\b(?:today|now|near you|years?|experience|certified|licensed|insured|guarantee\w*|award\w*|trusted|best|top[- ]rated|#1|free)\b/i.test(t);
 const claimRe=/\b(?:\d+\+?\s+years?|since\s+(?:19|20)\d\d|family[- ]owned|licensed|insured|bonded|certified|award[- ]winning|top[- ]rated|#1|best\s+in|guarantee\w*|24\/7|emergency service)\b/i;

 // 5. Services listed directly under a services-like heading. Scope is the
 // run of elements up to the next heading of the same or higher level, not the
 // whole enclosing <div> (which on page builders is often the entire page).
 $('h1,h2,h3').each((_,h)=>{
  const heading=clean($(h).text(),120);
  // "Signs You May Need Repiping Services" mentions services but lists symptoms.
  if(!serviceHint.test(heading)||/^(?:signs?|why|how|what|when|benefits?|reasons?|common|is|are|do|does)\b/i.test(heading))return;
  const level=Number(h.tagName.slice(1));
  const stop=Array.from({length:level},(_,i)=>'h'+(i+1)).join(',');
  let items=$(h).nextUntil(stop).find('li,h3,h4').add($(h).nextUntil(stop).filter('li,h3,h4'));
  if(!items.length)items=$(h).parent().nextUntil(':has('+stop+')').find('li,h3,h4').slice(0,24);
  items.slice(0,24).each((__,item)=>{
   const t=clean($(item).text(),90);
   if(!notService(t))fact('serviceCandidate',t,'heading-section',`${clean($(h).text(),60)} → ${t}`);
  });
 });

 // 5b. Service pages linked from the site's own menus. Two URL styles occur:
 // /service/family-dental-care (Webflow dental site) and /repiping-services,
 // /sump-pump-repair (hibu plumbing site).
 const servicePath=/\/(?:services?|treatments?|procedures?|practice-areas?|what-we-do|our-work)\/[^/?#]+/i;
 const serviceSlug=/^\/[a-z0-9-]*(?:services?|repairs?|installation|cleaning|maintenance|replacement|inspection|treatments?|therapy|removal|design|remodel\w*|restoration)\/?$/i;
 const genericLink=/^(?:learn more|read more|more|details|view|see all|view all|click here|book now|services?|our services|all services)$/i;
 const isServiceUrl=path=>servicePath.test(path)||serviceSlug.test(path);
 $('a[href]').each((_,a)=>{
  const href=safeLink($(a).attr('href'),url);
  const t=clean($(a).text(),70);
  if(!href||t.length<3||genericLink.test(t))return;
  const target=new URL(href);
  if(target.hostname!==new URL(url).hostname||!isServiceUrl(target.pathname))return;
  fact('serviceCandidate',t,'service-page-link',`${t} → ${href}`);
 });
 // On a service page itself, short section headings name sub-services.
 if(isServiceUrl(new URL(url).pathname))$('h2,h3').slice(0,16).each((_,h)=>{
  const t=clean($(h).text(),70);
  if(!notService(t))fact('serviceCandidate',t,'service-page-heading',t);
 });

 // 5d. Marketing claims: recorded so a reviewer can verify them, never reused
 // automatically in generated copy.
 $('h2,h3,h4,li,strong').each((_,el)=>{
  const t=clean($(el).text(),120);
  if(t.length>=8&&t.length<=120&&claimRe.test(t)&&!$(el).find('h2,h3,h4,li').length)fact('claimCandidate',t,'page-text',t);
 });
 // Award badges are usually images ("best-of-houzz.png").
 $('img').each((_,i)=>{
  const label=(($(i).attr('alt')||'')+' '+($(i).attr('src')||'').split('/').pop()).replace(/[-_]+/g,' ').replace(/\.\w+$/,'');
  const m=label.match(/\b(best of [a-z]+(?: [a-z]+)?|award\w*[^,]{0,30}|winner[^,]{0,30}|accredited[^,]{0,30})/i);
  if(m)fact('claimCandidate',clean(m[0],80),'image-badge',$(i).attr('src')||m[0]);
 });

 // 5c. Named clinicians / staff. Only explicit titles count; plain names in
 // headings are too ambiguous to label as staff.
 const staffRe=/^(?:Dr\.?\s+[A-Z][\w'’.-]+(?:\s+[A-Z][\w'’.-]+){0,3}|[A-Z][\w'’.-]+(?:\s+[A-Z][\w'’.-]+){1,3},\s*(?:DDS|DMD|MD|DO|DVM|VMD|PhD|NP|PA-C|RN|RDH|Esq\.?|CPA))$/;
 $('a,h2,h3,h4').each((_,el)=>{
  const t=clean($(el).text(),70);
  if(staffRe.test(t))fact('staffCandidate',t,el.tagName==='a'?'link-text':'heading',t);
 });

 // 5c-2. Menu items that are not ordinary pages are likely the offerings
 // themselves ("Landscape Architecture", "Construction", "Estate Care").
 const host=new URL(url).hostname;
 $('header nav a, nav a, [class*="menu"] a').each((_,a)=>{
  const t=clean($(a).text(),60);
  const href=safeLink($(a).attr('href'),url);
  if(!href||new URL(href).hostname!==host||new URL(href).pathname==='/')return;
  if(standardPage.test(t)||notService(t)||staffRe.test(t)||t.length<4)return;
  fact('serviceCandidate',t,'navigation-item',`${t} → ${href}`);
 });

 // 6. FAQ written as <details>.
 $('details').slice(0,15).each((_,d)=>{
  const q=clean($(d).find('summary').first().text(),200);
  const a=clean($(d).clone().find('summary').remove().end().text(),400);
  if(q&&a)fact('faq',{question:q,answer:a},'details-element',q);
 });

 // Design and structure references (not facts about the business).
 const nav=$('header nav a, nav a').map((_,a)=>clean($(a).text(),40)).get().filter(Boolean);
 const fonts=new Set();
 $('link[href*="fonts.googleapis.com"]').each((_,l)=>{
  for(const m of String($(l).attr('href')).matchAll(/family=([^:&]+)/g))fonts.add(decodeURIComponent(m[1]).replace(/\+/g,' '));
 });
 const css=$('style').map((_,s)=>$(s).text()).get().join('\n').slice(0,400_000)+' '+$('[style]').map((_,e)=>$(e).attr('style')).get().join(';');
 const colorCounts={};
 for(const m of css.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)){
  let h=m[1].toLowerCase();if(h.length===3)h=h.split('').map(c=>c+c).join('');
  if(/^(?:f{6}|0{6})$/.test(h))continue;
  colorCounts['#'+h]=(colorCounts['#'+h]||0)+1;
 }
 const theme=$('meta[name="theme-color"]').attr('content');
 const design={
  themeColor:/^#[0-9a-f]{3,6}$/i.test(theme||'')?theme.toLowerCase():null,
  frequentColors:Object.entries(colorCounts).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([c])=>c),
  fonts:[...fonts].slice(0,6),
  navigation:[...new Set(nav)].slice(0,25),
  // Header/nav images first: a logo in the body is often an affiliation badge.
  // Ranked: an image named/labelled "logo" inside the header, then any header
  // image not named like an icon, then other "logo" images (often badges).
  logoCandidates:(()=>{
   const label=i=>(($(i).attr('class')||'')+' '+($(i).attr('alt')||'')+' '+($(i).attr('src')||'')).toLowerCase();
   const inHeader=i=>$(i).closest('header,nav,[class*="navbar"]').length>0;
   const imgs=$('img').get();
   const ranked=[...imgs.filter(i=>inHeader(i)&&/logo|brand/.test(label(i))),
    ...imgs.filter(i=>inHeader(i)&&!/icon|arrow|chevron|menu|close|search|contact|phone|social/.test(label(i))),
    ...imgs.filter(i=>/logo|brand/.test(label(i)))];
   return [...new Set(ranked.map(i=>safeLink($(i).attr('src'),url)).filter(Boolean))].slice(0,3);
  })(),
  // The page's own section order: what the business chose to emphasize.
  sections:$('h2').map((_,h)=>clean($(h).text(),90)).get().filter(t=>t.length>=3).filter((t,i,a)=>a.indexOf(t)===i).slice(0,20)
 };
 const structure={
  title:clean($('title').first().text(),170),
  metaDescription:clean($('meta[name="description"]').attr('content'),300)||null,
  h1:$('h1').map((_,h)=>clean($(h).text(),140)).get().filter(Boolean),
  hasViewportMeta:$('meta[name="viewport"]').length>0,
  lang:$('html').attr('lang')||null,
  imageCount:$('img').length,
  imagesMissingAlt:$('img').filter((_,i)=>$(i).attr('alt')===undefined).length,
  formCount:$('form').length,
  sectionCount:$('section').length,
  navItemCount:[...new Set(nav)].length,
  hasJsonLd:nodes.length>0,
  // Pages whose body text is mostly empty usually render client-side and need
  // the (selective) browser fallback to be read.
  textLength:clean($('body').text(),200_000).length,
  scriptCount:$('script[src]').length
 };
 // Same-site menu links, so the research crawler can follow the pages the
 // business actually offers (portfolio, service pages) instead of a fixed
 // keyword list. The crawler still applies its own host, robots and size checks.
 const navLinks=[...new Set($('header nav a, nav a, header a').map((_,a)=>safeLink($(a).attr('href'),url)).get()
  .filter(h=>h&&new URL(h).hostname===host&&!/\.(?:pdf|jpe?g|png|gif|webp|zip|docx?)$/i.test(new URL(h).pathname)
   &&!/\/(?:blog|news|tag|category|author|feed|wp-|cart|checkout|account|login|privacy|terms)\b/i.test(new URL(h).pathname)
   &&new URL(h).pathname!=='/'))].slice(0,20);
 return {kind:'command-center-site-facts/v1',url,capturedAt,facts,design,structure,navLinks,
  needsBrowserRender:structure.textLength<400&&structure.scriptCount>=3};
}
