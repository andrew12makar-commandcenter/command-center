import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyIndustry,resolveDemoTemplate,researchPriority} from '../lib/business-classification.ts';

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
});
