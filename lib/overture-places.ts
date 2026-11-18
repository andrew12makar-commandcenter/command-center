// Overture Maps Places → Command Center discovery candidates.
//
// Overture is a DISCOVERY source: records can be duplicated, closed, misplaced
// or incomplete. Nothing here marks a business as verified or operating, and
// nothing here writes to the CRM. Output is staged for human review through the
// existing CSV intake, which already checks matches against CRM records.
import {normalizeBusiness} from './csv.ts';
import {classifyIndustry} from './business-classification.ts';
import {classifyWebPresence} from './web-presence.ts';
import {inBBox,type BBox,type DiscoveryArea} from './discovery-regions.ts';

export const OVERTURE_STAC_CATALOG='https://stac.overturemaps.org/catalog.json';
export const OVERTURE_S3_BASE='s3://overturemaps-us-west-2/release';
export const OVERTURE_HTTPS_BASE='https://overturemaps-us-west-2.s3.us-west-2.amazonaws.com/release';
export const OVERTURE_ATTRIBUTION_URL='https://docs.overturemaps.org/attribution/';
const releaseRe=/^\d{4}-\d{2}-\d{2}(?:-beta)?\.\d+$/;

type StacLink={rel?:string;href?:string;title?:string};
// The release is discovered from the official STAC catalog rather than
// hardcoded, so the tool keeps working after Overture's monthly releases.
export function latestReleaseFromCatalog(catalog:unknown):string{
 const c=catalog as {latest?:unknown;links?:StacLink[]}|null;
 if(c&&typeof c.latest==='string'&&releaseRe.test(c.latest))return c.latest;
 const ids=(c?.links??[]).filter(l=>l.rel==='child').map(l=>{
  const fromTitle=l.title&&releaseRe.test(l.title)?l.title:null;
  const fromHref=String(l.href??'').match(/(\d{4}-\d{2}-\d{2}(?:-beta)?\.\d+)/)?.[1]??null;
  return fromTitle??fromHref;
 }).filter((x):x is string=>typeof x==='string'&&!x.includes('beta'));
 if(!ids.length)throw Error('The Overture STAC catalog did not list a release. Pass --release explicitly.');
 return ids.sort((a,b)=>{
  const [da,na]=a.split('.'),[db,nb]=b.split('.');
  return da===db?Number(na)-Number(nb):da.localeCompare(db);
 }).at(-1)!;
}

export function placesPath(release:string,base=OVERTURE_S3_BASE):string{
 if(!releaseRe.test(release))throw Error('Invalid Overture release id: '+release);
 return `${base}/${release}/theme=places/type=place/*`;
}

// Places that are not plausible website clients (public spaces, institutions,
// infrastructure). Found in the first live Allston/Brighton/Brookline run:
// parks, historic districts, museums, hospitals, ATMs and apartment buildings
// were consuming a third of the sample. Matched against basic_category.
export const NON_PROSPECT_CATEGORIES=['park','historic site','museum','college university','place of learning','school',
 'elementary school','high school','hospital','atm','apartment','residential building','shopping mall','public service',
 'government office','post office','library','religious organization','church','place of worship','cemetery','landmark',
 'monument','bus station','train station','transportation','parking','public toilet','playground','sports field',
 'structure and geography','road','bridge','neighborhood','city','embassy','police station','fire station','military',
 'social or community service','non profit organization','college','university'];
