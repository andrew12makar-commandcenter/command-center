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

const DISCLAIMER='Internal concept, not endorsed by the business';
// Example fixture copied from the generator benchmark, then marked researched.
// owner_approved is intentionally not set.
function internalConcept(){
 const site=original();
 return {
  ...site,
  internalDisclaimer:DISCLAIMER,
  noindex:true,
  content:{...site.content,factStatus:'researched'}
 };
}

test('a researched concept with the disclaimer, noindex, and sourced facts can pass',()=>{
 const site={
  ...internalConcept(),
  prices:[{amount:'$20',sourceUrl:'https://example.org/menu'}],
  hours:[{text:'Monday 9:00 AM–7:00 PM',source:'Booksy hours, accessed 2026-11-11'}],
  reviews:[{quote:'The wait was short.',author:'A. Example',source:'Booksy review'}]
 };
 assert.notEqual(site.content.factStatus,'owner_approved');
 assert.equal(site.internalDisclaimer,DISCLAIMER);
 const result=evaluateSiteBlueprint(site);
 assert.equal(result.accepted,true,JSON.stringify(result.failures));
});

test('preflight fails an internal concept that is missing the disclaimer',()=>{
 const site=internalConcept();
 const missing=evaluateSiteBlueprint({...site,internalDisclaimer:''});
 assert.equal(missing.accepted,false);
 assert.ok(missing.failures.some(x=>/disclaimer/.test(x)));
 const oldText=evaluateSiteBlueprint({
  ...site,
  internalDisclaimer:'Independent design concept. Not affiliated with or endorsed by this business.'
 });
 assert.equal(oldText.accepted,false);
 assert.ok(oldText.failures.some(x=>/Internal concept, not endorsed by the business/.test(x)));
});

test('preflight fails an internal concept that is missing noindex',()=>{
 const site=internalConcept();
 const omitted=evaluateSiteBlueprint({...site,noindex:undefined,robots:null});
 assert.equal(omitted.accepted,false);
 assert.ok(omitted.failures.some(x=>/noindex/.test(x)));
 const indexed=evaluateSiteBlueprint({...site,noindex:false,robots:'index,follow'});
 assert.equal(indexed.accepted,false);
 assert.ok(indexed.failures.some(x=>/noindex/.test(x)));
 const robots=evaluateSiteBlueprint({...site,noindex:false,robots:'noindex, nofollow'});
 assert.equal(robots.accepted,true,JSON.stringify(robots.failures));
});

test('preflight fails a price that has no source',()=>{
 const site=internalConcept();
 const structured=evaluateSiteBlueprint({...site,prices:[{amount:'$20'}]});
 assert.equal(structured.accepted,false);
 assert.ok(structured.failures.some(x=>/price/i.test(x)));
 const unknown=evaluateSiteBlueprint({...site,prices:[{amount:'$20',source:'unknown / to confirm'}]});
 assert.equal(unknown.accepted,false);
 assert.ok(unknown.failures.some(x=>/price/i.test(x)));
 const prose=evaluateSiteBlueprint({...site,description:site.description+' Listed price: $20.'});
 assert.equal(prose.accepted,false);
 assert.ok(prose.failures.some(x=>/price/i.test(x)));
 const sourced=evaluateSiteBlueprint({...site,prices:[{amount:'$20',sourceUrl:'https://example.org/menu'}]});
 assert.equal(sourced.accepted,true,JSON.stringify(sourced.failures));
});

test('preflight fails hours that have no source',()=>{
 const site=internalConcept();
 const structured=evaluateSiteBlueprint({...site,hours:[{text:'Monday 9:00 AM–7:00 PM'}]});
 assert.equal(structured.accepted,false);
 assert.ok(structured.failures.some(x=>/hours/i.test(x)));
 const prose=evaluateSiteBlueprint({
  ...site,
  content:{...site.content,about:site.content.about+' Monday 9:00 AM to 7:00 PM.'}
 });
 assert.equal(prose.accepted,false);
 assert.ok(prose.failures.some(x=>/hours/i.test(x)));
 const sourced=evaluateSiteBlueprint({
  ...site,
  hours:[{text:'Monday 9:00 AM–7:00 PM',source:'https://example.org/hours'}]
 });
 assert.equal(sourced.accepted,true,JSON.stringify(sourced.failures));
});

test('preflight fails a review missing a quote, author, or source',()=>{
 const site=internalConcept();
 const cases=[
  {quote:'',author:'A. Example',source:'Booksy review'},
  {quote:'The wait was short.',author:'',source:'Booksy review'},
  {quote:'The wait was short.',author:'A. Example',source:''},
  {quote:'The wait was short.',author:'A. Example',source:'unknown / to confirm'}
 ];
 for(const review of cases){
  const result=evaluateSiteBlueprint({...site,reviews:[review]});
  assert.equal(result.accepted,false,JSON.stringify(review));
  assert.ok(result.failures.some(x=>/quote, author, or source/.test(x)),JSON.stringify(review));
 }
 const prose=evaluateSiteBlueprint({
  ...site,
  description:site.description+' "The wait was short and the chair was comfortable."'
 });
 assert.equal(prose.accepted,false);
 assert.ok(prose.failures.some(x=>/quote, author, or source/.test(x)));
 const sourced=evaluateSiteBlueprint({
  ...site,
  reviews:[{quote:'The wait was short.',author:'A. Example',sourceUrl:'https://example.org/review'}]
 });
 assert.equal(sourced.accepted,true,JSON.stringify(sourced.failures));
});

test('preflight fails placeholder copy',()=>{
 const site=internalConcept();
 const result=evaluateSiteBlueprint({
  ...site,
  content:{...site.content,about:'Lorem ipsum dolor sit amet, this placeholder text is long enough to look like a real about statement.'}
 });
 assert.equal(result.accepted,false);
 assert.ok(result.failures.some(x=>/placeholder/.test(x)));
});

test('preflight fails generic template copy',()=>{
 const site=internalConcept();
 const result=evaluateSiteBlueprint({
  ...site,
  headline:'Expertise organized around what comes next for every visitor.'
 });
 assert.equal(result.accepted,false);
 assert.ok(result.failures.some(x=>/generic template language/.test(x)));
});
