// Overture Maps Places → Command Center discovery candidates.
//
// Overture is a DISCOVERY source: records can be duplicated, closed, misplaced
// or incomplete. Nothing here marks a business as verified or operating, and
// nothing here writes to the CRM. Output is staged for human review through the
// existing CSV intake, which already checks matches against CRM records.
import {normalizeBusiness} from './csv.ts';
import {classifyIndustry} from './business-classification.ts';
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
 return `SELECT ${sel.join(', ')} FROM read_parquet(${sqlString(source)}, hive_partitioning=1) WHERE ${where.join(' AND ')} ORDER BY id LIMIT ${limit}`;
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
 street:string;city:string;postcode:string;region:string;phone:string;website:string;email:string;socials:string[];
 confidence:number|null;operatingStatus:string;datasets:string[];sourceUpdated:string;brand:string;
 areas:string[];release:string;sourceUrl:string;flags:string[];possibleDuplicateOf:string[];
};

const text=(v:unknown,n=200)=>typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,n):'';
const http=(v:unknown)=>{try{const u=new URL(String(v));return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}};
const digits=(s:string)=>s.replace(/\D/g,'').replace(/^1(?=\d{10}$)/,'');
const hostOf=(u:string)=>{try{return new URL(u).hostname.replace(/^www\./,'').toLowerCase();}catch{return '';}};
const social=/(?:facebook|instagram|yelp|linktr\.ee|tiktok|twitter|x\.com|linkedin|google\.com\/maps)/i;

export function normalizeOvertureRow(row:OvertureRow,release:string,areas:DiscoveryArea[]):OvertureCandidate|null{
 const name=text(row.name,180),lat=Number(row.lat),lon=Number(row.lon);
 if(!name||!row.id||!Number.isFinite(lat)||!Number.isFinite(lon))return null;
 const category=text(row.basic_category||row.taxonomy?.primary||row.categories?.primary,120).replace(/_/g,' ');
 const addr=(row.addresses??[]).find(a=>a&&(a.freeform||a.locality))??{};
 const websites=(row.websites??[]).map(http).filter(Boolean);
 const website=websites.find(w=>!social.test(w))??'';
 const socials=[...(row.socials??[]).map(http),...websites.filter(w=>social.test(w))].filter(Boolean).slice(0,5);
 const phone=text((row.phones??[])[0],40);
 const confidence=row.confidence==null||row.confidence===''?null:Number(row.confidence);
 const inAreas=areas.filter(a=>inBBox(a.bbox,lon,lat));
 const city=text(addr.locality,100),postcode=text(addr.postcode,12);
 const flags:string[]=[];
 if(confidence!==null&&confidence<0.6)flags.push('low_source_confidence');
 if(!category)flags.push('no_category');
 if(!phone&&!website)flags.push('no_contact_or_website');
 if(!text(addr.freeform))flags.push('no_street_address_possible_service_area_business');
 if(row.operating_status&&row.operating_status!=='open')flags.push('operating_status_'+row.operating_status);
 const postal=inAreas.flatMap(a=>a.postcodes??[]);
 if(postcode&&postal.length&&!postal.some(p=>postcode.startsWith(p)))flags.push('postcode_outside_named_area');
 return {externalId:String(row.id).slice(0,80),name,category,
  templateHint:classifyIndustry(name,category).template??'unclassified',lat,lon,
  street:text(addr.freeform,180),city,postcode,region:text(addr.region,40),phone,website,
  email:text((row.emails??[])[0],140),socials,confidence:Number.isFinite(confidence as number)?confidence:null,
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
  // Evidence needs two independent signals; a shared name or shared phone
  // alone also describes franchises, shared offices and call centres.
  const signals=[samePhone,sameSite,sameName,near].filter(Boolean).length;
  if(signals>=2){
   const why=[samePhone&&'phone',sameSite&&'website',sameName&&'name',near&&'within 60 m'].filter(Boolean).join('+');
   a.possibleDuplicateOf.push(`${b.externalId} (${why})`);b.possibleDuplicateOf.push(`${a.externalId} (${why})`);
  }
 }
 return out;
}

// Columns understood by the existing /app/leads/import CSV intake (and by
// lead-identity.ts duplicate checks against the CRM), plus provenance.
export const CSV_HEADERS=['name','city','category','website','phone','source_url','source_type','external_id',
 'street','postcode','region','lat','lon','email','social_profiles','template_hint','search_area','overture_confidence',
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
  c.street,c.postcode,c.region,c.lat.toFixed(6),c.lon.toFixed(6),c.email,c.socials.join(' '),c.templateHint,c.areas.join(' '),
  c.confidence??'',c.operatingStatus,c.datasets.join(' '),c.sourceUpdated,c.release,c.flags.join(' '),c.possibleDuplicateOf.join(' '),
  'Overture Maps Foundation release '+c.release+'; see '+OVERTURE_ATTRIBUTION_URL]);
 return [CSV_HEADERS.join(','),...rows.map(r=>r.map(csvCell).join(','))].join('\n')+'\n';
}
