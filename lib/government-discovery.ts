import proj4 from 'proj4';
import {parseCsv,normalizedHeader} from './csv.ts';

// Public, file-backed Boston sources. They are scoped datasets, not an
// exhaustive registry of all operating businesses in Greater Boston.
export const BOSTON_PUBLIC_SOURCES=[
 {id:'active-food-establishment-licenses',title:'Active Food Establishment Licenses',scope:'Food establishments with current City food permits',category:'food',recordId:'propertyid'},
 {id:'licensing-board-licenses',title:'Licensing Board Licenses',scope:'Currently active license types issued by the Licensing Board',category:'license',recordId:'licensenum'},
 {id:'certified-business-directory',title:'Certified Business Directory',scope:'Businesses certified for City procurement programs only',category:'certified',recordId:'companyname'},
] as const;

export const BRIGHTON_CENTER_ORIGIN={label:'Brighton Center (approximate)',lat:42.34833,lon:-71.15417} as const;

// Boston's Licensing Board CSV uses NAD83 / Massachusetts Mainland (US survey
// feet), EPSG:2249. proj4 is the maintained open-source transform; do not treat
// GPSX/GPSY as latitude/longitude.
const EPSG_2249='+proj=lcc +lat_0=41 +lon_0=-71.5 +lat_1=42.6833333333333 +lat_2=41.7166666666667 +x_0=200000.0001016 +y_0=750000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs';
export function bostonProjectedToWgs84(x:unknown,y:unknown):{lat:number;lon:number}|null{
 const e=Number(x),n=Number(y);
 if(!Number.isFinite(e)||!Number.isFinite(n)||e<600_000||e>900_000||n<2_800_000||n>3_100_000)return null;
 const [lon,lat]=proj4(EPSG_2249,'EPSG:4326',[e,n]);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<42||lat>42.6||lon< -71.5||lon> -70.7)return null;
 return {lat,lon};
}
export function distanceMiles(a:{lat:number;lon:number},b:{lat:number;lon:number}):number{
 const rad=(n:number)=>n*Math.PI/180, dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon);
 const q=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;
 return 3958.7613*2*Math.atan2(Math.sqrt(q),Math.sqrt(Math.max(0,1-q)));
}
export type GovernmentCandidate={
 source_id:string;source_title:string;source_url:string;download_url:string;downloaded_at:string;
 candidate_id:string;source_row_index:number;record_id:string;name:string;legal_name:string|null;category:string;address:string;city:string;zip:string;
 website:string|null;license_status:string|null;license_type:string|null;issued_on:string|null;expires_on:string|null;
 coordinates:{lat:number;lon:number}|null;distance_miles:number|null;location_status:'matched_coordinate'|'needs_location_match';
 possible_duplicate_ids:string[];
};
const clean=(x:unknown,n=200)=>String(x??'').replace(/\s+/g,' ').trim().slice(0,n);
const norm=(x:unknown)=>clean(x,300).toLocaleLowerCase('en-US').replace(/[^a-z0-9]/g,'');
function headers(rows:string[][]){return rows[0]?.map(normalizedHeader)??[];}
function value(row:string[],h:string[],...keys:string[]){for(const k of keys){const i=h.indexOf(k);if(i>=0&&row[i]?.trim())return row[i].trim();}return '';}
function safeWebsite(input:string):string|null{
 try{const u=new URL(input);return u.protocol==='https:'||u.protocol==='http:'?u.toString().slice(0,1024):null;}catch{return null;}
}
function mapRow(source:typeof BOSTON_PUBLIC_SOURCES[number],row:string[],h:string[],downloadUrl:string,downloadedAt:string,sourceRowIndex:number):GovernmentCandidate|null{
 const isFood=source.category==='food',isBoard=source.category==='license';
 const originalName=value(row,h,isFood||isBoard?'businessname':'companyname','name');
 const dba=value(row,h,'dbaname','dba');
 const name=dba||originalName;
 const address=clean(value(row,h,'address','businessaddress'),200),zip=clean(value(row,h,'zip','zipcode','postalcode','zip5','zipcod'),12);
 if(!name||!address||!zip.startsWith('02135'))return null;
 let coordinates:{lat:number;lon:number}|null=null;
 if(isFood){
  const lat=Number(value(row,h,'latitude')),lon=Number(value(row,h,'longitude'));
  if(Number.isFinite(lat)&&Number.isFinite(lon)&&lat>42&&lat<42.6&&lon< -70.7&&lon> -71.5)coordinates={lat,lon};
 }else if(isBoard)coordinates=bostonProjectedToWgs84(value(row,h,'gpsx'),value(row,h,'gpsy'));
 const recordId=clean(value(row,h,...(isFood?['propertyid','businessname']:isBoard?['licensenum','historicallicensenum']:['companyname'])),180)||norm(name)+'-'+zip;
 const sourceUrl='https://data.boston.gov/dataset/'+source.id;
 return {
  source_id:source.id,source_title:source.title,source_url:sourceUrl,download_url:downloadUrl,downloaded_at:downloadedAt,
  candidate_id:source.id+':'+recordId+':'+sourceRowIndex,source_row_index:sourceRowIndex,
  record_id:recordId,name:clean(name,180),legal_name:originalName&&dba?clean(originalName,180):null,
  category:clean(value(row,h,isFood?'licensecat':isBoard?'licensetype':'servicesprovided')||source.scope,160),
  address,city:clean(value(row,h,'city'),100)||'Boston',zip,
  website:safeWebsite(value(row,h,'website','websiteurl','webaddress')),
  license_status:clean(value(row,h,isFood?'licstatus':'status'),80)||null,
  license_type:clean(value(row,h,isFood?'licensecat':'licensecategory','licensetype'),120)||null,
  issued_on:clean(value(row,h,isFood?'licenseadddttm':'issued'),40)||null,
  expires_on:clean(value(row,h,'expires'),40)||null,
  coordinates,distance_miles:coordinates?Number(distanceMiles(BRIGHTON_CENTER_ORIGIN,coordinates).toFixed(2)):null,
  location_status:coordinates?'matched_coordinate':'needs_location_match',possible_duplicate_ids:[]
 };
}
export function mapBostonGovernmentCsv(sourceId:string,csv:string,downloadUrl:string,downloadedAt=new Date().toISOString()):GovernmentCandidate[]{
 const source=BOSTON_PUBLIC_SOURCES.find(x=>x.id===sourceId);
 if(!source)throw new Error('Unsupported Boston public dataset.');
 const rows=parseCsv(csv);if(rows.length<2)throw new Error('The public CSV has no business records.');
 const h=headers(rows);
 const candidates=rows.slice(1).map((r,index)=>mapRow(source,r,h,downloadUrl,downloadedAt,index+1)).filter((x):x is GovernmentCandidate=>Boolean(x));
 // Preserve source records and flag only exact normalized name + address
 // collisions. Similar names or a shared address never auto-merge.
 const groups=new Map<string,GovernmentCandidate[]>();
 for(const x of candidates){const key=norm(x.name)+'|'+norm(x.address)+'|'+x.zip;if(!key.startsWith('|'))groups.set(key,[...(groups.get(key)??[]),x]);}
 for(const group of groups.values())if(group.length>1)for(const x of group)x.possible_duplicate_ids=group.filter(y=>y!==x).map(y=>y.candidate_id);
 return candidates.sort((a,b)=>{
  if(a.distance_miles===null&&b.distance_miles!==null)return 1;
  if(a.distance_miles!==null&&b.distance_miles===null)return -1;
  return (a.distance_miles??Infinity)-(b.distance_miles??Infinity)||a.name.localeCompare(b.name);
 });
}

