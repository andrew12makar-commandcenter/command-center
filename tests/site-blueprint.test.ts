import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSiteBlueprint,cleanSiteContent,safeImage,safePublicUrl} from '../lib/site-blueprint.ts';
import {createDraft} from '../lib/demo-engine.ts';

const source={name:'A Brighton Dental Practice',city:'Brighton',phone:'617-555-0100',email:null};
const data=createDraft(source.name,source.city,'dentist','medical');
const img='https://example.org/uploads/practice.jpg';
const src='https://example.org/gallery/';
test('empty research has quality blockers, no fabricated photos, providers, services or bookings',()=>{
 const site=buildSiteBlueprint('medical',data,source);
 assert.equal(site.quality.previewReady,false);
 assert.equal(site.quality.publishReady,false);
 assert.equal(site.content.images.length,0);
 assert.deepEqual(site.services,[]);
 assert.equal(site.content.about,'');
 assert.equal(site.content.appointmentUrl,null);
});
test('research-only images never become approved or hero assets',()=>{
 const site=buildSiteBlueprint('medical',{
  ...data,heroImageUrl:img,siteContent:cleanSiteContent({
   about:'A researched practice description.',factStatus:'researched',
   sourceUrl:src,images:[{url:img,sourceUrl:src,role:'gallery',alt:'Clinic photo',permission:'reference_only'}]
  })
 },source);
 assert.equal(site.content.images.every(i=>i.permission==='reference_only'),true);
 assert.equal(site.quality.publishReady,false);
 assert.ok(site.quality.blockers.some(x=>x.includes('rights')));
});
test('owner-reviewed specific content and approved images produce a portable site blueprint',()=>{
 const site=buildSiteBlueprint('medical',{
  ...data,services:['Preventive dental care','Dental consultations'],
  siteContent:cleanSiteContent({
   about:'Located in Brighton and providing dental appointments.',
   sourceUrl:src,factStatus:'owner_approved',heroTreatment:'photo-led',
   appointmentUrl:'https://example.org/appointments',
   images:[{url:img,sourceUrl:src,role:'hero',alt:'Reception',permission:'approved'}]
  })
 },source);
 assert.equal(site.version,1);
 assert.equal(site.quality.previewReady,true);
 assert.equal(site.quality.publishReady,true);
 assert.equal(site.content.images[0].permission,'approved');
 assert.equal(site.content.appointmentUrl,'https://example.org/appointments');
});
test('incomplete or invalid asset provenance is rejected from the site blueprint',()=>{
 for(const u of ['file:///etc/passwd','http://localhost/','http://10.0.0.2/',
   'javascript:alert(1)','http://name:secret@example.org/']){
  assert.equal(safePublicUrl(u),null,u);
 }
 assert.equal(safeImage({url:img,sourceUrl:'file:///private',permission:'approved'}),null);
 assert.deepEqual(cleanSiteContent({
  images:[{url:img,sourceUrl:src,role:'gallery',permission:'reference_only'},
   {url:img,sourceUrl:src,role:'gallery',permission:'approved'}]
 }).images.map(x=>x.permission),['reference_only']);
});
test('legacy hero URL is treated as an unapproved reference, never licensed by implication',()=>{
 const site=buildSiteBlueprint('medical',{...data,heroImageUrl:img},source);
 assert.equal(site.content.images[0].permission,'reference_only');
 assert.equal(site.content.images[0].role,'hero');
});

test('owner-approved typography-led site can pass without photos, but never with unresolved research image rights',()=>{
 const base={...data,services:['General dental consultation']};
 const approved=cleanSiteContent({
  about:'Practice introduction reviewed with the owner.',sourceUrl:src,
  factStatus:'owner_approved',heroTreatment:'typographic'
 });
 const draft=buildSiteBlueprint('medical',{...base,siteContent:approved},source);
 assert.equal(draft.quality.publishReady,true);
 const refs=buildSiteBlueprint('medical',{...base,siteContent:cleanSiteContent({
  ...approved,images:[{url:img,sourceUrl:src,role:'gallery',permission:'reference_only'}]
 })},source);
 assert.equal(refs.quality.publishReady,false);
});
