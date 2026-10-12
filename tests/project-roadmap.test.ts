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
 assert.ok(seo.current);assert.equal(mcat.current?.id,'mcat-method');
 assert.ok(seo.stages.flatMap(s=>s.steps).filter(s=>s.baseline==='completed').every(s=>Boolean(s.baselineEvidence)));
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
 assert.equal(after.current?.id,baseline.id);
});
test('unrecognized database rows never alter the roadmap',()=>{
 const original=summarizeRoadmap();
 const changed=summarizeRoadmap([{step_id:'bad-unknown-id',status:'completed'}]);
 assert.deepEqual(changed,original);
 assert.equal(findStep('bad-unknown-id'),null);
});