const sqlString=(s:string)=>"'"+s.replace(/'/g,"''")+"'";
// Schema varies across releases (e.g. categories → basic_category/taxonomy,
// operating_status added later). Build the SELECT from columns that exist.
export function buildPlacesQuery(source:string,box:BBox,columns:readonly string[],opts:{limit:number;minConfidence:number}):string{
 const has=(c:string)=>columns.includes(c);
 if(!has('id')||!has('names')||!has('bbox'))throw Error('Source does not look like Overture places (missing id/names/bbox).');
 const limit=Math.max(1,Math.min(5000,Math.floor(opts.limit)));
 const min=Math.max(0,Math.min(1,opts.minConfidence));
 const sel=['id','names.primary AS name','bbox.xmin::DOUBLE AS lon','bbox.ymin::DOUBLE AS lat'];
 for(const c of ['categories','basic_category','taxonomy','confidence','websites','socials','emails','phones','addresses','sources','operating_status','brand'])
  if(has(c))sel.push(c==='confidence'?'confidence::DOUBLE AS confidence':c);
 const where=[
  `bbox.xmin BETWEEN ${box.west} AND ${box.east}`,`bbox.ymin BETWEEN ${box.south} AND ${box.north}`,
  'names.primary IS NOT NULL'
 ];
 if(has('confidence'))where.push(`confidence >= ${min}`);
 if(has('operating_status'))where.push(`coalesce(operating_status,'open') <> 'permanently_closed'`);
 if(has('basic_category'))where.push(`coalesce(basic_category,'') NOT IN (${NON_PROSPECT_CATEGORIES.map(c=>sqlString(c.replace(/ /g,'_'))).join(', ')})`);
 // Highest-confidence records first, so a LIMIT keeps the most reliable ones
 // instead of an arbitrary slice ordered by opaque id.
 const order=has('confidence')?'confidence DESC NULLS LAST, id':'id';
 return `SELECT ${sel.join(', ')} FROM read_parquet(${sqlString(source)}, hive_partitioning=1) WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ${limit}`;
}

// Remote extract for the local cache: every column, same filters, no ORDER or
// LIMIT. One scan of the release per envelope; per-area queries then run
// against the local Parquet copy in well under a second.
export function buildCacheQuery(source:string,box:BBox,columns:readonly string[],minConfidence:number):string{
 const q=buildPlacesQuery(source,box,columns,{limit:1,minConfidence});
 const where=q.slice(q.indexOf(' WHERE '),q.lastIndexOf(' ORDER BY '));
 return `SELECT * FROM read_parquet(${sqlString(source)}, hive_partitioning=1)${where}`;
}

export type OvertureRow={
 id:string;name:string|null;lon:number|string;lat:number|string;
 categories?:{primary?:string|null;alternate?:string[]|null}|null;
 basic_category?:string|null;taxonomy?:{primary?:string|null;hierarchy?:string[]|null}|null;
 confidence?:number|string|null;websites?:string[]|null;socials?:string[]|null;emails?:string[]|null;phones?:string[]|null;
 addresses?:{freeform?:string|null;locality?:string|null;postcode?:string|null;region?:string|null;country?:string|null}[]|null;
 sources?:{dataset?:string|null;record_id?:string|null;update_time?:string|null}[]|null;
 operating_status?:string|null;brand?:{names?:{primary?:string|null}|null}|null;
};
export type OvertureCandidate={
 externalId:string;name:string;category:string;templateHint:string;lat:number;lon:number;
 distanceMiles:number;street:string;city:string;postcode:string;region:string;phone:string;website:string;email:string;socials:string[];thirdPartyUrls:string[];unverifiedWebsiteUrls:string[];
 confidence:number|null;operatingStatus:string;datasets:string[];sourceUpdated:string;brand:string;
 areas:string[];release:string;sourceUrl:string;flags:string[];possibleDuplicateOf:string[];
};

const text=(v:unknown,n=200)=>typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,n):'';
const http=(v:unknown)=>{try{const u=new URL(String(v));return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}};
const digits=(s:string)=>s.replace(/\D/g,'').replace(/^1(?=\d{10}$)/,'');
const hostOf=(u:string)=>{try{return new URL(u).hostname.replace(/^www\./,'').toLowerCase();}catch{return '';}};
const BRIGHTON_ORIGIN={lat:42.34833,lon:-71.15417};
const distanceFromBrighton=(lat:number,lon:number)=>{
 const rad=(v:number)=>v*Math.PI/180, dLat=rad(lat-BRIGHTON_ORIGIN.lat),dLon=rad(lon-BRIGHTON_ORIGIN.lon);
 const a=Math.sin(dLat/2)**2+Math.cos(rad(BRIGHTON_ORIGIN.lat))*Math.cos(rad(lat))*Math.sin(dLon/2)**2;
 return Number((3958.7613*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))).toFixed(2));
};
const genericNameWords=new Set(['the','and','of','at','in','inc','llc','corp','corporation','company','co','group','agency','services','service','shop','store','restaurant','cafe','coffee','bakery','bar','market','street','st','road','rd','avenue','ave','boston','brighton','ma']);
function likelyNameMismatch(name:string,url:string):boolean{
 const words=name.toLowerCase().replace(/&/g,' and ').match(/[a-z0-9]+/g)||[];
 const informative=[...new Set(words.filter(w=>w.length>=3&&!genericNameWords.has(w)))];
 if(!informative.length)return false;
 const host=hostOf(url).replace(/^www\./,'');
 const matches=informative.filter(word=>host.includes(word)).length;
 // A single-word brand with no matching domain is a clue, not enough to reject.
 // Multi-word names need at least two shared brand words to avoid importing an
 // unrelated scraper/directory URL as the business's official website.
 return matches===0||(informative.length>=3&&matches<2);
}
export function normalizeOvertureRow(row:OvertureRow,release:string,areas:DiscoveryArea[]):OvertureCandidate|null{
 const name=text(row.name,180),lat=Number(row.lat),lon=Number(row.lon);
 if(!name||!row.id||!Number.isFinite(lat)||!Number.isFinite(lon))return null;
 const category=text(row.basic_category||row.taxonomy?.primary||row.categories?.primary,120).replace(/_/g,' ');
 if(NON_PROSPECT_CATEGORIES.includes(category.toLowerCase()))return null;
 const addr=(row.addresses??[]).find(a=>a&&(a.freeform||a.locality))??{};
 const websites=(row.websites??[]).map(http).filter(Boolean);
 const presence=websites.map(url=>({url,kind:classifyWebPresence(url).kind}));
 const websiteCandidates=presence.filter(x=>x.kind==='website');
 const mismatches=websiteCandidates.filter(x=>likelyNameMismatch(name,x.url)).map(x=>x.url);
 const website=websiteCandidates.find(x=>!mismatches.includes(x.url))?.url??'';
 const socials=[...(row.socials??[]).map(http),...presence.filter(x=>x.kind==='social').map(x=>x.url)].filter(Boolean).slice(0,5);
 const thirdPartyUrls=presence.filter(x=>x.kind==='listing'||x.kind==='ordering').map(x=>x.url).slice(0,8);
 const phone=text((row.phones??[])[0],40);
 const confidence=row.confidence==null||row.confidence===''?null:Number(row.confidence);
 const city=text(addr.locality,100);
 // Some sources drop the leading zero ("2215"); restore 5-digit ZIPs.
 const rawPostcode=text(addr.postcode,12).replace(/^(\d{4})(?=$|-)/,'0$1');
 const postcode=rawPostcode;
 const zip5=postcode.slice(0,5);
 // The bounding box is only a query envelope. When a postcode is recorded and
 // an area defines its postcodes, the postcode decides membership: the first
 // live run put Harvard Square, Watertown and Longwood inside "Allston",
 // "Brighton" and "Brookline" boxes.
 const boxed=areas.filter(a=>inBBox(a.bbox,lon,lat));
 const inAreas=boxed.filter(a=>!a.postcodes?.length||!zip5||a.postcodes.includes(zip5));
 if(!inAreas.length)return null;
 const flags:string[]=[];
 if(confidence!==null&&confidence<0.6)flags.push('low_source_confidence');
 if(!category)flags.push('no_category');
 if(!phone&&!website)flags.push('no_contact_or_website');
 if(!text(addr.freeform))flags.push('no_street_address_possible_service_area_business');
 if(!website)flags.push('no_independent_website_recorded_in_overture');
 if(mismatches.length)flags.push('possible_website_name_mismatch_review');
 if(!website&&thirdPartyUrls.some(url=>classifyWebPresence(url).kind==='ordering'))flags.push('third_party_ordering_page_only');
 if(!website&&thirdPartyUrls.some(url=>classifyWebPresence(url).kind==='listing'))flags.push('third_party_listing_only');
 if(row.operating_status&&row.operating_status!=='open')flags.push('operating_status_'+row.operating_status);
 if(!zip5)flags.push('no_postcode_area_from_coordinates_only');
 if(text(row.brand?.names?.primary))flags.push('national_or_regional_brand');
 const medicalCategory=/\b(?:doctor|physician|dentist|medical|clinic|health)\b/i.test(category);
 const clinicianName=/^dr\.?\s/i.test(name)||/\b(?:MD|DO|DDS|DMD|PhD|NP|PA|LICSW|LMHC|PsyD)\b/i.test(name);
 if(clinicianName&&medicalCategory&&!website)
  flags.push('individual_practitioner_listing');
 return {externalId:String(row.id).slice(0,80),name,category,
  templateHint:classifyIndustry(name,category).template??'unclassified',lat,lon,
  distanceMiles:distanceFromBrighton(lat,lon),street:text(addr.freeform,180),city,postcode,region:text(addr.region,40),phone,website,
  email:text((row.emails??[])[0],140),socials,thirdPartyUrls,unverifiedWebsiteUrls:mismatches,confidence:Number.isFinite(confidence as number)?confidence:null,
  operatingStatus:text(row.operating_status,40),
  datasets:[...new Set((row.sources??[]).map(s=>text(s?.dataset,40)).filter(Boolean))],
  sourceUpdated:(row.sources??[]).map(s=>text(s?.update_time,40)).filter(Boolean).sort().at(-1)??'',
  brand:text(row.brand?.names?.primary,120),
  areas:inAreas.map(a=>a.id),release,
  sourceUrl:`${OVERTURE_HTTPS_BASE}/${release}/theme=places/type=place/`,
  flags,possibleDuplicateOf:[]};
}

