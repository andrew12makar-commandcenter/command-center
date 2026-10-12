import test from 'node:test';
import assert from 'node:assert/strict';
import {extractBusinessFacts,normalizePhone} from '../scripts/site-facts.mjs';
import {buildWebsiteBrief,briefToMarkdown} from '../lib/website-brief.ts';

const url='https://smiles.example.org/';
const at='2026-10-12T10:00:00.000Z';
const home=`<!doctype html><html lang="en"><head><title>Example Smiles | Brighton Dentist</title>
<meta name="viewport" content="width=device-width"><meta name="description" content="Family dentistry in Brighton.">
<meta name="theme-color" content="#1A5C7A">
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@400&family=Work+Sans&display=swap" rel="stylesheet">
<style>.btn{background:#1a5c7a}.hero{color:#1a5c7a}.x{color:#f4c430}</style>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Dentist","name":"Example Smiles",
"telephone":"+1 617-555-0142","address":{"streetAddress":"1 Example St","addressLocality":"Brighton","addressRegion":"MA","postalCode":"02135"},
"openingHoursSpecification":[{"dayOfWeek":["Monday","Tuesday"],"opens":"08:00","closes":"17:00"}],
"makesOffer":[{"itemOffered":{"name":"Dental implants"}},{"itemOffered":{"name":"Cleanings"}}],
"sameAs":["https://www.facebook.com/example","javascript:alert(1)"]},
{"@type":"FAQPage","mainEntity":[{"name":"Do you take new patients?","acceptedAnswer":{"text":"<p>Yes, call us.</p>"}}]}]}</script>
<script type="application/ld+json">{ not json</script></head>
<body><header><img src="/logo.svg" alt="Example Smiles logo"><nav><a href="/">Home</a><a href="/services">Services</a><a href="/contact">Contact</a></nav></header>
<h1>Gentle dentistry in Brighton</h1>
<section><h2>Our Services</h2><ul><li>Cleanings</li><li>Crowns and bridges</li><li>Call 617-555-0142 today.</li></ul></section>
<ul><li>Mon–Thu: 8am – 5pm</li><li>Parking available</li></ul>
<a href="tel:6175550142">617.555.0142</a><a href="tel:+16175550199">Billing line</a>
<a href="mailto:Hello@Smiles.example.org?subject=hi">Email us</a>
<a href="https://book.example.com/smiles">Book an appointment</a>
<details><summary>Is parking available?</summary>Yes, behind the building.</details>
<img src="/a.jpg"><img src="/b.jpg" alt="">
</body></html>`;

test('phone numbers normalize across formats',()=>{
 for(const raw of ['617-555-0142','(617) 555-0142','+1 617.555.0142','tel:6175550142'])assert.equal(normalizePhone(raw),'(617) 555-0142');
 assert.equal(normalizePhone('12345'),null);
});

test('structured data, links and text yield traceable source-stated facts',()=>{
 const r=extractBusinessFacts(home,url,at);
 const values=f=>r.facts.filter(x=>x.field===f).map(x=>x.value);
 assert.deepEqual(values('name'),['Example Smiles']);
 assert.deepEqual(values('phone'),['(617) 555-0142','(617) 555-0199']);
 assert.deepEqual(values('email'),['hello@smiles.example.org']);
 assert.deepEqual(values('address'),['1 Example St, Brighton, MA, 02135']);
 assert.ok(values('hours').includes('Monday, Tuesday 08:00–17:00'));
 assert.ok(values('hours').includes('Mon–Thu: 8am – 5pm'));
 assert.deepEqual(values('service'),['Dental implants','Cleanings']);
 assert.ok(values('serviceCandidate').includes('Crowns and bridges'));
 assert.ok(!values('serviceCandidate').some(v=>/617/.test(v)),'contact lines are not services');
 assert.deepEqual(values('profileLink'),['https://www.facebook.com/example']);
 assert.equal(values('faq').length,2);
 assert.ok(values('conversionLink').some(v=>v.href==='https://book.example.com/smiles'));
 for(const f of r.facts){
  assert.equal(f.status,'source_stated');
  assert.equal(f.source.url,url);assert.equal(f.source.capturedAt,at);
  assert.ok(f.source.method&&f.source.excerpt);
 }
 assert.equal(r.design.themeColor,'#1a5c7a');
 assert.equal(r.design.frequentColors[0],'#1a5c7a');
 assert.deepEqual(r.design.fonts,['Lora','Work Sans']);
 assert.deepEqual(r.design.navigation,['Home','Services','Contact']);
 assert.deepEqual(r.design.logoCandidates,['https://smiles.example.org/logo.svg']);
 assert.equal(r.structure.imagesMissingAlt,1);
 assert.equal(r.needsBrowserRender,false);
});

test('a script-only shell is flagged for the selective browser fallback',()=>{
 const r=extractBusinessFacts('<html><body><div id="root"></div><script src="/a.js"></script><script src="/b.js"></script><script src="/c.js"></script></body></html>',url,at);
 assert.equal(r.needsBrowserRender,true);
 assert.equal(r.facts.length,0);
});

test('brief keeps conflicts, missing fields and evidence-based observations separate',()=>{
 const contact=`<html><head><title>Contact</title></head><body><h1>Contact</h1><h1>Visit</h1>
 <address>9 Other Ave, Allston MA</address><a href="tel:617-555-0142">Call</a></body></html>`;
 const pages=[extractBusinessFacts(home,url,at),extractBusinessFacts(contact,url+'contact',at)];
 const b=buildWebsiteBrief('Example Smiles',url,pages,new Date(at));
 assert.equal(b.status,'source_stated_unverified');
 const phone=b.facts.phone.find(f=>f.value==='(617) 555-0142');
 assert.equal(phone.sources.length,2,'same value on two pages keeps both sources');
 assert.ok(b.conflicts.some(c=>c.field==='address'&&c.values.length===2));
 assert.ok(b.conflicts.some(c=>c.field==='phone'));
 assert.deepEqual(b.missing,[]);
 const contactObs=b.observations.filter(o=>o.page===url+'contact').map(o=>o.finding);
 assert.ok(contactObs.includes('Page is not configured for mobile screens.'));
 assert.ok(contactObs.includes('Competing main headings.'));
 const md=briefToMarkdown(b);
 assert.match(md,/not independently verified/);
 assert.match(md,/## Conflicts/);
 assert.match(md,/Dental implants/);
});

test('an empty site produces an honest missing-information list, not filler',()=>{
 const b=buildWebsiteBrief('Quiet Co','https://quiet.example.org/',[extractBusinessFacts('<html><body><h1>Welcome</h1><p>Hello.</p></body></html>','https://quiet.example.org/',at)]);
 assert.deepEqual(b.missing.map(m=>m.field),['phone','address','hours','service','conversionLink']);
 assert.ok(b.observations.some(o=>/booking/.test(o.finding)));
});
