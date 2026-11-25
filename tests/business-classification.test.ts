import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyIndustry,industryLabel,resolveDemoTemplate,researchPriority} from '../lib/business-classification.ts';

test('imported doctor office cannot use landscaping default',()=>{
 const result=resolveDemoTemplate('Brookline Physician Group','amenity: doctors','landscaping');
 assert.equal(result.template,'medical');
 assert.equal(result.corrected,true);
 assert.equal(result.decision.confidence,'category');
});
test('a dental practice uses medical even in a mixed industry batch',()=>{
 const businesses=[
  {name:'Brookline Smiles',category:'amenity: dentist'},
  {name:'Zscapes Outdoor Services',category:'craft: landscaper'},
  {name:'Local Restaurant',category:'amenity: restaurant'}
 ];
 assert.deepEqual(businesses.map(b=>resolveDemoTemplate(b.name,b.category,'auto').template),
  ['medical','landscaping','universal']);
});
test('food and retail records stay on universal storage templates but receive distinct vertical classifications',()=>{
 const restaurant=classifyIndustry('Nakhon','amenity: restaurant');
 const butcher=classifyIndustry('Beef and Turkey','shop: convenience');
 const bookstore=classifyIndustry('Brookline Booksmith',null);
 assert.equal(restaurant.template,'universal');assert.equal(restaurant.sector,'food');
 assert.equal(butcher.template,'universal');assert.equal(butcher.sector,'retail');
 assert.equal(bookstore.sector,'retail');
 assert.equal(industryLabel(restaurant),'Food / hospitality');
 assert.equal(industryLabel(butcher),'Retail / storefront');
});
test('trades keep their sector identity without inheriting landscaping templates',()=>{
 const plumber=classifyIndustry('Fenway Flow Plumbing','plumber');
 const contractor=classifyIndustry('Allston Contractors','general contractor');
 assert.equal(plumber.template,'universal');
 assert.equal(plumber.sector,'trades');
 assert.equal(industryLabel(plumber),'Contractor / home service');
 assert.equal(contractor.template,'universal');
 assert.equal(contractor.sector,'trades');
 assert.equal(resolveDemoTemplate('Fenway Flow Plumbing','plumber','landscaping').template,'universal');
 assert.equal(classifyIndustry('Green Urb Gardens','landscaping').template,'landscaping');
});
test('name can suggest medical without pretending verification',()=>{
 const decision=classifyIndustry('Smith Family Medicine',null);
 assert.equal(decision.template,'medical');
 assert.equal(decision.confidence,'name_hint');
});
test('documented general industry cannot be overwritten by landscaping default',()=>{
 const result=resolveDemoTemplate('Boston Accounting Partners','office: accountant','landscaping');
 assert.equal(result.template,'universal');
 assert.equal(result.corrected,true);
});
test('unclassified businesses fall back to safe general layout for auto mode',()=>{
 assert.equal(resolveDemoTemplate('ABC Inc',null,'auto').template,'universal');
 assert.equal(classifyIndustry('ABC Inc','Certified business').confidence,'unknown');
});
test('unclassified business allows deliberate manual template selection',()=>{
 assert.equal(resolveDemoTemplate('ABC Inc',null,'medical').template,'medical');
});
test('research order is evidence completeness, not estimated buyer budget',()=>{
 const medical=researchPriority('Clinic','amenity: doctors','https://example.com','https://source.example','Boston');
 const unknown=researchPriority('ABC Inc',null,null,'https://source.example',null);
 assert.ok(medical>unknown);
 assert.ok(researchPriority('Plumber','plumber',null,'https://source.example','Boston')>
  researchPriority('ABC Inc',null,null,'https://source.example',null));
});
