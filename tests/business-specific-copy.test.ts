import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServiceSpecificCopy} from '../lib/business-specific-copy.ts';
import {buildBenchmark,generatorBenchmarks} from '../lib/generator-benchmarks.ts';

test('real listed services replace lengthy generic generated headlines',()=>{
 const healthcare=buildBenchmark(generatorBenchmarks.find(x=>x.id==='holdout-vet')!);
 assert.equal(healthcare.headline,'Wellness exams & Diagnostic visits.');
 assert.ok(!/clear information|more confident/.test(healthcare.headline.toLowerCase()));
 assert.ok(!/verified fixture/.test(healthcare.description));
 assert.match(healthcare.description,/Watertown/);
 const professional=buildBenchmark(generatorBenchmarks.find(x=>x.id==='service-core')!);
 assert.equal(professional.headline,'Strategy sessions & Project delivery.');
});

test('explicitly authored business headline and description remain unchanged',()=>{
 const text=buildServiceSpecificCopy({
  headline:'A precise experience for your entire team.',
  description:'Consultations for clients working on complex building and design projects.',
  services:['Strategy sessions','Project delivery'],city:'Boston',businessName:'The Studio',
  factsReviewed:true
 });
 assert.equal(text.changed,false);
 assert.equal(text.headline,'A precise experience for your entire team.');
 assert.equal(text.description,'Consultations for clients working on complex building and design projects.');
});

test('generic placeholder is never replaced by an invented company achievement',()=>{
 const text=buildServiceSpecificCopy({headline:'Care starts with a clearer first step.',
  description:'Find the information you need before reaching out. Clinical services and provider details require confirmation.',
  services:['Wellness exams','Senior pet care'],city:'Watertown',businessName:'Test Veterinary Clinic',
  factsReviewed:false});
 assert.equal(text.headline,'Wellness exams & Senior pet care.');
 assert.match(text.description,/pending review/);
 assert.doesNotMatch(text.description,/award|best|five-star|trusted by|since 19/i);
});

test('unreviewed or missing services cannot invent specific business offerings',()=>{
 const text=buildServiceSpecificCopy({headline:'Care, made clearer.',
  description:'Meet the business and explore its services. Details require confirmation.',
  services:[],city:'Boston',businessName:'No Services',factsReviewed:false});
 assert.equal(text.changed,false);
});
