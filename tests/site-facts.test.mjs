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

// Modeled on the first live brief (a Webflow dental site, Oct 12 2026):
// services only in menu links, clinicians in the menu, qualified Saturday hours,
// JSON-LD on the homepage only, and the same crowded nav on every page.
test('live-site patterns: menu services, clinicians, qualified hours, grouped findings',()=>{
 const site='https://dental.example.org/';
 const nav=`<nav><a href="/">Home</a><a href="/about-us">About Us</a><a href="/dr-kim">Dr. Hana Kim</a><a href="/dr-ruiz">Dr. Leo Ruiz</a>
  <a href="/our-services">Our Services</a><a href="/service/family-dental-care">Family Dentistry</a><a href="/service/preventative-dental-care">Preventative Dental Care</a>
  <a href="/service/sealants">Sealants</a><a href="/service/sealants">Learn more</a><a href="/contact">Contact</a><a href="/blog">Blog</a><a href="/careers">Careers</a></nav>`;
 const ld=`<script type="application/ld+json">{"@type":"Dentist","name":"Example Dental","telephone":"617-555-0101",
  "openingHoursSpecification":[{"dayOfWeek":"Saturday","opens":"08:00","closes":"14:00"},{"dayOfWeek":"Monday","opens":"08:00","closes":"16:00"}]}</script>`;
 const home=`<html><head><meta name="viewport" content="x"><meta name="description" content="d">${ld}</head><body><header><img src="/Icons.svg" alt=""><img src="/Logo.svg" alt="">${nav}</header>
  <h1>Expert dentistry</h1><h2>Comprehensive Dental Services</h2><h2>Insurance</h2><h2>We Are Accepting New Patients</h2>
  <ul><li>Saturday 8:00 am - 2:00 pm (Open One Saturday a Month)</li></ul><img src="/iti-logo.avif" alt="ITI logo"></body></html>`;
 const svc=`<html><head><meta name="viewport" content="x"><meta name="description" content="d"></head><body><header>${nav}</header><h1>Preventative Care</h1>
  <h2>Dental Checkups</h2><h2>Dental Cleanings</h2><h2>Book a Dental Checkup Appointment Today</h2></body></html>`;
 const pages=[extractBusinessFacts(home,site,at),extractBusinessFacts(svc,site+'service/preventative-dental-care',at)];
 const b=buildWebsiteBrief('Example Dental',site,pages,new Date(at));
 const services=b.facts.serviceCandidate.map(f=>f.value);
 for(const s of ['Family Dentistry','Preventative Dental Care','Sealants','Dental Checkups','Dental Cleanings'])assert.ok(services.includes(s),s);
 assert.ok(!services.includes('Learn more'));
 assert.ok(!services.some(s=>/Book/.test(s)));
 assert.deepEqual(b.facts.staffCandidate.map(f=>f.value),['Dr. Hana Kim','Dr. Leo Ruiz']);
 assert.ok(!b.missing.some(m=>m.field==='service'));
 assert.ok(b.conflicts.some(c=>c.field==='hours'&&/One Saturday a Month/.test(String(c.values[0]))));
 const crowded=b.observations.filter(o=>o.finding==='Navigation is crowded.');
 assert.equal(crowded.length,1);assert.equal(crowded[0].page,'2 of 2 pages');
 assert.ok(!b.observations.some(o=>/structured business data/.test(o.finding)),'homepage JSON-LD covers the site');
 assert.equal(b.design.logoCandidates[0],'https://dental.example.org/Logo.svg');
 assert.deepEqual(b.design.homepageSections,['Comprehensive Dental Services','Insurance','We Are Accepting New Patients']);
 const md=briefToMarkdown(b);
 assert.match(md,/Homepage sections, in order: Comprehensive Dental Services → Insurance/);
 assert.match(md,/- Sealants _\(service-page-link, https:\/\/dental\.example\.org\/ \+ 1 more page, 2026-10-12\)_/);
});

// Modeled on the second live brief (a hibu-built plumbing site, Oct 12 2026):
// root-level service slugs, a page-builder div wrapping the whole page, and
// marketing headings/claims that were wrongly listed as services.
test('live plumbing patterns: slug services, no marketing headings, claims kept apart',()=>{
 const site='https://plumb.example.org/';
 const html=`<html><head><meta name="viewport" content="x"><meta name="description" content="d">
 <script type="application/ld+json">{"@type":"LocalBusiness","name":"Example Plumbing","logo":"https://cdn.example.org/logo.jpg"}</script></head>
 <body><div class="page"><header><img src="/gallery-maintenance.png" alt=""><nav><a href="/">Home</a><a href="/residential-plumbing">Residential Plumbing</a>
 <a href="/repiping-services">Repiping Services</a><a href="/sump-pump-repair">Sump Pump Repair</a><a href="/boiler-installation">Boiler Installation</a>
 <a href="/contact">Contact</a><a href="/blog">Blog</a></nav></header>
 <h1>Repiping</h1><h2>Repiping Services We Offer</h2><ul><li>Whole-house repiping</li><li>PEX pipe installation</li></ul>
 <h2>Signs You May Need Repiping Services</h2><ul><li>Low water pressure</li><li>Discolored or rusty water</li></ul>
 <h2>Why Choose Us</h2><ul><li>Over 150 years of combined experience</li><li>Certified technicians ensuring quality workmanship</li></ul>
 </div></body></html>`;
 const r=extractBusinessFacts(html,site+'repiping-services',at);
 const services=r.facts.filter(f=>f.field==='serviceCandidate').map(f=>f.value);
 for(const s of ['Repiping Services','Sump Pump Repair','Boiler Installation','Whole-house repiping','PEX pipe installation'])assert.ok(services.includes(s),s);
 for(const bad of ['Low water pressure','Discolored or rusty water','Signs You May Need Repiping Services','Over 150 years of combined experience','Certified technicians ensuring quality workmanship','Contact','Blog'])
  assert.ok(!services.includes(bad),bad);
 const claims=r.facts.filter(f=>f.field==='claimCandidate').map(f=>f.value);
 assert.ok(claims.includes('Over 150 years of combined experience'));
 assert.ok(claims.includes('Certified technicians ensuring quality workmanship'));
 const b=buildWebsiteBrief('Example Plumbing',site,[r],new Date(at));
 assert.equal(b.design.logoCandidates[0],'https://cdn.example.org/logo.jpg','declared logo outranks header guesses');
 assert.match(briefToMarkdown(b),/Claims the site makes \(verify before any reuse\)/);
});
