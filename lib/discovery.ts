import {parseCsv,normalizeBusiness,normalizedHeader} from './csv.ts';
import {classifyWebPresence} from './web-presence.ts';

// Public-source discovery only. No scan confirms a company is currently operating.
export const areas = {
 allston:{label:'Allston',lat:42.3539,lon:-71.1327,radius:1600},
 brighton:{label:'Brighton',lat:42.3501,lon:-71.1551,radius:1600},
 brookline:{label:'Brookline',lat:42.3318,lon:-71.1212,radius:1850},
} as const;
export type Area=keyof typeof areas;
export type Source='osm'|'boston-certified'|'boston-food';
export type Candidate={name:string;city:string;category:string;website_url:string;phone:string;source_url:string;source_type:string;external_id:string;raw_data:Record<string,string>};
const safe=(v:unknown,n=200)=>String(v??'').trim().slice(0,n);
const http=(v:unknown)=>{
 try{const s=new URL(String(v));return ['http:','https:'].includes(s.protocol)?s.toString():'';}catch{return '';}
};
export function uniqueCandidates(list:Candidate[]):Candidate[]{
 const seen=new Set<string>();
 return list.filter(x=>{
  if(!x.name.trim()||!x.source_url||!x.external_id)return false;
  const id=x.source_type+'|'+x.external_id;
  if(seen.has(id))return false;
  seen.add(id);return true;
 });
}
type OsmElement={type:'node'|'way'|'relation';id:number;lat?:number;lon?:number;center?:{lat:number;lon:number};tags?:Record<string,string>};
export function parseOsm(elements:OsmElement[],area:Area):Candidate[]{
 return uniqueCandidates(elements.flatMap(e=>{
  const t=e.tags||{},name=safe(t.name,180);
  if(!name||!Number.isSafeInteger(e.id)||e.id<=0||t.shop==='vacant'||t.disused==='yes'||t.abandoned==='yes')return [];
  const category=t.craft?'craft: '+t.craft:t.office?'office: '+t.office:t.shop?'shop: '+t.shop:t.amenity?'amenity: '+t.amenity:'';
  if(!category)return [];
  const external_id=e.type+'/'+e.id,position=e.center||((e.lat&&e.lon)?{lat:e.lat,lon:e.lon}:undefined);
  const rawWebsite=safe(t.website||t['contact:website'],1024);
  const profileCandidate=rawWebsite||safe(t['contact:instagram']||t['contact:facebook'],1024);
  const web=classifyWebPresence(http(rawWebsite));
  const profile=classifyWebPresence(http(profileCandidate));
  return [{
   name,city:safe(t['addr:city'],100),category:safe(category,140),
   website_url:web.kind==='website'?web.url||'':'',phone:safe(t.phone||t['contact:phone'],100),
   source_url:'https://www.openstreetmap.org/'+external_id,source_type:'openstreetmap',
   external_id,raw_data:{
    external_id,provider:'OpenStreetMap contributors',search_area:areas[area].label,
    street:safe(t['addr:street']),housenumber:safe(t['addr:housenumber']),
    postcode:safe(t['addr:postcode']),lat:String(position?.lat??''),lon:String(position?.lon??''),
    original_category:category,website:rawWebsite,
    ...(profile.kind==='social'||profile.kind==='listing'?{discovered_social_profile_url:profile.url||''}:{})
   }
  }];
 }));
}
const slugs={'boston-certified':'certified-business-directory','boston-food':'active-food-establishment-licenses'} as const;
const mapping={
 name:['businessname','companyname','company','business','dba','dbaname','legalname','name','establishmentname'],
 city:['city','town','municipality','businesscity'],
 zip:['zip','zipcode','postalcode','businesszip','zip5','zipcod'],
 category:['category','industry','businesstype','primarybusinessactivity','services','description'],
 website:['website','websiteurl','webaddress','url','businesswebsite'],
 phone:['phone','phonenumber','telephone','businessphone'],
 identifier:['licenseno','licensenumber','licenseid','certificationnumber','certificatenumber','vendorid','id'],
 neighborhood:['neighborhood','district']
};
function pick(r:Record<string,string>,keys:string[]){return keys.map(k=>r[k]).find(Boolean)||'';}
export function mapBostonCsv(csv:string,download:string,source:'boston-certified'|'boston-food',area:Area):Candidate[]{
 if(area==='brookline')throw Error('Boston datasets do not cover Brookline.');
 const rows=parseCsv(csv);
 if(rows.length<2)throw Error('No source rows were returned.');
 const headers=rows[0].map(normalizedHeader);
 const records=rows.slice(1).flatMap((row,i)=>{
  const raw:Record<string,string>={};headers.forEach((h,j)=>{if(h)raw[h]=safe(row[j],500);});
  const name=pick(raw,mapping.name),city=pick(raw,mapping.city),zip=pick(raw,mapping.zip),neighbor=pick(raw,mapping.neighborhood);
  if(!name || (area==='allston'&&!zip.startsWith('02134')&&!/allston/i.test(neighbor))
            || (area==='brighton'&&!zip.startsWith('02135')&&!/brighton/i.test(neighbor)))return [];
  const external_id=source+'/'+(pick(raw,mapping.identifier)||normalizeBusiness(name)+':'+normalizeBusiness(zip||city));
  const recordedWebsite=http(pick(raw,mapping.website));
  const web=classifyWebPresence(recordedWebsite);
  return [{name:safe(name,180),city:safe(city,100),category:safe(pick(raw,mapping.category)|| (source==='boston-food'?'Food establishment':'Certified business'),150),
   website_url:web.kind==='website'?web.url||'':'',phone:safe(pick(raw,mapping.phone),100),
   source_type:source,source_url:'https://data.boston.gov/dataset/'+slugs[source],external_id,
   raw_data:{...Object.fromEntries(Object.entries(raw).slice(0,22)),provider:'City of Boston Open Data',download_url:download,
    external_id,source_row:String(i+2),postcode:zip,neighborhood:neighbor,
    ...(web.kind==='social'||web.kind==='listing'?{discovered_social_profile_url:web.url||''}:{})}
  }];
 });
 return uniqueCandidates(records);
}
async function getBoston(source:'boston-certified'|'boston-food',area:Area):Promise<Candidate[]>{
 if(area==='brookline')throw Error('Boston city datasets do not cover Brookline.');
 const slug=slugs[source],signal=AbortSignal.timeout(27000);
 const metadata=await fetch('https://data.boston.gov/api/3/action/package_show?id='+slug,{signal,cache:'no-store'});
 if(!metadata.ok)throw Error('City of Boston metadata API unavailable (HTTP '+metadata.status+'). Use the manual CSV intake if needed.');
 const body=await metadata.json() as {success:boolean;result?:{resources?:{url?:string;format?:string}[]}};
 if(!body.success)throw Error('Boston Open Data metadata did not return a valid dataset.');
 const resource=body.result?.resources?.find(r=>r.format?.toLowerCase()==='csv'||r.url?.toLowerCase().endsWith('.csv'));
 if(!resource?.url)throw Error('There is no CSV resource in the official dataset metadata.');
 const url=new URL(resource.url);
 // Only explicit public-data hosts: reject arbitrary URLs in metadata to avoid SSRF.
 if(url.protocol!=='https:'||!['data.boston.gov','opendata.arcgis.com','bostonopendata-boston.opendata.arcgis.com'].includes(url.hostname))
    throw Error('CSV is hosted outside approved public-data domains. Use manual CSV import.');
 const response=await fetch(url.toString(),{signal,cache:'no-store'});
 if(!response.ok)throw Error('Official CSV download failed (HTTP '+response.status+').');
 const csv=await response.text();
 if(csv.length>6_000_000)throw Error('Official CSV too large for the pilot scan.');
 const mapped=mapBostonCsv(csv,url.toString(),source,area);
 if(!mapped.length)throw Error('No matching businesses for this neighborhood; the source may have different field names.');
 return mapped;
}
// A targeted bounding-box query is substantially cheaper than the original
// four repeated 1.6 km radius searches. The lower-cost backup query only reads
// nodes in a smaller area to avoid repeating an expensive request after a 504.
export function osmQuery(area:Area,reduced=false):string{
 const a=areas[area],meters=reduced?650:900;
 const dLat=meters/111_320,dLon=meters/(111_320*Math.cos(a.lat*Math.PI/180));
 const bbox=[
   a.lat-dLat,a.lon-dLon,a.lat+dLat,a.lon+dLon
 ].map(x=>x.toFixed(5)).join(',');
 const obj=reduced?'node':'nwr';
 const category=(tag:string)=>`${obj}["name"]["${tag}"](${bbox});`;
 return `[out:json][timeout:12][maxsize:67108864];(${category('shop')}${category('craft')}${category('office')}${obj}["name"]["amenity"~"^(dentist|doctors|clinic|veterinary|restaurant|cafe|bar|pub)$"](${bbox}););out center ${reduced?90:180};`;
}
const overpassServers=[
 'https://overpass.private.coffee/api/interpreter',
 'https://overpass-api.de/api/interpreter',
] as const;
// Within a running application process, avoid hammering shared servers on
// repeated button presses and reuse successful scans for ten minutes.
const recentOsm=new Map<Area,{at:number;results:Candidate[]}>();
let lastOsmAttempt=0;
export async function queryOsm(area:Area, requester:typeof fetch=fetch):Promise<Candidate[]>{
 const cached=recentOsm.get(area);
 if(cached&&Date.now()-cached.at<600_000)return cached.results;
 if(requester===fetch && Date.now()-lastOsmAttempt<30_000){
   throw Error('Please wait about 30 seconds before another OpenStreetMap scan. You can try the Boston datasets while waiting.');
 }
 if(requester===fetch)lastOsmAttempt=Date.now();
 const errors:string[]=[];
 for(let i=0;i<overpassServers.length;i++){
  const url=overpassServers[i],reduced=i===1;
  try{
   const res=await requester(url,{
    method:'POST',body:new URLSearchParams({data:osmQuery(area,reduced)}),
    headers:{
      'Content-Type':'application/x-www-form-urlencoded',
      'Accept':'application/json',
      'User-Agent':'CommandCenterManualDiscovery/0.2 (low-volume local research)'
    },
    cache:'no-store',signal:AbortSignal.timeout(reduced?17_000:18_000),
    redirect:'error',
   });
   if(res.status===429){
    throw Error('OpenStreetMap is rate limiting requests (HTTP 429). Wait before trying again or use a Boston public dataset. No records were added.');
   }
   if(!res.ok){
    if([502,503,504].includes(res.status)){
      errors.push(`Server ${i+1}: HTTP ${res.status}`);
      continue;
    }
    throw Error('OpenStreetMap request failed (HTTP '+res.status+'). Check the source or use an official Boston dataset.');
   }
   const raw=await res.text();
   if(raw.length>1_500_000)throw Error('OpenStreetMap response was too large for the manual pilot.');
   const data=JSON.parse(raw) as {elements?:OsmElement[];remark?:string};
   // Overpass can respond 200 with partial data plus a runtime failure message.
   if(data.remark){
      errors.push(`Server ${i+1}: incomplete response`);
      continue;
   }
   if(!Array.isArray(data.elements))throw Error('OpenStreetMap returned unexpected data. Try the City of Boston datasets.');
   const records=parseOsm(data.elements,area);
   recentOsm.set(area,{at:Date.now(),results:records});
   return records;
  }catch(err){
   const msg=err instanceof Error?err.message:'unknown error';
   if(msg.includes('429')||msg.includes('request failed (HTTP')||
      msg.includes('too large')||msg.includes('unexpected data'))throw err;
   errors.push(`Server ${i+1}: ${err instanceof Error && err.name==='TimeoutError'?'timed out':'connection failed'}`);
  }
 }
 throw Error('Both OpenStreetMap servers could not complete a small search ('+errors.join('; ')+'). No records were changed. Try a Boston directory or wait before retrying.');
}
export async function discover(source:Source,area:Area):Promise<Candidate[]>{
 if(source==='osm')return queryOsm(area);
 return getBoston(source,area);
}
