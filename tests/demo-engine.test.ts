import assert from 'node:assert/strict';
import test from 'node:test';
import {derivePreferences,createDraft,type FeedbackSample} from '../lib/demo-engine.ts';
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
test('current industry outweighs other categories',()=>{
 const other={...sample(1,'editorial'),template:'medical'};
 const own=sample(5,'editorial');
 assert.equal(derivePreferences([other,own],'landscaping').variant,'editorial');
});
