import test from 'node:test';
import assert from 'node:assert/strict';
import {selectSectionPresentation,contactJourney} from '../lib/site-presentation.ts';
import {generatorBenchmarks,buildBenchmark} from '../lib/generator-benchmarks.ts';

test('clinical, outdoor and professional examples use distinct service and journey systems',()=>{
 const cases=generatorBenchmarks.filter(x=>!x.holdout).map(buildBenchmark);
 const variants=cases.map(site=>selectSectionPresentation(site));
 assert.ok(new Set(variants.map(x=>x.services)).size>=3,JSON.stringify(variants));
 assert.deepEqual(new Set(variants.map(x=>x.journey)),new Set(['care-path','quote-path','consult-path']));
});

test('the same industry supports multiple composition families, not one recycled layout',()=>{
 const source=buildBenchmark(generatorBenchmarks[0]);
 const compositions=['service-index','asymmetric','centered','bento'] as const;
 const variants=compositions.map(composition=>selectSectionPresentation({...source,design:{...source.design,composition}}).services);
 assert.ok(new Set(variants).size>=2,JSON.stringify(variants));
 const landscape=buildBenchmark(generatorBenchmarks.find(x=>x.vertical==='landscaping')!);
 const outdoor=['immersive','service-index','asymmetric'] as const;
 const landscapeVariants=outdoor.map(composition=>selectSectionPresentation({...landscape,design:{...landscape.design,composition}}).services);
 assert.ok(new Set(landscapeVariants).size>=2,JSON.stringify(landscapeVariants));
});

test('process copy is industry-specific without invented business policies or services',()=>{
 const health=contactJourney('care-path',false);
 const landscape=contactJourney('quote-path',false);
 const consulting=contactJourney('consult-path',false);
 assert.match(health[0].description,/practice/);
 assert.match(landscape[1].description,/property/);
 assert.match(consulting[1].description,/business/);
 for(const steps of [health,landscape,consulting]){
  assert.equal(steps.length,3);
  assert.ok(steps.every(x=>x.title.length<30&&x.description.length<130));
 }
 assert.notDeepEqual(health,landscape);
});

test('few services use content-respecting layouts, rather than fabricated filler cards',()=>{
 const base=buildBenchmark(generatorBenchmarks.find(x=>x.vertical==='landscaping')!);
 const sparse={...base,services:['Garden planning']};
 assert.equal(selectSectionPresentation({...sparse,design:{...base.design,composition:'immersive'}}).services,'craft-index');
});
