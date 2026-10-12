import test from 'node:test';
import assert from 'node:assert/strict';
import {generatorBenchmarks,runBenchmarkCorpus} from '../lib/generator-benchmarks.ts';

test('benchmark corpus spans core verticals and independent holdouts',()=>{
 assert.deepEqual(new Set(generatorBenchmarks.map(x=>x.vertical)),new Set(['medical','landscaping','universal']));
 assert.ok(generatorBenchmarks.filter(x=>x.holdout).length>=2);
});

test('every benchmark passes the deterministic preflight and compositions vary',()=>{
 const results=runBenchmarkCorpus();
 assert.ok(results.every(x=>x.accepted),JSON.stringify(results,null,2));
 assert.ok(new Set(results.map(x=>x.composition)).size>=3,JSON.stringify(results,null,2));
});
