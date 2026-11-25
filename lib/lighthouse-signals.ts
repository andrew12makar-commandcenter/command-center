// Small, evidence-first subset of Lighthouse's measurements for commercial triage.
// Field data, lab data, and estimated savings are NEVER interchangeable.
export type CoreMetrics={
 fcp_ms:number|null;lcp_ms:number|null;speed_index_ms:number|null;
 blocking_time_ms:number|null;layout_shift:number|null;
};
export type TechnicalInsight={
 id:string;title:string;type:'observation'|'estimated_savings';
 description:string;estimated_savings_ms?:number;estimated_savings_kib?:number;
};
export type TechnicalSignals={metrics:CoreMetrics;insights:TechnicalInsight[]};
type RawAudit={
 id?:string;title?:string;description?:string;
 numericValue?:number|null;score?:number|null;
 displayValue?:string;details?:{overallSavingsMs?:unknown;overallSavingsBytes?:unknown};
 metricSavings?:{LCP?:unknown;FCP?:unknown};
};
const metricIds={
 fcp_ms:'first-contentful-paint',lcp_ms:'largest-contentful-paint',
 speed_index_ms:'speed-index',blocking_time_ms:'total-blocking-time',
 layout_shift:'cumulative-layout-shift'
} as const;
const insightSpecs=[
 ['render-blocking-insight','Render-blocking resources'],
 ['render-blocking-resources','Render-blocking resources'],
 ['use-cache-lifetimes-insight','Cache lifetime efficiency'],
 ['uses-long-cache-ttl','Cache lifetime efficiency'],
 ['unused-css-rules','Unused CSS'],
 ['font-display-insight','Font display'],
 ['modern-image-formats','Modern image delivery'],
 ['uses-optimized-images','Image optimization'],
 ['image-delivery-insight','Image delivery'],
 ['lcp-discovery-insight','LCP request discovery']
] as const;
const finite=(x:unknown):number|null=>
 typeof x==='number'&&Number.isFinite(x)&&x>=0?x:null;
const round=(x:number)=>Math.round(x*10)/10;
const brief=(x:unknown,n=160)=>typeof x==='string'?x.replace(/\s+/g,' ').trim().slice(0,n):'';
export function extractTechnicalSignals(
 audits:Record<string,RawAudit>|undefined
):TechnicalSignals{
 const m={} as CoreMetrics;
 for(const [k,id] of Object.entries(metricIds) as Array<[keyof CoreMetrics,string]>){
  const value=finite(audits?.[id]?.numericValue);
  m[k]=value===null?null:round(value);
 }
 const seen=new Set<string>();
 const insights:TechnicalInsight[]=[];
 for(const [id,title] of insightSpecs){
  const item=audits?.[id];
  if(!item||seen.has(title))continue;
  if(item.score!==undefined&&item.score!==null&&item.score>=1)continue;
  const ms=finite(item.details?.overallSavingsMs)
   ??finite(item.metricSavings?.LCP)
   ??finite(item.metricSavings?.FCP);
  const bytes=finite(item.details?.overallSavingsBytes);
  const label=brief(item.displayValue,140);
  // Only indicate an issue when Lighthouse returned actual savings or a
  // failing audit. An included but informational insight is NOT a failure.
  if(!(ms!==null&&ms>0)&&!(bytes!==null&&bytes>0)&&
     !(typeof item.score==='number'&&item.score<1))continue;
  const insight:TechnicalInsight={
   id,title,type:ms!==null&&ms>0||bytes!==null&&bytes>0?'estimated_savings':'observation',
   description:label||'Lighthouse identified a potential optimization area.'
  };
  if(ms!==null&&ms>0)insight.estimated_savings_ms=Math.round(ms);
  if(bytes!==null&&bytes>0)insight.estimated_savings_kib=Math.round(bytes/1024);
  insights.push(insight);
  seen.add(title);
 }
 return {metrics:m,insights:insights.slice(0,8)};
}
export function hasMeasuredMobileIssue(signals:TechnicalSignals):boolean{
 const {lcp_ms,fcp_ms,layout_shift}=signals.metrics;
 // Conservative, externally established "poor" web vital thresholds.
 return (lcp_ms!==null&&lcp_ms>4000)||
   (fcp_ms!==null&&fcp_ms>3000)||
   (layout_shift!==null&&layout_shift>0.25)||
   signals.insights.some(x=>x.type==='estimated_savings'&&
     ((x.estimated_savings_ms??0)>=500||(x.estimated_savings_kib??0)>=100));
}
