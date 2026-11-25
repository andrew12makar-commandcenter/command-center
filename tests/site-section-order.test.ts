import test from 'node:test';
import assert from 'node:assert/strict';
import {orderRenderableSections} from '../lib/site-section-order.ts';

test('default renderer preserves its existing sections with contact last',()=>{
 assert.deepEqual(orderRenderableSections(undefined),['services','about','process','gallery','contact']);
 assert.deepEqual(orderRenderableSections(['hero','services','trust','about','contact']),
  ['services','about','process','gallery','contact']);
});

test('valid requests reorder existing sections without inventing unsupported trust blocks',()=>{
 const available=['services','about','process','gallery','contact'] as const;
 assert.deepEqual(orderRenderableSections(['hero','about','services','contact'],available),
  ['about','services','process','gallery','contact']);
 assert.deepEqual(orderRenderableSections(['hero','contact','services','about'],available),
  ['contact','services','about','process','gallery']);
});

test('missing sections, duplicate sections and untrusted keys cannot inject content',()=>{
 assert.deepEqual(orderRenderableSections(['hero','contact','contact','__proto__','about'],
  ['services','about','contact']),['contact','about','services']);
 assert.deepEqual(orderRenderableSections(['hero','trust','proof'],['services','about','contact']),
  ['services','about','contact']);
});
