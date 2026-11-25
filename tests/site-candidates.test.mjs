import test from 'node:test';
import assert from 'node:assert/strict';
import {attr,decodeEntities,extractCandidates,robotsAllows} from '../scripts/site-candidates.mjs';

const site='https://practice.example.org/';
const html=`<!doctype html><html><head><title>Practice &amp; Team</title>
<meta name="description" content="Brighton-area clinic information." /></head>
<body><header><a href="/services/">Our Services</a><a href="/our-office/">Office Photos</a></header>
<h1>Our Team</h1><h3>Meet the Dentists</h3>
<p>Our team welcomes neighbors in Brighton and provides a range of dental services. Details must be reviewed before use.</p>
<img src="/wp-content/uploads/office.jpg" alt="Reception room" />
<img data-src="/wp-content/uploads/team.jpg" alt="Our team"/>
<a href="https://external.example.com/">Offsite</a>
</body></html>`;
test('metadata, headings, images and internal links become only research references',()=>{
 const r=extractCandidates(html,site);
 assert.equal(r.title,'Practice & Team');
 assert.equal(r.description,'Brighton-area clinic information.');
 assert.equal(r.headings[0].text,'Our Team');
 assert.equal(r.images.length,2);
 assert.equal(r.images[0].permission,'reference_only');
 assert.equal(r.images[0].sourceUrl,site);
 assert.ok(r.links.includes('https://practice.example.org/services/'));
 assert.equal(r.links.some(url=>url.includes('external.example.com')),false);
});
test('untrusted schemes, private ports, and malformed images cannot become discovery links',()=>{
 const raw=`<a href="javascript:alert(1)">Bad</a><a href="http://localhost:3000/services">Local</a>
 <img src="file:///private/logo.png"><img src="http://127.0.0.1/photo.jpg">`;
 const v=extractCandidates(raw,site);
 assert.equal(v.images.length,0);
 assert.equal(v.links.length,0);
});
test('robots disallow rules are honored for relevant pages',()=>{
 const robots='User-agent: *\nDisallow: /private/\nDisallow: /admin\n';
 assert.equal(robotsAllows(robots,'/private/staff'),false);
 assert.equal(robotsAllows(robots,'/services'),true);
 assert.equal(robotsAllows('','/services'),true);
});
test('safe entity decoding and attribute reading never execute HTML',()=>{
 assert.equal(decodeEntities('R&amp;D'),'R&D');
 assert.equal(attr('<img src="https://example.org/x.jpg" alt="A &amp; B"/>','alt'),'A & B');
});

test('WordPress lazy galleries and og:image yield unapproved references, never embedded assets',()=>{
 const html=`<meta property="og:image" content="/static/social-preview.jpg">
 <img src="data:image/gif;base64,AAAA" data-src="/gallery/room.webp" alt="Reception"/>
 <img srcset="/gallery/staff-large.webp 2x, /gallery/staff.webp 1x" alt="Team"/>`;
 const result=extractCandidates(html,site);
 assert.equal(result.images.length,3);
 assert.ok(result.images.some(i=>i.url.endsWith('/gallery/room.webp')));
 assert.ok(result.images.some(i=>i.url.endsWith('/gallery/staff-large.webp')));
 assert.ok(result.images.some(i=>i.url.endsWith('/static/social-preview.jpg')));
 assert.ok(result.images.every(i=>i.permission==='reference_only'));
});
