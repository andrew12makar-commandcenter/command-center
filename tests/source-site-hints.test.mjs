import test from 'node:test';
import assert from 'node:assert/strict';
import {extractCandidates} from '../scripts/site-candidates.mjs';

test('reference extraction captures theme metadata and meaningful image roles without granting rights',()=>{
 const html=`<!doctype html><html><head><title>Sample business</title>
  <meta name="theme-color" content="#2A6744">
  <meta name="description" content="A fictional business for extractor tests">
  </head><body><main><h1>Fictional Business</h1>
   <img src="/assets/brand.svg" class="brand-logo" alt="Business logo">
   <img src="/media/outdoor.webp" class="homepage-hero" alt="An outdoor space">
   <img src="/media/photo2.webp" alt="More outdoor details">
   <a href="/services">Services</a>
  </main></body></html>`;
 const result=extractCandidates(html,'https://example.org/');
 assert.equal(result.themeColor,'#2a6744');
 assert.deepEqual(result.images.map(x=>x.role),['logo','hero','gallery']);
 assert.ok(result.images.every(x=>x.permission==='reference_only'));
 assert.ok(result.images.every(x=>x.url.startsWith('https://example.org/')));
});

test('untrusted style strings never become theme colors',()=>{
 for(const color of ['javascript:alert(1)','red','url(//evil.example)','var(--site-color)']){
  const html=`<meta name="theme-color" content="${color}"><h1>Sample</h1>`;
  assert.equal(extractCandidates(html,'https://example.org/').themeColor,null);
 }
});
