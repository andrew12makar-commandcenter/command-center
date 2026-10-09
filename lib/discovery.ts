import {parseCsv,normalizeBusiness,normalizedHeader} from './csv.ts';

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
  return [{
   name,city:safe(t['addr:city'],100),category:safe(category,140),
   website_url:http(t.website||t['contact:website']),phone:safe(t.phone||t['contact:phone'],100),
   source_url:'https://www.openstreetmap.org/'+external_id,source_type:'openstreetmap',
   external_id,raw_data:{
    external_id,provider:'OpenStreetMap contributors',search_area:areas[area].label,
    street:safe(t['addr:street']),housenumber:safe(t['addr:housenumber']),
    postcode:safe(t['addr:postcode']),lat:String(position?.lat??''),lon:String(position?.lon??''),
    original_category:category,website:safe(t.website||t['contact:website'])
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
  return [{name:safe(name,180),city:safe(city,100),category:safe(pick(raw,mapping.category)|| (source==='boston-food'?'Food establishment':'Certified business'),150),
   website_url:http(pick(raw,mapping.website)),phone:safe(pick(raw,mapping.phone),100),
   source_type:source,source_url:'https://data.boston.gov/dataset/'+slugs[source],external_id,
   raw_data:{...Object.fromEntries(Object.entries(raw).slice(0,22)),provider:'City of Boston Open Data',download_url:download,
    external_id,source_row:String(i+2),postcode:zip,neighborhood:neighbor}
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
async function getOsm(area:Area):Promise<Candidate[]>{
 const a=areas[area],where=`(around:${a.radius},${a.lat},${a.lon})`;
 const q=`[out:json][timeout:20];(nwr${where}["name"]["shop"];nwr${where}["name"]["craft"];nwr${where}["name"]["office"];nwr${where}["name"]["amenity"~"^(dentist|doctors|clinic|veterinary|restaurant|cafe|bar|pub)$"];);out center qt;`;
 const res=await fetch('https://overpass-api.de/api/interpreter',{
  method:'POST',body:new URLSearchParams({data:q}),
  headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json',
   'User-Agent':'CommandCenterLeadResearch/0.1 (single user manual scans)'},
  signal:AbortSignal.timeout(27000),cache:'no-store'
 });
 if(!res.ok)throw Error('Community map server unavailable (HTTP '+res.status+'). Wait before retrying if rate limited.');
 const raw=await res.text();
 if(raw.length>4_000_000)throw Error('Map response too large; stop and narrow the source.');
 const d=JSON.parse(raw) as {elements?:OsmElement[]};
 if(!Array.isArray(d.elements))throw Error('Community map returned unexpected data.');
 return parseOsm(d.elements,area);
}
export async function discover(source:Source,area:Area):Promise<Candidate[]>{
 if(source==='osm')return getOsm(area);
 return getBoston(source,area);
}
