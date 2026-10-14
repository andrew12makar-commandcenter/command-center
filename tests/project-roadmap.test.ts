import assert from 'node:assert/strict';
import test from 'node:test';
import {ROADMAP,allStepIds,findStep,summarizeRoadmap} from '../lib/project-roadmap.ts';
test('every roadmap checkpoint has a unique stable identifier',()=>{
 const ids=ROADMAP.flatMap(p=>p.stages.flatMap(s=>s.steps.map(x=>x.id)));
 assert.equal(ids.length,allStepIds.size);
 assert.ok(ids.length>=25);
 assert.ok(ids.every(id=>Boolean(findStep(id))));
});
test('baseline evidence is explicit and two ventures are not conflated',()=>{
 const [seo,mcat]=summarizeRoadmap();
 assert.equal(seo.id,'seo');assert.equal(mcat.id,'mcat');
 assert.ok(seo.completed>0);assert.equal(mcat.completed,0);
 assert.equal(seo.current?.id,'seo-open-data-discovery');assert.equal(seo.current?.status,'in_progress');
 assert.equal(seo.next?.id,'seo-identity-resolution');
 assert.equal(seo.stages.flatMap(s=>s.steps).find(s=>s.id==='seo-intelligence-brief')?.status,'completed');
 assert.equal(seo.stages.flatMap(s=>s.steps).find(s=>s.id==='seo-browser-qa')?.status,'completed');assert.equal(mcat.current?.id,'mcat-method');
 assert.ok(seo.stages.flatMap(s=>s.steps).filter(s=>s.baseline==='completed').every(s=>Boolean(s.baselineEvidence)));
 const website=seo.stages.find(stage=>stage.id==='websites');
 assert.equal(website?.steps.find(s=>s.id==='seo-site-facts')?.status,'completed');
 assert.equal(website?.steps.find(s=>s.id==='seo-site-ai-media')?.status,'blocked');
});
test('confirmed step immediately advances current work without altering other venture',()=>{
 const [before,mcatBefore]=summarizeRoadmap();
 const id=before.current?.id;
 assert.ok(id);
 const [after,mcatAfter]=summarizeRoadmap([{step_id:id,status:'completed',evidence_note:'Live reviewed evidence',updated_at:'2026-10-11T00:00:00Z'}]);
 assert.equal(after.completed,before.completed+1);
 assert.notEqual(after.current?.id,id);
 assert.equal(mcatAfter.completed,mcatBefore.completed);
 assert.equal(after.stages.flatMap(x=>x.steps).find(x=>x.id===id)?.evidence,'Live reviewed evidence');
});
test('reopening a completed baseline decreases progress and gives it next action',()=>{
 const [before]=summarizeRoadmap();
 const baseline=before.stages.flatMap(s=>s.steps).find(s=>s.baseline==='completed');
 assert.ok(baseline);
 const [after]=summarizeRoadmap([{step_id:baseline.id,status:'pending',evidence_note:'Needs revalidation'}]);
 assert.equal(after.completed,before.completed-1);
 assert.equal(after.stages.flatMap(x=>x.steps).find(x=>x.id===baseline.id)?.status,'pending');
});
test('unrecognized database rows never alter the roadmap',()=>{
 const original=summarizeRoadmap();
 const changed=summarizeRoadmap([{step_id:'bad-unknown-id',status:'completed'}]);
 assert.deepEqual(changed,original);
 assert.equal(findStep('bad-unknown-id'),null);
});

test('blockers are visible, excluded from next action, and do not count as completed',()=>{
 const [original]=summarizeRoadmap();
 const [changed]=summarizeRoadmap([{step_id:'seo-open-data-discovery',status:'blocked',evidence_note:'Waiting for review'}]);
 // The next ACTIVE milestone takes over; a blocked item is never current.
 assert.equal(changed.current?.id,'seo-site-source-media');
 assert.equal(changed.current?.status,'in_progress');
 assert.ok(changed.blocked.some(item=>item.id==='seo-open-data-discovery'));
 assert.equal(changed.completed,original.completed);
});
test('explicit in-progress milestone takes priority over code baseline',()=>{
 const [p]=summarizeRoadmap([{step_id:'seo-audit-live',status:'in_progress',evidence_note:'Testing audits',updated_at:'2026-10-12T00:00:00Z'}]);
 assert.equal(p.current?.id,'seo-audit-live');
 assert.equal(p.next?.id,'seo-identity-resolution');
});
