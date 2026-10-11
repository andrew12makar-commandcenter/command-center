import test from 'node:test';
import assert from 'node:assert/strict';
import {interpretLocalLighthouseJson} from '../lib/lighthouse-import.ts';
const now=new Date('2026-10-10T22:00:00.000Z');
const make=(extra:Record<string,unknown>={})=>JSON.stringify({
 lighthouseVersion:'13.0.0',requestedUrl:'https://www.example.com/',
 finalUrl:'https://example.com/',fetchTime:'2026-10-10T21:45:00.000Z',
 categories:{performance:{score:.35},seo:{score:.7}},
 audits:{
  'document-title':{id:'document-title',score:1},
  'meta-description':{id:'meta-description',score:0},
  'viewport':{id:'viewport',score:1},
  'is-crawlable':{id:'is-crawlable',score:1}
 },...extra
});
test('fresh local Lighthouse report matches prospect homepage with www redirect',()=>{
 const result=interpretLocalLighthouseJson(make(),'https://example.com/',now);
 assert.equal(result.status,'verified_gaps');
 assert.equal(result.findings.performance_score,35);
 assert.equal(result.findings.source_method,'local_lighthouse_upload');
 assert.ok(result.findings.note.includes('Operator-imported'));
 assert.equal(result.evidence.length,4);
});
test('cannot import another business domain or a different subpage',()=>{
 for(const url of ['https://other.example.com/','https://example.com/about']){
  assert.throws(()=>interpretLocalLighthouseJson(make(),url,now),/does not match/);
 }
});
test('rejects locally fabricated report missing Lighthouse marker or audit data',()=>{
 assert.throws(()=>interpretLocalLighthouseJson('{"categories":{}}','https://example.com/',now),/native Lighthouse/);
 assert.throws(()=>interpretLocalLighthouseJson('not JSON','https://example.com/',now),/not valid Lighthouse/);
 assert.throws(()=>interpretLocalLighthouseJson(make({audits:null}),'https://example.com/',now),/missing/);
});
test('rejects old and future-dated local Lighthouse output',()=>{
 for(const stamp of ['2026-09-01T00:00:00.000Z','2026-10-11T00:00:00.000Z']){
  assert.throws(()=>interpretLocalLighthouseJson(make({fetchTime:stamp}),'https://example.com/',now),/recent Lighthouse/);
 }
});
test('fails inconclusively for incomplete local Lighthouse measurements',()=>{
 const result=interpretLocalLighthouseJson(make({
  categories:{performance:{score:null}},audits:{}
 }),'https://example.com/',now);
 assert.equal(result.status,'inconclusive');
 assert.equal(result.findings.technical_opportunity_score,null);
 assert.equal(result.findings.source_method,'local_lighthouse_upload');
});
