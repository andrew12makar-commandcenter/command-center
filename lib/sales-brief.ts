import type {AuditFindings} from './website-intelligence.ts';
import type {TechnicalSignals} from './lighthouse-signals.ts';

// An internal, evidence-bounded sales workup. Not a public performance claim.
export type BriefAssessment={
 status:string;website_url:string|null;assessed_at:string;findings:Partial<AuditFindings>|null
};
export type SalesBrief={
 confidence:'measured'|'operator_supplied'|'inconclusive'|'unmeasured';
 sourceLabel:string;assessedAt:string|null;
 originalPerformance:number|null;originalLcpMs:number|null;
 demoPerformance:null;demoBenchmarkLabel:string;
 observations:Array<{label:string;value:string;kind:'measured'|'estimated'}>;
 designGoals:string[];cautions:string[];
 outreachSummary:string|null;
};
const formatTime=(ms:number)=>ms>=1000?(Math.round(ms/100)/10)+' s':Math.round(ms)+' ms';
export function buildSalesBrief(
 businessName:string,assessment:BriefAssessment|null
):SalesBrief{
 const findings=assessment?.findings;
 const signals=findings?.technical_signals as TechnicalSignals|undefined;
 const metrics=signals?.metrics;
 const method=findings?.source_method;
 const warnings=findings?.report_warnings||[];
 const confidence:SalesBrief['confidence']=!assessment?'unmeasured':
  assessment.status==='inconclusive'||warnings.length?'inconclusive':
  method==='local_lighthouse_upload'?'operator_supplied':'measured';
 const valid=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
 const perf=valid(findings?.performance_score)?findings.performance_score:null;
 const lcp=valid(metrics?.lcp_ms)?metrics.lcp_ms:null;
 const observations:SalesBrief['observations']=[];
 if(perf!==null)observations.push({label:'Mobile Lighthouse performance',value:perf+'/100',kind:'measured'});
 if(lcp!==null)observations.push({label:'Largest Contentful Paint',value:formatTime(lcp),kind:'measured'});
 if(valid(metrics?.fcp_ms))observations.push({label:'First Contentful Paint',value:formatTime(metrics.fcp_ms),kind:'measured'});
 if(valid(metrics?.layout_shift))observations.push({label:'Cumulative Layout Shift',value:String(metrics.layout_shift),kind:'measured'});
 for(const insight of (signals?.insights||[]).slice(0,5)){
  if(insight.estimated_savings_ms!==undefined)observations.push({
   label:insight.title+' · potential savings',value:formatTime(insight.estimated_savings_ms),kind:'estimated'
  });
  else if(insight.estimated_savings_kib!==undefined)observations.push({
   label:insight.title+' · potential savings',
   value:Math.round(insight.estimated_savings_kib)+' KiB',kind:'estimated'
  });
  else observations.push({label:insight.title,value:'Flagged in Lighthouse',kind:'measured'});
 }
 const goals:string[]=[];
 if(lcp!==null&&lcp>2500)goals.push('Prioritize fast delivery and rendering of the largest above-the-fold content.');
 if((signals?.insights||[]).some(x=>x.title==='Render-blocking resources'))
  goals.push('Minimize critical-path CSS and scripts, preserving essential functionality.');
 if((signals?.insights||[]).some(x=>x.title==='Cache lifetime efficiency'))
  goals.push('Review cache policies for static images, fonts, and scripts.');
 if((signals?.insights||[]).some(x=>x.title==='Unused CSS'))
  goals.push('Remove or split unused styling to reduce initial page weight.');
 if((signals?.insights||[]).some(x=>/Image delivery|Image optimization/.test(x.title)))
  goals.push('Size and deliver images efficiently, especially the LCP element.');
 goals.push('Preserve working navigation and contact actions; confirm all business details with the owner.');
 goals.push('Benchmark the generated demo with comparable mobile Lighthouse settings before presenting any speed comparison.');
 const cautions=['One simulated mobile Lighthouse run does not establish the experience of real visitors.',
   'Estimated savings are diagnostic suggestions, not guaranteed speed improvements.',
   'No demo performance claim can be made until the actual demo URL is independently measured.'];
 if(confidence==='operator_supplied')cautions.unshift('The assessment was uploaded by an operator and has not been independently authenticated.');
 if(confidence==='inconclusive')cautions.unshift('This run was incomplete or unreliable. Scores are provisional and must not be used for prospect ranking or outreach claims.');
 if(confidence==='unmeasured')cautions.unshift('No applicable website assessment has been recorded yet.');
 const sourceLabel=!assessment?'No recorded measurement':
  confidence==='operator_supplied'?'Operator-uploaded Lighthouse report':
  method==='pagespeed_api'?'Google PageSpeed API Lighthouse report':'Lighthouse evidence (provenance not established)';
 const outreachSummary=confidence==='measured'&&lcp!==null&&lcp>4000?
  'A mobile lab test of '+businessName+' recorded an LCP of '+formatTime(lcp)+
  '. Consider offering an evidence-led mobile speed assessment and a comparable demo, subject to business-owner review.':null;
 return {
  confidence,sourceLabel,assessedAt:assessment?.assessed_at??null,
  originalPerformance:perf,originalLcpMs:lcp,
  demoPerformance:null,demoBenchmarkLabel:'Not benchmarked',
  observations:observations.slice(0,10),designGoals:goals.slice(0,8),
  cautions,outreachSummary
 };
}
