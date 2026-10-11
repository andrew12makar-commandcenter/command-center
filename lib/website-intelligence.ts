import {classifyWebPresence} from './web-presence.ts';
// Evidence-based mobile page audits through Google's PageSpeed Insights (Lighthouse).
// No direct requests to prospect URLs: remote websites are inspected by Google,
// avoiding direct localhost/private-network fetches from this application.
export type AuditStatus='verified_gaps'|'no_gaps'|'inconclusive';
export type AuditEvidence={
  id:string;title:string;result:'failed'|'passed'|'unknown';score:number|null;
  detail:string;source:'Google Lighthouse';measured_at:string
};
export type AuditFindings={
  version:1;provider:'Google PageSpeed Insights';strategy:'mobile';
  analyzed_url:string;final_url:string|null;measured_at:string;
  performance_score:number|null;seo_score:number|null;
  technical_opportunity_score:number|null;
  measured_checks:number;flagged_checks:number;
  note:string;error?:string;
  report_warnings?:string[];
  source_method?:'pagespeed_api'|'local_lighthouse_upload';
};
export type Assessment={
 status:AuditStatus;findings:AuditFindings;evidence:AuditEvidence[]
};
type Audit={id:string;title?:string;score?:number|null;scoreDisplayMode?:string;displayValue?:string};
export type PageSpeedResponse={
 lighthouseResult?:{
  requestedUrl?:string;finalUrl?:string;fetchTime?:string;
  runtimeError?:{code?:string;message?:string};
  runWarnings?:string[];
  audits?:Record<string,Audit>;
  categories?:{performance?:{score?:number|null};seo?:{score?:number|null}};
 }
};
const auditIds=['document-title','meta-description','viewport','is-crawlable'] as const;
const MAX_HOST_LENGTH=253;
const ipv4=(s:string)=>/^(?:\d{1,3}\.){3}\d{1,3}$/.test(s);
// Return a plain public homepage URL. Query strings may contain tokens; remove them.
// Reject private network hostnames or credentials. Google itself fetches the target.
export function publicWebsite(value:string):string{
 const presence=classifyWebPresence(value);
 if(presence.kind==='social'||presence.kind==='listing')
  throw Error('Social profiles and directories are not first-party business websites and cannot receive business PageSpeed audits.');
 if(!value||value.length>2000)throw Error('A valid public website URL is required.');
 let url:URL;try{url=new URL(value);}catch{throw Error('Website URL is not valid.');}
 const host=url.hostname.toLowerCase().replace(/\.$/,'');
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password||
    !host||host.length>MAX_HOST_LENGTH||
    host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||
    host.endsWith('.internal')||host.endsWith('.test')||host.endsWith('.invalid')||
    host==='0.0.0.0'||ipv4(host)||host.includes(':')||!host.includes('.')){
  throw Error('Only public HTTP/HTTPS domain websites can be audited.');
 }
 url.username='';url.password='';url.search='';url.hash='';
 return url.toString();
}
function score100(v:unknown):number|null{
 if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1)return null;
 return Math.round(v*100);
}
function short(value:unknown,n=240){return String(value??'').slice(0,n);}
export function interpretPageSpeed(data:PageSpeedResponse,requested:string,at=new Date().toISOString()):Assessment{
 const report=data.lighthouseResult;
 const fallback=(note:string):Assessment=>({
  status:'inconclusive',evidence:[],
  findings:{version:1,provider:'Google PageSpeed Insights',strategy:'mobile',
   analyzed_url:requested,final_url:null,measured_at:at,source_method:'pagespeed_api',performance_score:null,
   seo_score:null,technical_opportunity_score:null,measured_checks:0,
   flagged_checks:0,note,error:note}
 });
 if(!report || report.runtimeError)return fallback(
  report?.runtimeError?'Lighthouse reported a runtime error. No technical findings were confirmed.':'PageSpeed returned no Lighthouse audit results.');
 const measuredAt=report.fetchTime||at;
 const warnings=(report.runWarnings??[]).filter(w=>typeof w==='string'&&w.trim()).slice(0,8).map(w=>short(w,240));
 const perf=score100(report.categories?.performance?.score),
       seo=score100(report.categories?.seo?.score);
 const evidence:AuditEvidence[]=auditIds.map(id=>{
  // Lighthouse 13 renamed the original viewport audit to viewport-insight.
  const a=id==='viewport'?(report.audits?.viewport??report.audits?.['viewport-insight']):report.audits?.[id],s=score100(a?.score);
  return {id,title:short(a?.title||id,130),
   score:s,result:s===null?'unknown':s<100?'failed':'passed',
   detail:short(a?.displayValue||'',200),source:'Google Lighthouse' as const,measured_at:measuredAt};
 });
 let score:number|null=null;
 // Both categories must be present to make scores comparable across websites.
 // A single mobile lab test is a technical signal, not business spend or market value.
 if(warnings.length===0&&perf!==null&&seo!==null&&evidence.every(x=>x.result!=='unknown')){
   const base=(100-perf)*0.4+(100-seo)*0.35;
   const flags:{[id:string]:number}={'document-title':9,'meta-description':9,'viewport':7,'is-crawlable':0};
   score=Math.round(Math.max(0,Math.min(100,base+evidence.reduce((n,x)=>n+(x.result==='failed'?(flags[x.id]||0):0),0))));
 }
 const measured=evidence.filter(e=>e.result!=='unknown').length;
 const failed=evidence.filter(e=>e.result==='failed');
 const performanceGap=perf!==null && perf<50;
 const seoGap=seo!==null && seo<80;
 const status:AuditStatus=warnings.length?'inconclusive':failed.length||performanceGap||seoGap?'verified_gaps':
   perf===null||seo===null||measured<auditIds.length?'inconclusive':'no_gaps';
 return {status,evidence,findings:{
  version:1,provider:'Google PageSpeed Insights',strategy:'mobile',
  analyzed_url:requested,final_url:report.finalUrl||null,measured_at:measuredAt,
  source_method:'pagespeed_api',
  performance_score:perf,seo_score:seo,technical_opportunity_score:score,
  ...(warnings.length?{report_warnings:warnings}:{}),
  measured_checks:measured,flagged_checks:failed.length+(performanceGap?1:0)+(seoGap?1:0),
  note:warnings.length?'Lighthouse reported incomplete or unreliable collection. Scores are diagnostic only; do not rank the business from this run.':
    status==='verified_gaps'?'One mobile Lighthouse test found possible improvement opportunities. Confirm before pitching.':
    status==='no_gaps'?'No issues detected in these limited Lighthouse checks; not proof a website is problem-free.':
    'Some audit categories or checks were unavailable. Do not rank this site from incomplete metrics.'
 }};
}
export function inconclusiveAudit(url:string,message:string,at=new Date().toISOString()):Assessment{
 return {status:'inconclusive',evidence:[],findings:{
   version:1,provider:'Google PageSpeed Insights',strategy:'mobile',
   analyzed_url:url,final_url:null,measured_at:at,source_method:'pagespeed_api',
   performance_score:null,seo_score:null,technical_opportunity_score:null,
   measured_checks:0,flagged_checks:0,note:'The remote service did not complete an audit.',error:short(message,230)
 }};
}
export function pageSpeedEndpoint(target:string,key?:string):string{
 const request=new URL('https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed');
 request.searchParams.set('url',publicWebsite(target));
 request.searchParams.set('strategy','mobile');
 request.searchParams.append('category','performance');
 request.searchParams.append('category','seo');
 if(key)request.searchParams.set('key',key);
 return request.toString();
}
export async function analyzeWebsite(
  target:string,
  requester:typeof fetch=fetch,
  key?:string
):Promise<Assessment>{
 const url=publicWebsite(target),now=new Date().toISOString();
 const endpoint=pageSpeedEndpoint(url,key);
 try{
   const response=await requester(endpoint,{cache:'no-store',signal:AbortSignal.timeout(45_000),
     redirect:'error',headers:{Accept:'application/json'}});
   if(response.status===429)return inconclusiveAudit(url,key?
     'Google PageSpeed returned HTTP 429 despite the configured API key. Check project quota and wait before retrying, or import a locally run Lighthouse JSON report.':
     'Google PageSpeed returned HTTP 429 without a configured project API key. Set PAGESPEED_API_KEY privately, or import a locally run Lighthouse JSON report.',now);
   if(response.status===401||response.status===403)return inconclusiveAudit(url,'Google PageSpeed denied the request (HTTP '+response.status+'). Check API access and server-side PAGESPEED_API_KEY configuration.',now);
   if(!response.ok)return inconclusiveAudit(url,'Google PageSpeed could not complete the test (HTTP '+response.status+'). Check API availability or key configuration.',now);
   const data=await response.json() as PageSpeedResponse;
   return interpretPageSpeed(data,url,now);
 }catch(error){
   const message=error instanceof Error && (error.name==='AbortError'||error.name==='TimeoutError')
       ?'PageSpeed request timed out. Try later.'
       :'Google PageSpeed is unavailable. The website was not graded.';
   return inconclusiveAudit(url,message,now);
 }
}
