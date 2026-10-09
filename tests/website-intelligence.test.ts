import test from 'node:test';
import assert from 'node:assert/strict';
import {publicWebsite,interpretPageSpeed,analyzeWebsite,pageSpeedEndpoint} from '../lib/website-intelligence.ts';
test('rejects local/private/internal and query credentials',()=>{
 for(const url of ['http://localhost:3000','http://127.0.0.1','http://10.0.0.1','http://[::1]','ftp://a.com','https://foo.local','https://a:pass@public.com']){
  assert.throws(()=>publicWebsite(url));
 }
 assert.equal(publicWebsite('https://www.example.com/?secret=abc#top'),'https://www.example.com/');
});
test('two present Lighthouse categories and failing audits result in checkable score',()=>{
 const a=interpretPageSpeed({lighthouseResult:{
   categories:{performance:{score:.33},seo:{score:.75}},
   audits:{'document-title':{id:'document-title',title:'Document has a title',score:1},
    'meta-description':{id:'meta-description',score:0,title:'Document has no meta description'},
    'viewport':{id:'viewport',score:0,title:'Viewport not provided'},
    'is-crawlable':{id:'is-crawlable',score:1}
   },
   fetchTime:'2026-10-09T10:00:00.000Z',finalUrl:'https://example.com/'
 }},'https://example.com/');
 assert.equal(a.status,'verified_gaps');
 assert.equal(a.findings.performance_score,33);
 assert.equal(a.findings.seo_score,75);
 assert.equal(a.findings.flagged_checks,4);
 assert.ok(a.findings.technical_opportunity_score!==null);
 assert.equal(a.evidence.length,4);
});
test('incomplete results do not invent a score or false good status',()=>{
 const a=interpretPageSpeed({lighthouseResult:{categories:{performance:{score:.92}}}},'https://example.com/');
 assert.equal(a.status,'inconclusive');
 assert.equal(a.findings.technical_opportunity_score,null);
});
test('runtime failures do not invent website flaws',()=>{
 const a=interpretPageSpeed({lighthouseResult:{runtimeError:{code:'ERRORED'}}},'https://example.com/');
 assert.equal(a.status,'inconclusive');assert.equal(a.evidence.length,0);
});
test('Google 429 returns inconclusive without retrying externally',async()=>{
 let calls=0;
 const mock:typeof fetch=async()=>{calls++;return new Response('429',{status:429});};
 const a=await analyzeWebsite('https://example.com',mock);
 assert.equal(a.status,'inconclusive');assert.equal(a.findings.technical_opportunity_score,null);assert.equal(calls,1);
});
test('endpoint has both SEO and performance categories, without secret key by default',()=>{
 const x=new URL(pageSpeedEndpoint('https://example.com'));
 assert.deepEqual(x.searchParams.getAll('category'),['performance','seo']);
 assert.equal(x.searchParams.get('key'),null);
});
