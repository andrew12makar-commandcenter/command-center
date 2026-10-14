// Free, deterministic first-party website evidence. One page, robots.txt and
// sitemap.xml only. No crawling, no third-party APIs, no Google Maps.
export type WebsiteCheckStatus='reachable'|'unreachable'|'denied'|'unsafe'|'error';
export type WebsiteIssue='no_https'|'no_viewport'|'no_title'|'no_meta_description'|'no_local_business_schema'|'old_copyright'|'no_sitemap'|'name_not_found';
export type WebsiteCheck={
 checked_at:string;url:string;final_url:string|null;status:WebsiteCheckStatus;error_code?:string;
 https:boolean;title:string;description:string;canonical:string|null;viewport:boolean;
 json_ld_types:string[];local_business_schema:boolean;copyright_year:number|null;
 phone_on_page:boolean;email_on_page:boolean;name_match:boolean|null;
 robots_txt:boolean|null;sitemap:boolean|null;issues:WebsiteIssue[];
};
export const websiteIssueLabels:Record<WebsiteIssue,string>={
 no_https:'Not served over HTTPS',no_viewport:'No mobile viewport tag',no_title:'Missing page title',
 no_meta_description:'Missing meta description',no_local_business_schema:'No LocalBusiness structured data',
 old_copyright:'Copyright year looks out of date',no_sitemap:'No sitemap found',
 name_not_found:'Business name not found on the homepage (identity unconfirmed)'
};
// LocalBusiness has hundreds of schema.org subtypes; accept the family by suffix as well as by name.
const LOCAL_SUFFIX=/(Business|Store|Restaurant|Agency|Service|Office|Clinic|Practice|Shop|Salon|Cafe|Bakery|Contractor|Center|Physician|Attorney|Notary|Club|Studio|Dealer|Repair)$/;
const LOCAL_TYPES=/^(LocalBusiness|Organization|Restaurant|FoodEstablishment|Store|ProfessionalService|HomeAndConstructionBusiness|HealthAndBeautyBusiness|MedicalBusiness|Dentist|AutomotiveBusiness|LegalService|FinancialService|SportsActivityLocation|LodgingBusiness|EntertainmentBusiness|CafeOrCoffeeShop|BarOrPub|Bakery|BeautySalon|HairSalon|DaySpa|ExerciseGym|RealEstateAgent|Plumber|Electrician|GeneralContractor|HVACBusiness|Locksmith|MovingCompany|RoofingContractor|HousePainter)$/;
const STOP=new Set(['llc','inc','co','corp','corporation','company','the','and','of','ltd','limited','liability','group','services','service','enterprises','enterprise','boston','ma','pc','pllc','llp']);
function decode(s:string){return s.replace(/&#(\d{1,6});/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]{1,6});/gi,(_,h)=>String.fromCodePoint(parseInt(h,16))).replace(/&mdash;/g,'—').replace(/&ndash;/g,'–').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
function meta(html:string,attr:'name'|'property',key:string):string{
 const re=new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]*>`,'i');const tag=html.match(re)?.[0]||'';
 return decode(tag.match(/content=["']([^"']*)["']/i)?.[1]||'');
}
export function nameTokens(name:string):string[]{
 return [...new Set(name.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(t=>t.length>=3&&!STOP.has(t)))];
}
export function nameMatches(name:string,haystack:string):boolean|null{
 const tokens=nameTokens(name);if(!tokens.length)return null;
 const h=haystack.toLowerCase().replace(/[^a-z0-9]/g,' ');
 const hits=tokens.filter(t=>h.includes(t)||h.replace(/\s/g,'').includes(t)).length;
 return hits/tokens.length>=0.5;
}
// Pure parser: the same HTML always produces the same evidence.
export function parseWebsiteHtml(html:string,opts:{finalUrl:string;businessName:string;now?:Date}):Omit<WebsiteCheck,'checked_at'|'url'|'status'|'robots_txt'|'sitemap'>{
 const head=html.slice(0,400_000);
 const title=decode(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').slice(0,200);
 const description=(meta(head,'name','description')||meta(head,'property','og:description')).slice(0,300);
 const canonical=head.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0].match(/href=["']([^"']+)["']/i)?.[1]||null;
 const viewport=/<meta[^>]+name=["']viewport["']/i.test(head);
 const types:string[]=[];
 for(const m of head.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  try{
   const walk=(v:unknown):void=>{
    if(Array.isArray(v)){v.forEach(walk);return;}
    if(v&&typeof v==='object'){const o=v as Record<string,unknown>;
     const t=o['@type'];(Array.isArray(t)?t:[t]).forEach(x=>{if(typeof x==='string')types.push(x);});
     if(o['@graph'])walk(o['@graph']);}
   };
   walk(JSON.parse(m[1].trim()));
  }catch{/* malformed JSON-LD is ignored, not guessed */}
 }
 const text=decode(head.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' '));
 const years=[...text.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?((?:19|20)\d{2})/gi)].map(m=>Number(m[1]));
 const copyright_year=years.length?Math.max(...years):null;
 const now=(opts.now||new Date()).getUTCFullYear();
 const https=/^https:/i.test(opts.finalUrl);
 let host='';try{host=new URL(opts.finalUrl).hostname;}catch{host='';}
 const name_match=nameMatches(opts.businessName,[title,meta(head,'property','og:site_name'),host,text.slice(0,20000)].join(' '));
 const local_business_schema=types.some(t=>LOCAL_TYPES.test(t)||LOCAL_SUFFIX.test(t));
 const issues:WebsiteIssue[]=[];
 if(!https)issues.push('no_https');
 if(!viewport)issues.push('no_viewport');
 if(!title)issues.push('no_title');
 if(!description)issues.push('no_meta_description');
 if(!local_business_schema)issues.push('no_local_business_schema');
 if(copyright_year!==null&&copyright_year<=now-3)issues.push('old_copyright');
 if(name_match===false)issues.push('name_not_found');
 return {final_url:opts.finalUrl,https,title,description,canonical,viewport,json_ld_types:[...new Set(types)].slice(0,12),
  local_business_schema,copyright_year,phone_on_page:/(?:\(\d{3}\)\s?|\b\d{3}[-.\s])\d{3}[-.\s]\d{4}\b|tel:/i.test(head),
  email_on_page:/mailto:|[\w.+-]+@[\w-]+\.[\w.]+/i.test(head),name_match,issues};
}
// Quality issues that indicate a weak site (identity and sitemap are tracked separately).
export function websiteWeaknessCount(c:WebsiteCheck):number{
 return c.issues.filter(i=>['no_https','no_viewport','no_title','no_meta_description','old_copyright'].includes(i)).length;
}
export function seoGapCount(c:WebsiteCheck):number{
 return c.issues.filter(i=>['no_title','no_meta_description','no_local_business_schema','no_sitemap'].includes(i)).length;
}
export function isWebsiteCheck(v:unknown):v is WebsiteCheck{
 return !!v&&typeof v==='object'&&typeof (v as WebsiteCheck).status==='string'&&Array.isArray((v as WebsiteCheck).issues);
}
