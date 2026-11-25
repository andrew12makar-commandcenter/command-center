import test from 'node:test';
import assert from 'node:assert/strict';
import {interpretFeedback,type FeedbackEvent} from '../lib/generator-loop/feedback-interpreter.ts';
import {applyRules,buildPreferenceModel,resolveRules} from '../lib/generator-loop/preference-model.ts';
import {composePage} from '../lib/generator-loop/compose.ts';
import type {BusinessFacts,DesignCandidate} from '../lib/generator-loop/design-space.ts';

const base:DesignCandidate={
 composition:'bento',hierarchy:'story-first',typography:'editorial-serif',palette:'harbor',
 imageryDensity:'balanced',ctaStructure:'paired',motionSystem:'calm',spacing:'regular',copyDepth:'standard'
};
const facts:BusinessFacts={
 id:'sample',name:'Fictional Studio',industry:'creative',city:'Boston',
 about:'This is a fictional company with sufficiently detailed approved information about several different services.',
 offerings:['Planning','Design','Installation','Consultation','Maintenance'],
 conversion:'contact',email:'hello@example.org',
 imagery:{generatedAllowed:true,authorizedHost:null,businessImages:[],generated:[
  {src:'/concepts/universal-1.jpg',alt:'Generated concept',disclosure:'Generated'},
  {src:'/concepts/universal-2.jpg',alt:'Generated concept',disclosure:'Generated'},
  {src:'/concepts/universal-3.jpg',alt:'Generated concept',disclosure:'Generated'}
 ]}
};
function withFeedback(notes:string){
 const event:FeedbackEvent={id:'recovery-1',projectKey:facts.id,industry:facts.industry,rating:null,notes,reviewed:base};
 const rules=resolveRules(buildPreferenceModel(interpretFeedback(event).signals),{projectKey:facts.id,industry:facts.industry});
 return composePage(facts,applyRules(rules,base).candidate);
}

test('explicit image prohibition removes even available generated imagery from the page plan',()=>{
 const original=composePage(facts,base);
 assert.ok(original.imagery.filled>0,'fixture must contain images without feedback');
 const updated=withFeedback('No photos please.');
 assert.equal(updated.candidate.imageryDensity,'none');
 assert.equal(updated.imagery.requested,0);
 assert.equal(updated.imagery.filled,0);
 assert.ok(updated.sections.every(section=>section.images.length===0));
});

test('feedback about page order changes the first content section',()=>{
 const original=composePage(facts,base);
 assert.equal(original.sections[1]?.kind,'story');
 const updated=withFeedback("Don't lead with the story.");
 assert.notEqual(updated.sections[1]?.kind,'story');
 const offer=withFeedback('The services are buried.');
 assert.equal(offer.sections[1]?.kind,'offer');
});

test('feedback about whitespace changes the composed page spacing, not only a stored label',()=>{
 assert.equal(composePage(facts,base).spacingPx,88);
 assert.equal(withFeedback('Not enough whitespace.').spacingPx,128);
 assert.equal(withFeedback('Make the spacing tighter.').spacingPx,56);
});
