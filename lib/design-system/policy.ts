// Fact policy shared by every section. Unknown values stay "to confirm".
// Prices and reviews are never synthesized here.

import type {GalleryImage,MenuItem,Review} from './types.ts';

export const TO_CONFIRM='to confirm';
export const INTERNAL_DISCLAIMER='Internal concept, not endorsed by the business';

const TEXT_MAX=2000;
const PRICE_MAX=80;

export function escapeHtml(value:string):string{
 return value
  .replaceAll('&','&amp;')
  .replaceAll('<','&lt;')
  .replaceAll('>','&gt;')
  .replaceAll('"','&quot;')
  .replaceAll("'",'&#39;');
}

export function suppliedText(value:string|null|undefined,max=TEXT_MAX):string|null{
 if(typeof value!=='string')return null;
 const trimmed=value.trim();
 if(!trimmed||trimmed.length>max)return null;
 return trimmed;
}

/** Missing, blank, or unusably long prices render as "to confirm". */
export function priceLabel(price:string|null|undefined):string{
 return suppliedText(price,PRICE_MAX)??TO_CONFIRM;
}

export function unknownOr(value:string|null|undefined,max=TEXT_MAX):string{
 return suppliedText(value,max)??TO_CONFIRM;
}

export function visibleMenu(items:MenuItem[]|null|undefined):MenuItem[]{
 if(!Array.isArray(items))return [];
 const visible:MenuItem[]=[];
 for(const item of items){
  if(!item||typeof item.name!=='string')continue;
  const name=suppliedText(item.name,180);
  if(!name)continue;
  visible.push({
   name,
   detail:suppliedText(item.detail,400),
   duration:suppliedText(item.duration,40),
   price:item.price
  });
  if(visible.length===24)break;
 }
 return visible;
}

export function visibleReviews(reviews:Review[]|null|undefined):Review[]{
 if(!Array.isArray(reviews))return [];
 const visible:Review[]=[];
 for(const review of reviews){
  if(!review)continue;
  const quote=suppliedText(review.quote,TEXT_MAX);
  const author=suppliedText(review.author,160);
  const source=suppliedText(review.source,180);
  if(!quote||!author||!source)continue;
  visible.push({quote,author,source});
  if(visible.length===12)break;
 }
 return visible;
}

export function safeHref(raw:string|null|undefined):string|null{
 if(typeof raw!=='string')return null;
 const value=raw.trim();
 if(!value||value.length>1600)return null;
 const lower=value.toLowerCase();
 if(lower.startsWith('javascript:')||lower.startsWith('data:')||lower.startsWith('vbscript:')||lower.startsWith('file:'))return null;
 if(value.startsWith('#'))return /^#[A-Za-z][A-Za-z0-9_:.-]{0,80}$/.test(value)?value:null;
 if(value.startsWith('/')&&!value.startsWith('//'))return /^\/[A-Za-z0-9\-._~/%]*$/.test(value)?value:null;
 if(/^tel:/i.test(value))return phoneHref(value.slice(4));
 if(/^mailto:/i.test(value)){
  const email=value.slice(7).trim();
  return emailHref(email);
 }
 try{
  const url=new URL(value);
  if((url.protocol!=='http:'&&url.protocol!=='https:')||url.username||url.password)return null;
  return url.toString();
 }catch{
  return null;
 }
}

export function safeImageSrc(raw:string|null|undefined):string|null{
 if(typeof raw!=='string')return null;
 const value=raw.trim();
 if(!value||value.length>200_000)return null;
 if(/^data:image\/(svg\+xml|png|jpeg|webp)[;,]/i.test(value)){
  let decoded=value;
  try{decoded=decodeURIComponent(value);}catch{return null;}
  if(/<script|javascript:|onerror\s*=|onload\s*=/i.test(decoded))return null;
  return value;
 }
 return safeHref(value);
}

export function phoneHref(raw:string|null|undefined):string|null{
 if(typeof raw!=='string')return null;
 const trimmed=raw.trim();
 if(!trimmed)return null;
 const compact=trimmed.replace(/[^\d+]/g,'');
 const digitsOnly=compact.replace(/\D/g,'');
 if(digitsOnly.length<7||digitsOnly.length>15)return null;
 const normalized=compact.startsWith('+')?`+${digitsOnly}`:digitsOnly;
 return `tel:${normalized}`;
}

export function emailHref(raw:string|null|undefined):string|null{
 if(typeof raw!=='string')return null;
 const email=raw.trim();
 if(!email||email.length>140||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return null;
 return `mailto:${encodeURIComponent(email)}`;
}

export function visibleImages(images:GalleryImage[]|null|undefined):Array<GalleryImage&{src:string;alt:string}>{
 if(!Array.isArray(images))return [];
 const visible:Array<GalleryImage&{src:string;alt:string}>=[];
 for(const image of images){
  if(!image)continue;
  const alt=suppliedText(image.alt,300);
  const src=safeImageSrc(image.src);
  if(!alt||!src)continue;
  visible.push({
   src,alt,
   caption:suppliedText(image.caption,240),
   credit:suppliedText(image.credit,160)
  });
  if(visible.length===12)break;
 }
 return visible;
}

export function externalRel(href:string):string{
 return /^https?:/i.test(href)?' target="_blank" rel="noopener noreferrer"':'';
}