export async function downloadBostonGovernmentSources(fetcher:typeof fetch=fetch,now=new Date()):Promise<{
 kind:'command-center-government-download/v1';created_at:string;origin:typeof BRIGHTON_CENTER_ORIGIN;
 coverage:string;counts:{source_rows:number;exact_duplicate_rows:number;mapped:number;needs_location_match:number};
 sources:{id:string;title:string;url:string;download_url:string;downloaded_at:string;source_rows:number;brighton_rows:number}[];
 candidates:GovernmentCandidate[];
}>{
 const downloadedAt=now.toISOString(),sourcesOut:Awaited<ReturnType<typeof downloadBostonGovernmentSources>>['sources']=[],all:GovernmentCandidate[]=[];
 for(const source of BOSTON_PUBLIC_SOURCES){
  const metaUrl='https://data.boston.gov/api/3/action/package_show?id='+encodeURIComponent(source.id);
  const meta=await fetcher(metaUrl,{signal:AbortSignal.timeout(20_000)});
  if(!meta.ok)throw new Error('Boston data catalog unavailable for '+source.id+' (HTTP '+meta.status+').');
  const body=await meta.json() as {success?:boolean;result?:{resources?:{format?:string;url?:string}[]}};
  if(!body.success)throw new Error('Boston data catalog returned invalid metadata for '+source.id+'.');
  const resource=body.result?.resources?.find(x=>x.format?.toLowerCase()==='csv'&&Boolean(x.url));
  if(!resource?.url)throw new Error('No downloadable CSV is listed for '+source.id+'.');
  const download=new URL(resource.url);
  if(download.protocol!=='https:'||download.hostname!=='data.boston.gov'||download.username||download.password)
   throw new Error('The listed CSV is outside the approved Boston public-data hosts.');
  // Boston issues short-lived signed redirects to its own named S3 bucket.
  // Follow the catalog URL, then reject any final destination outside that bucket.
  const csvRes=await fetcher(download.toString(),{signal:AbortSignal.timeout(30_000)});
  const finalUrl=new URL(csvRes.url||download.toString());
  const approvedFinal=finalUrl.hostname==='data.boston.gov'||
   (finalUrl.hostname==='s3.amazonaws.com'&&finalUrl.pathname.startsWith('/og-production-open-data-bostonma-892364687672/'));
  if(finalUrl.protocol!=='https:'||!approvedFinal)throw new Error('The CSV redirected outside the official Boston dataset storage.');
  if(!csvRes.ok)throw new Error('CSV download failed for '+source.id+' (HTTP '+csvRes.status+').');
  const csv=await csvRes.text();if(csv.length>12_000_000)throw new Error('CSV exceeds the local-download size limit for '+source.id+'.');
  const parsed=parseCsv(csv),mapped=mapBostonGovernmentCsv(source.id,csv,download.toString(),downloadedAt);
  sourcesOut.push({id:source.id,title:source.title,url:'https://data.boston.gov/dataset/'+source.id,download_url:download.toString(),downloaded_at:downloadedAt,source_rows:Math.max(0,parsed.length-1),brighton_rows:mapped.length});
  all.push(...mapped);
 }
 const uniqueRows=new Set(all.filter(x=>x.possible_duplicate_ids.length).map(x=>x.candidate_id));
 return {kind:'command-center-government-download/v1',created_at:downloadedAt,origin:BRIGHTON_CENTER_ORIGIN,
  coverage:'Boston official public datasets filtered to ZIP 02135. The files cover active food permits, active Licensing Board permits and a certified-vendor subset; they do not list every operating business. No contact, applicant or manager fields were retained.',
  counts:{source_rows:sourcesOut.reduce((n,x)=>n+x.source_rows,0),exact_duplicate_rows:uniqueRows.size,
   mapped:all.filter(x=>x.coordinates).length,needs_location_match:all.filter(x=>!x.coordinates).length},
  sources:sourcesOut,candidates:all.sort((a,b)=>{
   if(a.distance_miles===null&&b.distance_miles!==null)return 1;
   if(a.distance_miles!==null&&b.distance_miles===null)return -1;
   return (a.distance_miles??Infinity)-(b.distance_miles??Infinity)||a.name.localeCompare(b.name);
  })};
}
