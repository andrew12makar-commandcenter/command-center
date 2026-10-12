import test from 'node:test';
import assert from 'node:assert/strict';
import {interpretFeedback,type FeedbackEvent,type Signal} from '../lib/generator-loop/feedback-interpreter.ts';
import {applyRules,buildPreferenceModel,resolveRules} from '../lib/generator-loop/preference-model.ts';
import type {DesignCandidate} from '../lib/generator-loop/design-space.ts';

// Separate regression cases; these are NOT added to the frozen benchmark holdout.
const reviewed:DesignCandidate={
 composition:'bento',hierarchy:'story-first',typography:'editorial-serif',palette:'harbor',
 imageryDensity:'balanced',ctaStructure:'paired',motionSystem:'cinematic',spacing:'regular',copyDepth:'standard'
};
const interpret=(notes:string)=>interpretFeedback({
 id:'ex1',projectKey:'clinic-demo',industry:'healthcare',rating:null,notes,reviewed
} satisfies FeedbackEvent);
const dimension=(signals:Signal[],name:Signal['dimension'])=>signals.filter(s=>s.dimension===name);
const revision=(notes:string)=>applyRules(
 resolveRules(buildPreferenceModel(interpret(notes).signals),{projectKey:'clinic-demo',industry:'healthcare'}),reviewed
).candidate;

test('negative hierarchy feedback avoids the section explicitly rejected as first',()=>{
 const r=interpret("Don't lead with the story.");
 assert.deepEqual(dimension(r.signals,'hierarchy').map(s=>[s.op,s.value]),[['avoid','story-first']]);
 assert.notEqual(revision("Don't lead with the story.").hierarchy,'story-first');

 const strict=interpret('Never lead with the story.');
 assert.deepEqual(dimension(strict.signals,'hierarchy').map(s=>[s.op,s.value]),[['forbid','story-first']]);
});

test('complaint about buried services promotes the section instead of excluding it',()=>{
 const r=interpret('The services are buried.');
 assert.deepEqual(dimension(r.signals,'hierarchy').map(s=>[s.op,s.value]),[['prefer','offer-first']]);
 assert.equal(revision('The services are buried.').hierarchy,'offer-first');
});

test('natural language whitespace requests change the actual spacing decision',()=>{
 for(const phrase of ['Not enough whitespace.','The sections are jammed together.','Give the text space to breathe.']){
  assert.equal(dimension(interpret(phrase).signals,'spacing')[0]?.op,'more',phrase);
  assert.equal(revision(phrase).spacing,'airy',phrase);
 }
 for(const phrase of ['Make the spacing tighter.','Please tighten the spacing.']){
  assert.equal(dimension(interpret(phrase).signals,'spacing')[0]?.op,'less',phrase);
  assert.equal(revision(phrase).spacing,'compact',phrase);
 }
});

test('absolute no-image requirement differs from a request to stop adding images',()=>{
 const none=interpret('No photos please.');
 assert.deepEqual(dimension(none.signals,'imageryDensity').map(s=>[s.op,s.value]),[['require','none']]);
 assert.equal(revision('No photos please.').imageryDensity,'none');
 const less=interpret("Don't add more photos.");
 assert.deepEqual(dimension(less.signals,'imageryDensity').map(s=>s.op),['less']);
 assert.equal(revision("Don't add more photos.").imageryDensity,'accent');
});

test('keeps unsupported design concepts visible as unclear rather than inventing a rule',()=>{
 const r=interpret("Don't make every corner so rounded.");
 assert.equal(r.signals.length,0);
 assert.equal(r.statements[0]?.kind,'unclear');
 assert.equal(r.uninterpreted.length,1);
});