const metres=(a:OvertureCandidate,b:OvertureCandidate)=>{
 const r=6_371_000,toRad=(d:number)=>d*Math.PI/180;
 const dLat=toRad(b.lat-a.lat),dLon=toRad(b.lon-a.lon);
 const h=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;
 return 2*r*Math.asin(Math.sqrt(h));
};

// Within one discovery run: drop exact repeats of the same Overture id (from
// overlapping area boxes) and FLAG likely duplicates. Never merge on name alone,
// and never merge automatically: the reviewer decides.
export function dedupeCandidates(list:OvertureCandidate[]):OvertureCandidate[]{
 const byId=new Map<string,OvertureCandidate>();
 for(const c of list){
  const prev=byId.get(c.externalId);
  if(prev)prev.areas=[...new Set([...prev.areas,...c.areas])];else byId.set(c.externalId,{...c,possibleDuplicateOf:[]});
 }
 const out=[...byId.values()];
 for(let i=0;i<out.length;i++)for(let j=i+1;j<out.length;j++){
  const a=out[i],b=out[j];
  const samePhone=digits(a.phone).length===10&&digits(a.phone)===digits(b.phone);
  const sameSite=Boolean(hostOf(a.website))&&hostOf(a.website)===hostOf(b.website);
  const sameName=normalizeBusiness(a.name)===normalizeBusiness(b.name)&&normalizeBusiness(a.name).length>=3;
  const near=metres(a,b)<=60;
  // A possible duplicate is the SAME place: it must be nearby or share a
  // phone, plus one more signal. Same name + website far apart is a branch of
  // a multi-location business (Citizens Bank, Western Union), not a duplicate.
  const duplicate=(near&&(samePhone||sameSite||sameName))||(samePhone&&sameName);
  if(duplicate){
   const why=[samePhone&&'phone',sameSite&&'website',sameName&&'name',near&&'within 60 m'].filter(Boolean).join('+');
   a.possibleDuplicateOf.push(`${b.externalId} (${why})`);b.possibleDuplicateOf.push(`${a.externalId} (${why})`);
  }else if(sameName&&sameSite){
   for(const x of [a,b])if(!x.flags.includes('multi_location_business'))x.flags.push('multi_location_business');
  }
 }
 // Many listings at one street address are usually departments or clinicians
 // inside a hospital or large institution, which do not buy their own website.
 const byAddress=new Map<string,OvertureCandidate[]>();
 for(const c of out){const k=normalizeBusiness(c.street).slice(0,40);if(k.length>=6)byAddress.set(k,[...(byAddress.get(k)??[]),c]);}
 for(const group of byAddress.values())if(group.length>=4)for(const c of group){
  c.flags.push('institutional_address_'+group.length+'_listings');
  // Duplicate flags inside an institution are noise; the address flag says it.
  c.possibleDuplicateOf=[];
 }
 return out;
}

