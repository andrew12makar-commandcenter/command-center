import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateSiteBlueprint} from '../lib/site-evaluation.ts';
import {buildBenchmark,generatorBenchmarks} from '../lib/generator-benchmarks.ts';

const original=()=>buildBenchmark(generatorBenchmarks[0]);

test('blueprint score is clearly labeled as preflight, not a visual or client rating',()=>{
 const result=evaluateSiteBlueprint(original());
 assert.equal(result.scoreScope,'blueprint-preflight');
 assert.deepEqual(result.unverified,['rendered visual quality','runtime performance','client acceptance']);
 assert.equal(result.accepted,true);
});

test('untrusted source and appointment URLs are hard blockers even with other contact channels',()=>{
 const base=original();
 for(const url of ['javascript:alert(1)','file:///etc/passwd','http://127.0.0.1/private','https://service.local/book',
  'https://user:password@example.org/appointments','data:text/html,payload']){
  const appointment=evaluateSiteBlueprint({...base,content:{...base.content,appointmentUrl:url}});
  assert.equal(appointment.accepted,false,url);
  assert.ok(appointment.failures.some(x=>/appointment destination/.test(x)),url);
  const source=evaluateSiteBlueprint({...base,content:{...base.content,sourceUrl:url}});
  assert.equal(source.accepted,false,url);
  assert.ok(source.failures.some(x=>/safe public source URL/.test(x)),url);
 }
});

test('ordinary verified https URLs stay eligible for preflight',()=>{
 const base=original();
 const result=evaluateSiteBlueprint({...base,content:{
  ...base.content,sourceUrl:'https://example.org/provenance',appointmentUrl:'https://example.org/book'
 }});
 assert.equal(result.accepted,true);
});
