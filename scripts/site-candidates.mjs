// Small, dependency-free HTML candidate extractor for human review.
// It is not a scraper for publishing, nor a verifier of facts/asset rights.
const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',copy:'©',rsquo:'’',ldquo:'“',rdquo:'”'};
export function decodeEntities(s){
 return s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi,(_,ref)=>{
  if(ref[0]==='#'){
   const n=ref[1]?.toLowerCase()==='x'?parseInt(ref.slice(2),16):parseInt(ref.slice(1),10);
   return Number.isInteger(n)&&n>0&&n<0x110000?String.fromCodePoint(n):' ';
  }
  return entities[ref.toLowerCase()]??' ';
 });
}
export function tidyText(s,max=250){
 return decodeEntities(String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()).slice(0,max);
}
export function attr(tag,name){
 // Only controlled attribute names are used. Never execute embedded HTML.
 const safeName=name.replace(/[^a-z0-9_-]/gi,'');
 const match=tag.match(new RegExp('(?:^|\\s)'+safeName+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))','i'));
 return decodeEntities(match?.[1]??match?.[2]??match?.[3]??'').trim();
}
function safeUrl(url,base){
 if(!url||url.length>1500)return null;
 try{
  const u=new URL(url,base);
  if(!['http:','https:'].includes(u.protocol)||u.username||u.password||
     u.port||!u.hostname.includes('.')||
     /(^|\.)(localhost|local|internal|test|invalid)$/.test(u.hostname)||
     /^(?:\d{1,3}\.){3}\d{1,3}$/.test(u.hostname)||u.hostname.includes(':'))return null;
  u.hash='';return u.href;
 }catch{return null;}
}
export function extractCandidates(html,url){
 if(typeof html!=='string'||html.length>2_000_000)throw Error('Invalid or oversized HTML');
 const title=tidyText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'',170);
 const metas=[...html.matchAll(/<meta\b[^>]*>/gi)];
 const metaDescription=metas.find(m=>/^(?:description|og:description)$/.test((attr(m[0],'name')||attr(m[0],'property')).toLowerCase()));
 const description=metaDescription?tidyText(attr(metaDescription[0],'content'),280):'';
 const headings=[...html.matchAll(/<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
  .map(m=>({level:Number(m[1]),text:tidyText(m[2],130)}))
  .filter(x=>x.text.length>=4).slice(0,28);
 const excerpts=[...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
  .map(m=>tidyText(m[1],220)).filter(x=>x.length>55&&x.length<220)
  .filter((x,i,a)=>a.indexOf(x)===i).slice(0,8);
 const images=[];
 const seen=new Set();
 for(const m of html.matchAll(/<img\b[^>]*>/gi)){
  const tag=m[0];
  const srcset=attr(tag,'srcset').split(',')[0]?.trim().split(/\\s+/)[0]||'';
  // WordPress and lazy-gallery templates may put a data URI in src; prefer
  // the first independently valid public image reference instead.
  const imageUrl=[
   attr(tag,'src'),attr(tag,'data-src'),attr(tag,'data-lazy-src'),
   attr(tag,'data-orig-file'),srcset
  ].map(src=>safeUrl(src,url)).find(Boolean);
  if(!imageUrl||seen.has(imageUrl))continue;
  const alt=tidyText(attr(tag,'alt'),160)||'Image from business website';
  seen.add(imageUrl);
  images.push({url:imageUrl,alt,sourceUrl:url,role:'gallery',permission:'reference_only'});
  if(images.length>=35)break;
 }
 const openGraphImage=metas.find(m=>attr(m[0],'property').toLowerCase()==='og:image');
 if(openGraphImage&&images.length<35){
  const urlCandidate=safeUrl(attr(openGraphImage[0],'content'),url);
  if(urlCandidate&&!seen.has(urlCandidate)){
   images.push({url:urlCandidate,alt:'Open Graph image reference',sourceUrl:url,role:'gallery',permission:'reference_only'});
   seen.add(urlCandidate);
  }
 }
 const links=[];const added=new Set();
 for(const m of html.matchAll(/<a\b[^>]*>/gi)){
  const target=safeUrl(attr(m[0],'href'),url);
  if(!target||added.has(target))continue;
  const parsed=new URL(target),root=new URL(url);
  if(parsed.hostname!==root.hostname||!['http:','https:'].includes(parsed.protocol))continue;
  if(!/\b(about|services?|team|staff|office|gallery|photos?|contact|doctors?|practice)\b/i.test(parsed.pathname))continue;
  if(/\.(?:jpg|jpeg|png|webp|pdf|zip)$/i.test(parsed.pathname))continue;
  added.add(target);links.push(target);
  if(links.length>=15)break;
 }
 return {url,title,description,headings,excerpts,images,links};
}
// Minimal, conservative robots.txt parsing for wildcard rules.
export function robotsAllows(body,path){
 if(!body)return true;
 let active=false;
 const disallowed=[];
 for(const original of body.split(/\r?\n/)){
  const line=original.split('#')[0].trim();
  if(!line)continue;
  const [key,...parts]=line.split(':');const value=parts.join(':').trim();
  const k=key?.trim().toLowerCase();
  if(k==='user-agent')active=value==='*';
  else if(k==='disallow'&&active&&value)disallowed.push(value);
 }
 return !disallowed.some(prefix=>prefix==='/'||path.startsWith(prefix));
}
