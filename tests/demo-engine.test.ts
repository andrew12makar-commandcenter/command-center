import assert from 'node:assert/strict';
import test from 'node:test';
import {derivePreferences,createDraft,planGeneration,planMotion,type FeedbackSample} from '../lib/demo-engine.ts';
const sample=(rating:number,visual_variant:'bold'|'editorial', issue_tags:string[]=[],notes=''):FeedbackSample=>({
  demo_id:'example-'+rating+'-'+visual_variant,user_id:'owner-1',template:'landscaping',
  visual_variant,rating,issue_tags,notes,created_at:'2026-10-09T17:00:00Z'
});
test('one low editorial rating immediately changes next suggestion to bold',()=>{
 const profile=derivePreferences([sample(1,'editorial')],'landscaping');
 assert.equal(profile.variant,'bold');
 assert.equal(profile.feedbackCount,1);
});
test('positive editorial feedback keeps editorial',()=>{
 assert.equal(derivePreferences([sample(5,'editorial')],'landscaping').variant,'editorial');
});
test('each issue tag changes the next generated design settings',()=>{
 const p=derivePreferences([sample(2,'editorial',['layout','mobile','generic_copy','navigation','missing_content'])],'landscaping');
 assert.equal(p.compact,true);assert.equal(p.conciseCopy,true);
 assert.equal(p.prominentNav,true);assert.equal(p.needsRealAssets,true);
 const draft=createDraft('Test Company','Boston',null,'landscaping',p);
 assert.equal(draft.design?.variant,'bold');
 assert.match(draft.headline,/Make room/);
});
test('recognized free-text preferences are interpreted without making up services',()=>{
 const p=derivePreferences([sample(2,'editorial',[],'Please use smaller headlines, shorter copy, and real photos')],'landscaping');
 assert.equal(p.compact,true);assert.equal(p.conciseCopy,true);assert.equal(p.needsRealAssets,true);
 assert.deepEqual(createDraft('Test',null,null,'landscaping',p).services,[]);
});
test('natural-language feedback changes composition and records negative constraints',()=>{
 const p=derivePreferences([sample(2,'editorial',[],'Use an asymmetric editorial grid with real photos and no cards')],'landscaping');
 assert.equal(p.composition,'asymmetric');
 assert.equal(p.imageTreatment,'mosaic');
 assert.deepEqual(p.negativeConstraints,['Avoid repetitive card grids']);
 const spec=planGeneration('Test Landscaper','landscaping',p);
 assert.equal(spec.composition,'asymmetric');
 assert.equal(spec.cardStyle,'flat');
});
test('new businesses receive stable cross-industry compositional variation',()=>{
 const cases=[
  createDraft('Harbor Dental','Brighton','dentist','medical').generationSpec?.composition,
  createDraft('Stone and Stem','Newton','landscaping','landscaping').generationSpec?.composition,
  createDraft('Common Thread','Boston','consulting','universal').generationSpec?.composition,
 ];
 assert.ok(new Set(cases).size>=2,JSON.stringify(cases));
});
test('current industry outweighs other categories',()=>{
 const other={...sample(1,'editorial'),template:'medical'};
 const own=sample(5,'editorial');
 assert.equal(derivePreferences([other,own],'landscaping').variant,'editorial');
});
test('project feedback takes precedence over vertical and global feedback',()=>{
 const project={...sample(2,'editorial',[],'Use a centered layout'),demo_id:'current'};
 const vertical={...sample(2,'editorial',[],'Use an asymmetric layout'),demo_id:'other-landscape'};
 const global={...sample(2,'editorial',[],'Use a bento layout'),demo_id:'other-medical',template:'medical'};
 const p=derivePreferences([global,vertical,project],'landscaping','current');
 assert.equal(p.composition,'centered');
 assert.ok(p.learnedFrom.some(x=>x.includes('Project-specific')));
});

test('empty-card and oversized-layout criticism produces a compact non-card direction',()=>{
 const feedback=[{
  demo_id:'demo-1',user_id:'user-1',template:'medical',visual_variant:'bold',rating:1,
  issue_tags:['layout','visuals'],notes:'The giant headings and empty service cards leave too much white space.',
  created_at:'2026-10-11T07:00:00.000Z'
 }];
 const result=derivePreferences(feedback,'medical','demo-1');
 assert.equal(result.compact,true);
 assert.equal(result.cardStyle,'flat');
 assert.ok(result.negativeConstraints.includes('Avoid repetitive card grids'));
});

test('every composition receives a required integrated motion system',()=>{
 for(const composition of ['split-editorial','immersive','bento','service-index','centered','asymmetric'] as const){
  const plan=planMotion(composition,composition==='immersive'?'cinematic':'calm');
  assert.equal(plan.required,true);
  assert.ok(plan.pageEntry&&plan.sectionReveal&&plan.mediaMotion&&plan.navigationMotion);
  assert.ok(plan.staggerMs>=60);
 }
});
