import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveResearchInsights,groupResearchInsights} from '../lib/research-intelligence.ts';

test('live page evidence becomes sourced module candidates without approval',()=>{
 const pages=[
  {url:'https://practice.example/services',title:'Dental Services',description:'',
   headings:['Restorative Dentistry','Oral Conscious Sedation','Financing Options'],
   excerpts:['The practice describes its available care and appointment process.']},
  {url:'https://practice.example/about-team',title:'Meet the Team',description:'',
   headings:['Meet Dr. Example','Our Team'],excerpts:['A source paragraph about the team.']},
  {url:'https://practice.example/gallery',title:'Office Gallery',description:'',
   headings:['Office Gallery'],excerpts:['A source gallery description.']},
  {url:'https://practice.example/appointments',title:'Request an Appointment',description:'',
   headings:['Schedule an Appointment'],excerpts:['A source booking description.']}
 ];
 const insights=deriveResearchInsights(pages);
 const groups=groupResearchInsights(insights);
 assert.ok((groups.service??[]).some(x=>x.label==='Restorative Dentistry'));
 assert.ok((groups.team??[]).some(x=>/Dr\. Example/.test(x.label)));
 assert.ok((groups.gallery??[]).length>0);
 assert.ok((groups.booking??[]).length>0);
 assert.ok(insights.every(x=>x.status==='candidate'));
 assert.ok(insights.every(x=>x.sourceUrl.startsWith('https://practice.example/')));
});

test('sentences and people are not misclassified as services',()=>{
 const insights=deriveResearchInsights([{url:'https://practice.example/services',title:'Range of Services',description:'',
  headings:['We strive to exceed your expectations.','Dr. Maria Example','Give back a smile','Cosmetic Dentistry','Sedation Dentistry'],excerpts:[]}]);
 const services=insights.filter(x=>x.kind==='service').map(x=>x.label);
 assert.deepEqual(services,['Cosmetic Dentistry','Sedation Dentistry']);
});

test('generic navigation headings do not become fake services',()=>{
 const insights=deriveResearchInsights([{url:'https://company.example/services',title:'Services',description:'',
  headings:['Home','Learn More','Contact Us','Our Services'],excerpts:[]}]);
 assert.deepEqual(insights.filter(x=>x.kind==='service'),[]);
});
