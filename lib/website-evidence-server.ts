import 'server-only';
// @ts-expect-error JavaScript module intentionally has no generated declarations.
import {preflightPublicWebsite,checkPublicDns} from '../scripts/local-audit-guard.mjs';
import {parseWebsiteHtml,type WebsiteCheck,type WebsiteCheckStatus} from '@/lib/website-evidence';

const UA='CommandCenterResearch/1.0 (manual, one-page check)';
async function smallGet(url:string,max:number,accept:string):Promise<{status:number;body:string}|null>{
 try{
  await checkPublicDns(url);
  const res=await fetch(url,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(10000),headers:{'User-Agent':UA,Accept:accept},cache:'no-store'});
  if(res.status>=300&&res.status<400){await res.body?.cancel().catch(()=>{});return {status:res.status,body:''};}
  const reader=res.body?.getReader();let body='';const dec=new TextDecoder();
  if(reader){let total=0;for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;body+=dec.decode(value,{stream:true});if(total>max){await reader.cancel().catch(()=>{});break;}}}
  return {status:res.status,body};
 }catch{return null;}
}
// One deliberate, operator-triggered check. Never follows a redirect that preflight rejected.
export async function checkWebsiteEvidence(input:string,businessName:string):Promise<WebsiteCheck>{
 const checked_at=new Date().toISOString();
 const empty={final_url:null,https:false,title:'',description:'',canonical:null,viewport:false,json_ld_types:[],
  local_business_schema:false,copyright_year:null,phone_on_page:false,email_on_page:false,name_match:null,robots_txt:null,sitemap:null,issues:[]};
 let finalUrl:string;
 try{finalUrl=String(await preflightPublicWebsite(input));}
 catch(error){
  const code=(error as {code?:string})?.code||'error';
  // Only DNS or connection failure counts as "unreachable". An HTTP error page or bot
  // protection is not evidence of inactivity; it needs manual verification.
  const status:WebsiteCheckStatus=code==='local-unsafe'?'unsafe':code==='local-denied'||code==='local-rate-limited'?'denied':
   code==='local-dns'||code==='local-network'?'unreachable':'error';
  return {checked_at,url:input,status,error_code:code,...empty};
 }
 const page=await smallGet(finalUrl,1_500_000,'text/html');
 if(!page||page.status>=400||!page.body)return {checked_at,url:input,status:'error',error_code:page?'http-'+page.status:'fetch',...empty,final_url:finalUrl};
 const parsed=parseWebsiteHtml(page.body,{finalUrl,businessName});
 const origin=new URL(finalUrl).origin;
 const robots=await smallGet(origin+'/robots.txt',50_000,'text/plain');
 const robotsOk=!!robots&&robots.status===200&&/user-agent|sitemap|disallow|allow/i.test(robots.body);
 const declared=robotsOk?robots!.body.match(/^\s*sitemap:\s*(\S+)/im)?.[1]:null;
 let sitemap:boolean|null=Boolean(declared);
 if(!sitemap){const sm=await smallGet(origin+'/sitemap.xml',50_000,'application/xml');sitemap=sm?sm.status===200&&/<(urlset|sitemapindex)/i.test(sm.body):null;}
 const issues=[...parsed.issues];if(sitemap===false)issues.push('no_sitemap');
 return {checked_at,url:input,status:'reachable',...parsed,robots_txt:robots?robotsOk:null,sitemap,issues};
}
