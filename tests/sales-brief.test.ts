import test from 'node:test';
import assert from 'node:assert/strict';
import {extractTechnicalSignals,hasMeasuredMobileIssue} from '../lib/lighthouse-signals.ts';
import {interpretPageSpeed} from '../lib/website-intelligence.ts';
import {buildSalesBrief} from '../lib/sales-brief.ts';

const measuredAudits={
 'first-contentful-paint':{id:'first-contentful-paint',numericValue:5900},
 'largest-contentful-paint':{id:'largest-contentful-paint',numericValue:11800},
 'total-blocking-time':{id:'total-blocking-time',numericValue:10},
 'cumulative-layout-shift':{id:'cumulative-layout-shift',numericValue:0},
 'render-blocking-insight':{id:'render-blocking-insight',metricSavings:{LCP:4430},displayValue:'Potential savings of 4,430 ms'},
 'use-cache-lifetimes-insight':{id:'use-cache-lifetimes-insight',details:{overallSavingsBytes:8616*1024}},
 'unused-css-rules':{id:'unused-css-rules',details:{overallSavingsBytes:226*1024}},
 'document-title':{id:'document-title',score:1},
 'meta-description':{id:'meta-description',score:1},
 'viewport-insight':{id:'viewport-insight',score:1},
 'is-crawlable':{id:'is-crawlable',score:1},
};
const response=(warnings:string[]=[])=>({
 lighthouseResult:{fetchTime:'2026-10-10T23:23:00.000Z',runWarnings:warnings,
 categories:{performance:{score:.58},seo:{score:.92}},audits:measuredAudits}
});
test('mobile LCP of 11.8 seconds is a technical issue even when performance is 58',()=>{
 const result=interpretPageSpeed(response(),'https://example.org/');
 assert.equal(result.status,'verified_gaps');
 assert.equal(result.findings.performance_score,58);
 assert.equal(result.findings.technical_signals?.metrics.lcp_ms,11800);
 assert.ok((result.findings.technical_opportunity_score??0)>0);
});
test('display estimated savings without presenting them as guaranteed results',()=>{
 const signals=extractTechnicalSignals(measuredAudits);
 assert.equal(signals.metrics.fcp_ms,5900);
 assert.equal(signals.metrics.blocking_time_ms,10);
 assert.equal(signals.insights.find(x=>x.title==='Render-blocking resources')?.estimated_savings_ms,4430);
 assert.equal(signals.insights.find(x=>x.title==='Cache lifetime efficiency')?.estimated_savings_kib,8616);
 assert.equal(signals.insights.find(x=>x.title==='Unused CSS')?.estimated_savings_kib,226);
 assert.equal(hasMeasuredMobileIssue(signals),true);
});
test('warned Lighthouse run preserves raw metrics but cannot rank prospects',()=>{
 const result=interpretPageSpeed(response(['The page loaded too slowly. Results may be incomplete.']),'https://example.org/');
 assert.equal(result.status,'inconclusive');
 assert.equal(result.findings.technical_signals?.metrics.lcp_ms,11800);
 assert.equal(result.findings.technical_opportunity_score,null);
 const brief=buildSalesBrief('Example dental practice',{status:result.status,website_url:'https://example.org/',
  assessed_at:'2026-10-10T23:23:00.000Z',findings:result.findings});
 assert.equal(brief.confidence,'inconclusive');
 assert.equal(brief.outreachSummary,null);
 assert.equal(brief.demoPerformance,null);
});
test('measured existing website does not create fake benchmark for untested demo',()=>{
 const result=interpretPageSpeed(response(),'https://example.org/');
 const brief=buildSalesBrief('Example dental practice',{status:result.status,website_url:'https://example.org/',
  assessed_at:'2026-10-10T23:23:00.000Z',findings:result.findings});
 assert.equal(brief.confidence,'measured');
 assert.equal(brief.originalPerformance,58);
 assert.equal(brief.originalLcpMs,11800);
 assert.equal(brief.demoPerformance,null);
 assert.equal(brief.demoBenchmarkLabel,'Not benchmarked');
 assert.ok(brief.designGoals.some(x=>x.includes('critical-path')));
 assert.ok(brief.cautions.some(x=>x.includes('not guaranteed')));
});
test('no audit produces research guidance without fabricated numbers',()=>{
 const brief=buildSalesBrief('Unmeasured company',null);
 assert.equal(brief.confidence,'unmeasured');
 assert.equal(brief.originalPerformance,null);
 assert.equal(brief.originalLcpMs,null);
 assert.equal(brief.outreachSummary,null);
 assert.ok(brief.designGoals.some(x=>x.includes('benchmark')));
});
