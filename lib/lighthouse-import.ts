// Import *native* JSON exported from Chrome DevTools Lighthouse as an
// operator-supplied fallback when Google PageSpeed is rate-limited.
// Never claim this file is an independently authenticated Google API result.
import {interpretPageSpeed,publicWebsite,type Assessment,type PageSpeedResponse} from './website-intelligence.ts';

type LocalReport=NonNullable<PageSpeedResponse['lighthouseResult']>&{
 lighthouseVersion?:unknown;requestedUrl?:string;finalUrl?:string;fetchTime?:string
};
function comparablePage(url:string):string{
 const parsed=new URL(publicWebsite(url));
 return parsed.hostname.toLowerCase().replace(/^www\./,'')+
   (parsed.pathname.replace(/\/+$/,'')||'/');
}
export function interpretLocalLighthouseJson(
 raw:string,expectedWebsite:string,now=new Date()
):Assessment{
 if(!raw.trim())throw Error('Select an exported Lighthouse JSON report.');
 let data:unknown;
 try{data=JSON.parse(raw);}catch{throw Error('This is not valid Lighthouse JSON. Export JSON (not HTML) from Chrome DevTools.');}
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Lighthouse JSON must contain a report object.');
 const report=data as LocalReport;
 if(typeof report.lighthouseVersion!=='string'||!/^\d+\./.test(report.lighthouseVersion))
  throw Error('This is not a native Lighthouse JSON export (missing lighthouseVersion).');
 if(!report.categories||!report.audits||typeof report.audits!=='object')
  throw Error('Lighthouse categories or individual audits are missing.');
 if(typeof report.requestedUrl!=='string'||!report.requestedUrl)
  throw Error('The Lighthouse export is missing the requested page URL.');
 const expected=comparablePage(expectedWebsite);
 // Matching either the requested URL or final redirected URL is legitimate;
 // a local audit of another client, subpage or domain must never be attached.
 const candidates=[report.requestedUrl,report.finalUrl].filter((url):url is string=>typeof url==='string'&&!!url);
 if(!candidates.some(url=>{
  try{return comparablePage(url)===expected;}catch{return false;}
 }))throw Error('This Lighthouse report does not match the business website. Check the site and homepage URL before importing.');
 if(typeof report.fetchTime!=='string')throw Error('The report is missing its Lighthouse fetchTime.');
 const measured=Date.parse(report.fetchTime);
 if(!Number.isFinite(measured)||measured>now.getTime()+5*60_000||
    measured<now.getTime()-7*24*60*60_000)
  throw Error('Import a recent Lighthouse report (within 7 days). Old or future-dated results cannot be used.');
 const result=interpretPageSpeed({lighthouseResult:report},expectedWebsite,report.fetchTime);
 result.findings.source_method='local_lighthouse_upload';
 result.findings.note+=(result.findings.note?' ':'')+
  'Operator-imported Chrome Lighthouse JSON, not independently authenticated by the PageSpeed API.';
 return result;
}
