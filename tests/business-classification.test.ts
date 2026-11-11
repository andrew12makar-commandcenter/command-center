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
 assert.equal(butcher.line,'convenience');
 assert.equal(bookstore.sector,'retail');
 assert.equal(bookstore.line,null);
 assert.equal(industryLabel(restaurant),'Food / hospitality');
 assert.equal(industryLabel(butcher),'Convenience store');
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
test('barber, salon, produce, deli, and convenience categories are not generic',()=>{
 const cases=[
  ['Classic Barber Shop','barber','barber','personal_care','Barber'],
  ['Ensueno Skin Care','skin care','salon','personal_care','Salon / skin care'],
  ["Johnny D's Fruit and Produce",'greengrocer','produce','retail','Produce / grocery'],
  ['Oliveira Deli Market','deli market','deli','food','Deli / market'],
  ['Oliveira Deli Market','butcher shop','deli','food','Deli / market'],
  ['Zisis Convenience Store','convenience store','convenience','retail','Convenience store']
 ] as const;
 for(const [name,category,line,sector,label] of cases){
  const decision=classifyIndustry(name,category);
  assert.equal(decision.line,line,name);
  assert.equal(decision.sector,sector,name);
  assert.equal(decision.template,'universal',name);
  assert.equal(decision.confidence,'category',name);
  assert.equal(industryLabel(decision),label,name);
  assert.equal(resolveDemoTemplate(name,category,'landscaping').template,'universal',name);
 }
});
test('the same five trades are name hints when no category was recorded',()=>{
 const cases=[
  ['Classic Barber Shop','barber'],
  ['Ensueno Skin Care','salon'],
  ["Johnny D's Fruit and Produce",'produce'],
  ['Oliveira Deli Market','deli'],
  ['Zisis Convenience Store','convenience'],
  ['Outluks Hair Studio','salon']
 ] as const;
 for(const [name,line] of cases){
  const decision=classifyIndustry(name,null);
  assert.equal(decision.line,line,name);
  assert.equal(decision.confidence,'name_hint',name);
  assert.match(decision.explanation,/verify/i,name);
 }
});
test('nearby words do not steal a more specific trade',()=>{
 assert.equal(classifyIndustry('The Local','amenity: bar').line,null);
 assert.equal(classifyIndustry('The Local','amenity: bar').sector,'food');
 assert.equal(classifyIndustry('Public Market','market').line,null);
 assert.equal(classifyIndustry('Public Market','market').sector,'retail');
 assert.equal(classifyIndustry('General Store','store').line,null);
 assert.equal(classifyIndustry('Brookline Booksmith',null).line,null);
 assert.equal(classifyIndustry('Boston Accounting Partners','office: accountant').sector,'professional');
 assert.equal(classifyIndustry('Beef and Turkey','shop: convenience').line,'convenience');
 assert.equal(classifyIndustry('Market Street Plumbing','plumber').sector,'trades');
});
test('research order is evidence completeness, not estimated buyer budget',()=>{
 const medical=researchPriority('Clinic','amenity: doctors','https://example.com','https://source.example','Boston');
 const unknown=researchPriority('ABC Inc',null,null,'https://source.example',null);
 assert.ok(medical>unknown);
 assert.ok(researchPriority('Plumber','plumber',null,'https://source.example','Boston')>
  researchPriority('ABC Inc',null,null,'https://source.example',null));
});
