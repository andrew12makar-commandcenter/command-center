import {classifyIndustry} from './business-classification.ts';

// A campaign records WHY a discovery run happened. It is attribution, not evidence.
export const TARGET_SERVICES=['gbp','website_design','geolocation_pages','local_seo','general_research'] as const;
export type TargetService=typeof TARGET_SERVICES[number];
export const targetServiceLabels:Record<TargetService,string>={
 gbp:'Google Business Profile setup',website_design:'Website design',
 geolocation_pages:'Geolocation pages',local_seo:'Local SEO',general_research:'General research'
};
export const DISCOVERY_SOURCES=['osm','boston-certified','boston-food','csv_import','manual'] as const;
export type DiscoverySource=typeof DISCOVERY_SOURCES[number];
export const discoverySourceLabels:Record<DiscoverySource,string>={
 osm:'OpenStreetMap','boston-certified':'Boston certified-business directory',
 'boston-food':'Boston food establishment licenses',csv_import:'CSV import',manual:'Manual entry'
};
export const TARGET_INDUSTRIES=['any','medical','home_services','other'] as const;
export type TargetIndustry=typeof TARGET_INDUSTRIES[number];
export const targetIndustryLabels:Record<TargetIndustry,string>={
 any:'Any industry',medical:'Medical / dental',home_services:'Home & field services',other:'Other businesses (retail, food, professional)'
};
export type Campaign={
 id:string;name:string;target_area:string;target_industry:string;
 target_service:TargetService;discovery_source:DiscoverySource;created_at:string
};
export type CampaignInput={
 name:string;target_area:string;target_industry:string;
 target_service:TargetService;discovery_source:DiscoverySource
};
const clean=(v:unknown,max:number)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,max);

export function industryDescription(industry:TargetIndustry,keyword:string):string{
 const k=clean(keyword,60);
 return (industry==='any'&&k?'Keyword':targetIndustryLabels[industry])+(k?(industry==='any'?': ':' · ')+k:'');
}
export function validateCampaignInput(input:{
 name:unknown;target_area:unknown;industry:unknown;keyword?:unknown;target_service:unknown;discovery_source:unknown
}):CampaignInput{
 const name=clean(input.name,120);
 if(name.length<2)throw Error('Name the discovery campaign (at least 2 characters).');
 const service=clean(input.target_service,40) as TargetService;
 if(!TARGET_SERVICES.includes(service))throw Error('Choose a valid target service.');
 const source=clean(input.discovery_source,40) as DiscoverySource;
 if(!DISCOVERY_SOURCES.includes(source))throw Error('Choose a valid discovery source.');
 const industry=clean(input.industry,40) as TargetIndustry;
 if(!TARGET_INDUSTRIES.includes(industry))throw Error('Choose a valid target industry.');
 return {name,target_area:clean(input.target_area,120),
  target_industry:industryDescription(industry,clean(input.keyword,60)),
  target_service:service,discovery_source:source};
}
// Deterministic pre-staging filter. Industry hints come from recorded category or name only.
export function matchesTargetIndustry(
 candidate:{name:string;category:string|null|undefined},industry:TargetIndustry,keyword=''
):boolean{
 const k=clean(keyword,60).toLocaleLowerCase();
 if(k&&!`${candidate.name} ${candidate.category||''}`.toLocaleLowerCase().includes(k))return false;
 if(industry==='any')return true;
 const t=classifyIndustry(candidate.name,candidate.category).template;
 return industry==='medical'?t==='medical':industry==='home_services'?t==='landscaping':t==='universal';
}
export function campaignLabel(c:Pick<Campaign,'name'|'target_service'>|null|undefined):string{
 return c?c.name+' · '+targetServiceLabels[c.target_service]:'No campaign';
}
// Test campaigns stay visible on request but out of the default real-prospect workflow.
export function isTestCampaign(c:Pick<Campaign,'name'>|null|undefined):boolean{
 return Boolean(c&&/^\s*test\b/i.test(c.name));
}
