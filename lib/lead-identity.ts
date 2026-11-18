// Pure identity checks for manually reviewed public business leads.
// A shared name, website domain or neighborhood is NOT proof two companies are one.
import {normalizeBusiness} from './csv.ts';
import {hasEntityRegistryContext} from './registry-import.ts';

export type BusinessIdentity={
 id:string;name:string;city:string|null;street_address:string|null;
 postal_code:string|null;phone:string|null;website_url:string|null;contact_email?:string|null;
};
export type StagedIdentity={
 name:string|null;city:string|null;website_url:string|null;phone:string|null;contact_email?:string|null;
 raw_data?:Record<string,unknown>|null
};
export type PotentialMatch={id:string;name:string;city:string|null;reason:string;strength:'strong'|'possible'};

function clean(value:unknown):string{return typeof value==='string'?value.trim():'';}
function digits(value:string):string{return value.replace(/\D/g,'');}
function comparablePhone(value:string|null|undefined):string{
 const valueDigits=digits(clean(value));
 const national=valueDigits.length===11&&valueDigits.startsWith('1')?valueDigits.slice(1):valueDigits;
 return national.length===10?national:'';
}
/** A warning-only check. A number difference is not proof that either source is wrong. */
export function phonesConflict(source:string|null|undefined,reviewed:string|null|undefined):boolean{
 const sourcePhone=comparablePhone(source),reviewedPhone=comparablePhone(reviewed);
 return Boolean(sourcePhone&&reviewedPhone&&sourcePhone!==reviewedPhone);
}
const FREE_EMAIL=new Set(['gmail.com','googlemail.com','yahoo.com','hotmail.com','outlook.com','aol.com','icloud.com','proton.me','protonmail.com','live.com']);
function domain(value:string|null|undefined):string{
 try{return new URL(value||'').hostname.toLowerCase().replace(/^www\./,'');}catch{return '';}
}
function emailDomain(value:string|null|undefined):string{
 const d=(value||'').trim().toLowerCase().split('@').at(-1)||'';
 return d.includes('.')&&!FREE_EMAIL.has(d)?d:'';
}
export function streetFromRaw(raw:Record<string,unknown>|null|undefined):string{
 if(hasEntityRegistryContext(raw))return '';
 const street=clean(raw?.street||raw?.streetaddress||raw?.street_address||raw?.address);
 const number=clean(raw?.housenumber||raw?.streetnumber);
 if(!street)return '';
 // CSV street lines may already include their house number; do not create
 // "101 101 Beacon St" and silently break strong-address deduplication.
 const prefixed=street.toLowerCase()===number.toLowerCase()||
  street.toLowerCase().startsWith(number.toLowerCase()+' ')||
  street.toLowerCase().startsWith(number.toLowerCase()+',');
 return (number&&!prefixed?number+' '+street:street).slice(0,180);
}
export function postcodeFromRaw(raw:Record<string,unknown>|null|undefined):string{
 if(hasEntityRegistryContext(raw))return '';
 return clean(raw?.postcode||raw?.postalcode||raw?.postal_code||raw?.zipcode||raw?.zip).slice(0,20);
}
export function researchServiceArea(raw:Record<string,unknown>|null|undefined):string{
 // A discovery scan area is a search constraint, not evidence that a
 // contractor or practice serves that location. Only an explicit service-area
 // field from the source record can populate the CRM service_area column.
 const source=raw??{};
 const recorded=clean(source.service_area||source.servicearea||source.serviceareas||source.serviceArea);
 // The source can genuinely declare the same area we searched. Presence
 // in its own service-area field is independent evidence; the scan field alone
 // still cannot be used.
 return recorded.slice(0,180);
}

// A name in a city is too weak to collapse franchises or multiple locations.
// Only use a full street-level identity for automatic discovery deduplication.
export function strongLocationKey(name:string,street:string,city:string,postcode:string):string|null{
 const n=normalizeBusiness(name),s=normalizeBusiness(street),
  place=digits(postcode)||normalizeBusiness(city);
 return n.length>=3&&s.length>=3&&place.length>=3?n+'|'+s+'|'+place:null;
}
export function potentialMatches(
 candidate:StagedIdentity,businesses:BusinessIdentity[],limit=3
):PotentialMatch[]{
 const name=normalizeBusiness(candidate.name||'');
 if(name.length<3)return [];
 const city=normalizeBusiness(candidate.city||'');
 const rawStreet=normalizeBusiness(streetFromRaw(candidate.raw_data));
 const zip=digits(postcodeFromRaw(candidate.raw_data));
 const phone=digits(candidate.phone||'');
 const candidateHost=domain(candidate.website_url),candidateEmail=emailDomain(candidate.contact_email);
 const matches:PotentialMatch[]=[];
 for(const b of businesses){
  const nameMatch=normalizeBusiness(b.name)===name;
  const cityMatch=Boolean(city)&&city===normalizeBusiness(b.city||'');
  const addressMatch=Boolean(rawStreet)&&rawStreet===normalizeBusiness(b.street_address||'');
  const zipMatch=Boolean(zip)&&zip===digits(b.postal_code||'');
  const phoneMatch=phone.length>=10&&phone===digits(b.phone||'');
  const sharedWeb=Boolean(candidateHost)&&candidateHost===domain(b.website_url);
  const sharedEmail=Boolean(candidateEmail)&&candidateEmail===emailDomain(b.contact_email);
  // Shared address plus business-specific domain can reveal legal-name/DBA
  // aliases. This is a review warning only, never an automatic merge.
  if(!nameMatch&&!(addressMatch&&(zipMatch||cityMatch)&&(sharedWeb||sharedEmail)))continue;
  const strong=nameMatch&&addressMatch&&(zipMatch||cityMatch);
  const reason=!nameMatch?'Matching street-level location and business website/email domain; possible legal-name or DBA relationship':
   strong?'Matching business name and street-level location':
   phoneMatch?'Matching name and phone number (branches can share phones)':
   cityMatch?'Matching name and city (branches may differ)':
   'Matching name only; location not confirmed';
  matches.push({id:b.id,name:b.name,city:b.city,reason,strength:strong?'strong':'possible'});
 }
 return matches.sort((a,b)=>(b.strength==='strong'?1:0)-(a.strength==='strong'?1:0)).slice(0,Math.max(1,Math.min(10,limit)));
}

// PostgREST typically returns at most 1,000 rows per call. Never interpret
// the first page as the entire organization's CRM or staging queue.
export async function collectAllPages<T>(
 read:(start:number,end:number)=>Promise<{data:T[]|null;error:{message:string}|null}>,
 size=500,max=20000
):Promise<T[]>{
 if(!Number.isInteger(size)||size<1||size>1000||!Number.isInteger(max)||max<size)throw Error('Invalid pagination bounds');
 const all:T[]=[];
 for(let offset=0;offset<max;offset+=size){
  const {data,error}=await read(offset,offset+size-1);
  if(error)throw Error('Could not check all business records: '+error.message);
  if(!data)throw Error('Missing page while reading organization records.');
  all.push(...data);
  if(data.length<size)return all;
 }
 throw Error('More than '+max+' business records: refusing an incomplete duplicate check. Expand the query safely.');
}
