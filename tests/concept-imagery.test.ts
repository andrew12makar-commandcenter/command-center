import test from 'node:test';
import assert from 'node:assert/strict';
import {getGeneratedConceptSet,getMatchedConceptSet,getPrivatePreviewConcept} from '../lib/concept-imagery.ts';

test('each vertical has a clearly disclosed local preview concept',()=>{
 for(const template of ['medical','landscaping','universal'] as const){
  const set=getGeneratedConceptSet(template);
  const images=[set.hero,set.editorial,set.detail];
  assert.equal(new Set(images.map(x=>x.src)).size,3);
  for(const image of images){
   assert.match(image.src,/^\/concepts\/[a-z0-9-]+\.jpg$/);
   assert.match(image.disclosure,/AI-generated concept visual\./);
   assert.match(image.disclosure,/Not a photograph of the business\./);
  }
 }
});

test('concept imagery is not shaped like an approved blueprint asset',()=>{
 const image=getPrivatePreviewConcept('medical') as Record<string,unknown>;
 assert.equal('permission' in image,false);
 assert.equal('sourceUrl' in image,false);
});

test('concept photo choice is grounded in the business subtype, not just the template',()=>{
 assert.equal(getMatchedConceptSet('medical','Veterinary clinic',['Senior pet care'],'Charles River Veterinary Care'),undefined);
 assert.equal(getMatchedConceptSet('medical','Family medicine',['Primary care','Screenings'],'Family Clinic'),undefined);
 assert.match(getMatchedConceptSet('medical','Dentist',['Preventive dentistry'],'Dental Studio')?.hero.alt??'',/dental/i);
 assert.equal(getMatchedConceptSet('landscaping','Plumbing and heating',['Water heater repairs'],'Heating Contractor'),undefined);
 assert.ok(getMatchedConceptSet('landscaping','Landscape design',['Hardscaping'],'Stone & Stem'));
 assert.equal(getMatchedConceptSet('universal','Bookstore',['Book events'],'Bookshop'),undefined);
 assert.ok(getMatchedConceptSet('universal','Business consulting',['Strategy'],'Consulting Studio'));
 assert.equal(getMatchedConceptSet('medical',null,[],'Unspecified Practice'),undefined);
});

test('barber, salon, produce, deli, and convenience get a trade mark, not a dental or studio photo',()=>{
 const cases=[
  ['barber',['Haircut'],'Classic Barber Shop',/barber/i],
  ['skin care',['Facial'],'Ensueno Skin Care',/salon/i],
  ['greengrocer',['Fresh fruit'],"Johnny D's Fruit and Produce",/produce/i],
  ['deli market',['Butcher counter'],'Oliveira Deli Market',/deli/i],
  ['convenience store',[],'Zisis Convenience Store',/convenience/i]
 ] as const;
 const banned=/\/concepts\/(?:medical|landscaping|universal)-/;
 for(const [category,services,name,alt] of cases){
  const set=getMatchedConceptSet('universal',category,services,name);
  assert.ok(set,name);
  for(const image of [set.hero,set.editorial,set.detail]){
   assert.match(image.alt,alt,name);
   assert.match(image.disclosure,/Not a photograph of the business/);
   assert.match(image.src,/^data:image\/svg\+xml,/);
   assert.doesNotMatch(image.src,banned,name);
  }
 }
 assert.equal(getMatchedConceptSet('universal','restaurant',['Dinner'],'Corner Hearth Kitchen'),undefined);
 assert.equal(getMatchedConceptSet('medical','barber',['Haircut'],'Classic Barber Shop')?.hero.src.startsWith('data:image/svg+xml,'),true);
});
