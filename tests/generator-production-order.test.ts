import test from 'node:test';
import assert from 'node:assert/strict';
import {candidateToPreferences} from '../lib/generator-loop/integration.ts';
import {defaultPreferences,createDraft,planGeneration} from '../lib/demo-engine.ts';
import {buildSiteBlueprint} from '../lib/site-blueprint.ts';
import {orderRenderableSections} from '../lib/site-section-order.ts';
import type {DesignCandidate} from '../lib/generator-loop/design-space.ts';

const base:DesignCandidate={
 composition:'bento',hierarchy:'offer-first',typography:'editorial-serif',palette:'harbor',
 imageryDensity:'balanced',ctaStructure:'paired',motionSystem:'calm',spacing:'regular',copyDepth:'standard'
};
const preview=(candidate:DesignCandidate)=>{
 const preferences=candidateToPreferences(candidate,defaultPreferences(),['review approved']);
 const draft=createDraft('Fictional Practice','Boston','dental practice','medical',preferences);
 draft.services=['Dental consultations'];
 draft.siteContent={...draft.siteContent!,about:'A fictional practice with verified test-only content about its services.',
  sourceUrl:'https://example.org/fixture',factStatus:'owner_approved'};
 return {preferences,spec:planGeneration('Fictional Practice','medical',preferences),
  blueprint:buildSiteBlueprint('medical',draft,{name:'Fictional Practice',city:'Boston',phone:'617-555-0100'})};
};

test('page-hierarchy feedback reaches the customer blueprint and real renderer section list',()=>{
 const story=preview({...base,hierarchy:'story-first'});
 assert.equal(story.preferences.sectionOrder?.[1],'about');
 assert.equal(story.spec.sectionOrder[1],'about');
 assert.equal(story.blueprint.design.sectionOrder[1],'about');
 assert.equal(orderRenderableSections(story.blueprint.design.sectionOrder,
  ['services','about','contact'])[0],'about');
 const services=preview({...base,hierarchy:'offer-first'});
 assert.equal(orderRenderableSections(services.blueprint.design.sectionOrder,
  ['services','about','contact'])[0],'services');
 const action=preview({...base,hierarchy:'action-first'});
 assert.equal(orderRenderableSections(action.blueprint.design.sectionOrder,
  ['services','about','contact'])[0],'contact');
});

test('missing proof module is not represented as an implemented renderer section',()=>{
 const attempt=preview({...base,hierarchy:'proof-first'});
 assert.equal(attempt.preferences.sectionOrder,undefined);
 assert.equal(orderRenderableSections(attempt.blueprint.design.sectionOrder,
  ['services','about','contact']).includes('contact'),true);
});

test('no-image instruction persists as minimal treatment in the customer blueprint',()=>{
 const result=preview({...base,imageryDensity:'none'});
 assert.equal(result.preferences.imageTreatment,'minimal');
 assert.equal(result.preferences.needsRealAssets,false);
 assert.equal(result.spec.imageTreatment,'minimal');
 assert.equal(result.blueprint.design.imageTreatment,'minimal');
});
