import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBenchmark,generatorBenchmarks,runBenchmarkCorpus} from '../lib/generator-benchmarks.ts';
import {selectSectionPresentation} from '../lib/site-presentation.ts';

test('benchmark corpus spans core verticals and independent holdouts',()=>{
 assert.deepEqual(new Set(generatorBenchmarks.map(x=>x.vertical)),new Set(['medical','landscaping','universal']));
 assert.ok(generatorBenchmarks.filter(x=>x.holdout).length>=2);
});

test('every benchmark passes the deterministic preflight and compositions vary',()=>{
 const results=runBenchmarkCorpus();
 assert.ok(results.every(x=>x.accepted),JSON.stringify(results,null,2));
 assert.ok(new Set(results.map(x=>x.composition)).size>=3,JSON.stringify(results,null,2));
});
test('trade holdout gets a quote path without landscaping presentation',()=>{
 const fixture=generatorBenchmarks.find(x=>x.id==='holdout-plumbing')!;
 const site=buildBenchmark(fixture);
 const presentation=selectSectionPresentation(site);
 assert.equal(site.template,'universal');
 assert.equal(site.primaryAction,'Request an estimate');
 assert.equal(site.design.motion,'precise');
 assert.equal(presentation.services,'craft-index');
 assert.equal(presentation.journey,'estimate-path');
 assert.equal(presentation.gallery,'quiet');
 assert.ok(!site.narrative.servicesHeading.toLowerCase().includes('outdoor'));
});
