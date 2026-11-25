import assert from 'node:assert/strict';
import test from 'node:test';
import {disabledConceptMediaProvider,planConceptMediaGeneration,type ConceptMediaProvider} from '../lib/concept-media-generation.ts';

const policy={enabled:false,explicitlyApproved:false,approvalReference:'',maxImages:2,maxCostCents:0};
const briefs=['Industry-specific concept one','Industry-specific concept two'];

test('default provider gate cannot spend credits and selects a safe fallback',()=>{
 const plan=planConceptMediaGeneration({briefs,provider:disabledConceptMediaProvider,policy,staticFallbackAvailable:true});
 assert.equal(plan.status,'blocked');
 assert.equal(plan.providerId,null);
 assert.equal(plan.estimatedCostCents,0);
 assert.equal(plan.fallback,'static_concepts');
 assert.ok(plan.blockers.some(x=>x.includes('approval')));
});

test('configured provider still cannot run without explicit scoped approval',()=>{
 const provider:ConceptMediaProvider={id:'future-image-provider',kind:'image_generation',configured:true,estimateCostCents:n=>n*40};
 const plan=planConceptMediaGeneration({briefs,provider,policy:{...policy,enabled:true,maxCostCents:200},staticFallbackAvailable:false});
 assert.equal(plan.status,'blocked');
 assert.equal(plan.fallback,'typographic');
});

test('approved plan enforces image and cost ceilings before any provider call',()=>{
 const provider:ConceptMediaProvider={id:'future-licensed-provider',kind:'licensed_library',configured:true,estimateCostCents:n=>n*60};
 const approved={enabled:true,explicitlyApproved:true,approvalReference:'approval-2026-10-12',maxImages:2,maxCostCents:100};
 const over=planConceptMediaGeneration({briefs,provider,policy:approved,staticFallbackAvailable:true});
 assert.equal(over.status,'blocked');
 assert.ok(over.blockers.some(x=>x.includes('exceeds')));
 const ready=planConceptMediaGeneration({briefs,provider,policy:{...approved,maxCostCents:120},staticFallbackAvailable:true});
 assert.equal(ready.status,'ready');
 assert.equal(ready.imageCount,2);
 assert.equal(ready.estimatedCostCents,120);
});