// Brighton Center distance is the primary review order requested by the user.
// Within equal-distance records, prioritize stronger research clues while
// keeping this explicitly separate from a sales score. A blank source field is
// not proof that no site exists.
const deprioritize=/^(?:national_or_regional_brand|multi_location_business|institutional_address|no_category)/;
export function reviewOrder(list:OvertureCandidate[]):OvertureCandidate[]{
 const score=(c:OvertureCandidate)=>(c.flags.filter(f=>deprioritize.test(f)).length*10)+
  (c.website?2:c.thirdPartyUrls.length?1:0)+(!c.street?2:0)+(c.templateHint==='unclassified'?1:0);
 return [...list].sort((a,b)=>a.distanceMiles-b.distanceMiles||score(a)-score(b)||
  (b.confidence??0)-(a.confidence??0)||a.name.localeCompare(b.name));
}

// Columns understood by the existing /app/leads/import CSV intake (and by
// lead-identity.ts duplicate checks against the CRM), plus provenance.
export const CSV_HEADERS=['name','city','category','website','phone','source_url','source_type','external_id',
 'street','postcode','region','lat','lon','distance_miles','email','social_profiles','third_party_urls','possible_website_urls','template_hint','search_area','overture_confidence',
 'overture_operating_status','overture_datasets','overture_source_updated','overture_release','review_flags',
 'possible_duplicate_of','attribution'] as const;

const csvCell=(v:unknown)=>{
 let s=String(v??'');
 // Neutralize spreadsheet formula injection from third-party text.
 if(/^[=+\-@\t\r]/.test(s))s="'"+s;
 return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
};
export function candidatesToCsv(list:OvertureCandidate[]):string{
 const rows=list.map(c=>[c.name,c.city,c.category,c.website,c.phone,c.sourceUrl,'overture_maps_places',c.externalId,
  c.street,c.postcode,c.region,c.lat.toFixed(6),c.lon.toFixed(6),c.distanceMiles,c.email,c.socials.join(' '),c.thirdPartyUrls.join(' '),c.unverifiedWebsiteUrls.join(' '),c.templateHint,c.areas.join(' '),
  c.confidence??'',c.operatingStatus,c.datasets.join(' '),c.sourceUpdated,c.release,c.flags.join(' '),c.possibleDuplicateOf.join(' '),
  'Overture Maps Foundation release '+c.release+'; see '+OVERTURE_ATTRIBUTION_URL]);
 return [CSV_HEADERS.join(','),...rows.map(r=>r.map(csvCell).join(','))].join('\n')+'\n';
}
