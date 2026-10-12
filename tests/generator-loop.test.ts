import test from 'node:test';
import assert from 'node:assert/strict';
import {stableHash,memoryCache} from '../lib/generator-loop/stable-hash.ts';
import {deriveTraits,traitDefaults,type BusinessFacts,type BusinessTraits,type DesignCandidate} from '../lib/generator-loop/design-space.ts';
import {interpretFeedback,type FeedbackEvent,type Signal} from '../lib/generator-loop/feedback-interpreter.ts';
import {applyRules,buildPreferenceModel,constraintFromRevert,fromRuleRow,hardViolations,resolveRules,toRuleRow} from '../lib/generator-loop/preference-model.ts';
import {composePage,permittedBusinessImages} from '../lib/generator-loop/compose.ts';
import {renderPlanHtml} from '../lib/generator-loop/render.ts';
import {contrastRatio,evaluatePlan,type Evaluation} from '../lib/generator-loop/evaluate.ts';
import {runLoop,emptyLedger} from '../lib/generator-loop/loop.ts';
import {runFeedbackBenchmark,satisfies} from '../lib/generator-loop/benchmark.ts';
import {auditExportLine,exportDataset,redactText} from '../lib/generator-loop/dataset.ts';
import {candidateFromProduction,candidateToPreferences,evaluationToRow,feedbackRowToEvent,motionHints,rowsToRules,rulesToRows} from '../lib/generator-loop/integration.ts';
import {defaultPreferences} from '../lib/demo-engine.ts';
import {corpus} from '../benchmarks/fictional-businesses.ts';

const reviewed:DesignCandidate={composition:'bento',hierarchy:'story-first',typography:'editorial-serif',palette:'harbor',
 imageryDensity:'balanced',ctaStructure:'paired',motionSystem:'cinematic',spacing:'regular',copyDepth:'standard'};
const ev=(notes:string,extra:Partial<FeedbackEvent>={}):FeedbackEvent=>({id:'e1',projectKey:'p1',industry:'restaurant',rating:2,notes,reviewed,...extra});
const find=(s:Signal[],dimension:string)=>s.filter(x=>x.dimension===dimension);
const gen=(set:string)=>[1,2,3].map(i=>({src:`/concepts/${set}-${i}.jpg`,alt:`Generated concept ${i}`,disclosure:'AI-generated concept visual. Not a photograph of the business.'}));
const facts=(over:Partial<BusinessFacts>={}):BusinessFacts=>({id:'t1',name:'Test Studio',industry:'creative',city:'Boston',
 about:'A small fictional studio used for tests. It has two people and a short list of services.',offerings:['Brand identity','Packaging'],
 conversion:'contact',email:'hi@test.example',imagery:{generatedAllowed:true,authorizedHost:null,businessImages:[],generated:gen('universal')},...over});
const traits=(over:Partial<BusinessTraits>={}):BusinessTraits=>({trust:'standard',conversion:'consultation',imagery:'scarce',complexity:'moderate',
 locality:'remote',urgent:false,audience:'general',contentDepth:'moderate',visualProof:false,...over});
const sig=(projectKey:string,industry:string,over:Partial<Signal>={}):Signal=>({eventId:projectKey+'#0',scope:'project',scopeKey:projectKey,projectKey,industry,
 traits:null,dimension:'imageryDensity',op:'less',value:null,prior:'balanced',strength:.6,polarity:'negative',evidence:'too many photos',statementIndex:0,...over});

test('stable hash ignores key order and changes with content',()=>{
 assert.equal(stableHash({a:1,b:[1,{c:2,d:3}]}),stableHash({b:[1,{d:3,c:2}],a:1}));
 assert.notEqual(stableHash({a:1}),stableHash({a:2}));
 assert.match(stableHash('x'),/^[0-9a-f]{16}$/);
});

test('traits come from facts: trust, locality, imagery amount and quality, complexity',()=>{
 const t=deriveTraits(facts({team:[{name:'Dr. Ana Ruiz, DMD',role:'Dentist'}],proof:['Board certified'],serviceArea:['Boston'],
  imagery:{generatedAllowed:false,authorizedHost:'test.example',generated:[],businessImages:[
   {url:'https://test.example/a.jpg',alt:'Finished work one',role:'hero'},{url:'https://test.example/b.jpg',alt:'Finished work two',role:'gallery'},
   {url:'https://test.example/c.jpg',alt:'Blurry phone photo',role:'gallery',quality:'low'}]}}));
 assert.equal(t.trust,'high');assert.equal(t.locality,'on-site');assert.equal(t.imagery,'adequate');assert.equal(t.complexity,'simple');
 assert.equal(deriveTraits(facts()).imagery,'scarce');
 assert.equal(deriveTraits(facts({imagery:{generatedAllowed:false,authorizedHost:null,businessImages:[],generated:[]}})).imagery,'none');
});

test('interpreter keeps exact statements and classifies praise, criticism, requirement and unclear',()=>{
 const r=interpretFeedback(ev('Love the serif headings. Too many photos! The call button must always stay pinned. The owner is lovely to work with.'));
 assert.deepEqual(r.statements.map(s=>s.text),['Love the serif headings.','Too many photos!','The call button must always stay pinned.','The owner is lovely to work with.']);
 assert.deepEqual(r.statements.map(s=>s.kind),['praise','criticism','requirement','unclear']);
 assert.equal(find(r.signals,'ctaStructure')[0]?.op,'require');
});

test('interpreter reads direction for ordinal decisions and records the prior value',()=>{
 const {signals}=interpretFeedback(ev('Too many photos, and the animations feel slow and distracting.'));
 assert.deepEqual(find(signals,'imageryDensity').map(s=>[s.op,s.prior]),[['less','balanced']]);
 assert.deepEqual(find(signals,'motionSystem').map(s=>[s.op,s.prior]),[['less','cinematic']]);
 assert.equal(find(interpretFeedback(ev("It doesn't need more photos.")).signals,'imageryDensity')[0]?.op,'less');
});

test('interpreter separates praise from complaints and resolves page-order requests',()=>{
 const {signals}=interpretFeedback(ev('Love the serif headings, but the card grid looks generic.'));
 assert.deepEqual(find(signals,'typography').map(s=>[s.op,s.value,s.polarity]),[['keep','editorial-serif','positive']]);
 assert.deepEqual(find(signals,'composition').map(s=>[s.op,s.value]),[['avoid','bento']]);
 assert.deepEqual(find(interpretFeedback(ev('Cards everywhere, it looks like a template.')).signals,'composition').map(s=>[s.op,s.scope]),[['avoid','project']]);
 assert.deepEqual(find(interpretFeedback(ev('The menu should come first, before the story.')).signals,'hierarchy').map(s=>s.value),['offer-first']);
});

test('interpreter detects project, trait, industry and global scope',()=>{
 assert.deepEqual(interpretFeedback(ev('Across all sites, never use a dark background.')).signals.map(s=>[s.scope,s.op,s.value]),[['global','forbid','graphite']]);
 assert.equal(interpretFeedback(ev('For practices like this, credentials should be at the top.')).signals[0]?.scope,'industry');
 const t=interpretFeedback(ev('For businesses that handle emergencies, the call button should be sticky.')).signals;
 assert.deepEqual(t.map(s=>[s.scope,s.scopeKey,s.value]),[['trait','urgent=true','sticky-bar']]);
});

test('rating-only feedback is weak and never invents a direction',()=>{
 assert.ok(interpretFeedback(ev('',{rating:5})).signals.every(s=>s.op==='keep'&&s.strength<=.2));
 const bad=interpretFeedback(ev('',{rating:1}));assert.equal(bad.signals.length,0);assert.equal(bad.ratingOnly,true);
});

test('repeated feedback is induced into industry rules; one project is not a pattern',()=>{
 const m=buildPreferenceModel([sig('a','trades'),sig('b','trades'),sig('c','legal')]);
 assert.ok(m.rules.some(r=>r.scope==='industry'&&r.scopeKey==='trades'&&r.op==='less'&&r.induced));
 assert.ok(!m.rules.some(r=>r.scope==='industry'&&r.scopeKey==='legal'));
 assert.ok(m.rules.some(r=>(r.scope==='global'||r.scope==='trait')&&r.op==='less'));
 const praise=buildPreferenceModel([sig('a','x',{op:'keep',value:'editorial-serif',dimension:'typography'}),sig('b','y',{op:'keep',value:'editorial-serif',dimension:'typography'})]);
 assert.ok(!praise.rules.some(r=>r.scope==='global'||r.scope==='trait'),'praise needs three industries');
});

test('contradicting feedback is separated by a trait instead of being thrown away',()=>{
 const visual=traits({visualProof:true}),plain=traits({visualProof:false,trust:'high'});
 const m=buildPreferenceModel([
  sig('r1','restaurant',{op:'more',traits:visual}),sig('b1','beauty',{op:'more',traits:visual}),
  sig('t1','trades',{op:'less',traits:plain}),sig('h1','healthcare',{op:'less',traits:plain})]);
 const more=m.rules.find(r=>r.scope==='trait'&&r.op==='more')!,less=m.rules.find(r=>r.scope==='trait'&&r.op==='less')!;
 assert.ok(more&&less,JSON.stringify(m.rules.map(r=>[r.scope,r.op,r.when])));
 assert.ok(Object.entries(more.when!).every(([k,v])=>visual[k as keyof BusinessTraits]===v&&plain[k as keyof BusinessTraits]!==v));
 assert.equal(resolveRules(m,{projectKey:'z',industry:'retail',traits:visual}).rules.filter(r=>r.dimension==='imageryDensity').map(r=>r.op).join(),'more');
 assert.equal(resolveRules(m,{projectKey:'z',industry:'legal',traits:plain}).rules.filter(r=>r.dimension==='imageryDensity').map(r=>r.op).join(),'less');
});

test('project rules shadow conflicting broader rules, and hard rules gate candidates',()=>{
 const m=buildPreferenceModel([sig('p1','x',{scope:'global',scopeKey:'*',dimension:'palette',op:'prefer',value:'graphite'}),
  sig('p1','x',{dimension:'palette',op:'prefer',value:'forest'}),
  sig('p1','x',{scope:'global',scopeKey:'*',dimension:'spacing',op:'forbid',value:'airy'})]);
 const active=resolveRules(m,{projectKey:'p1',industry:'x'});
 assert.deepEqual(active.rules.filter(r=>r.dimension==='palette').map(r=>r.value),['forest']);
 assert.equal(active.shadowed.length,1);
 const {candidate}=applyRules(active,{...reviewed,spacing:'airy'});
 assert.equal(candidate.palette,'forest');assert.notEqual(candidate.spacing,'airy');
 assert.equal(hardViolations(active,{...reviewed,spacing:'airy'}).length,1);
});

test('rules round-trip through design_preference_rules, including trait conditions',()=>{
 const t=traits({trust:'high'});
 const m=buildPreferenceModel([sig('a','x',{traits:t}),sig('b','y',{traits:t}),
  sig('c','z',{scope:'trait',condition:{urgent:true},scopeKey:'urgent=true',dimension:'ctaStructure',op:'prefer',value:'sticky-bar'})]);
 const rows=rulesToRows(m,{organizationId:'o',userId:'u'});
 for(const row of rows){
  assert.ok(['global','vertical','project'].includes(row.scope));assert.ok(['prefer','avoid','require'].includes(row.rule_kind));
  assert.ok(row.instruction.length<=500);
 }
 assert.deepEqual(rowsToRules(rows).map(r=>[r.id,r.scope,r.when]),m.rules.map(r=>[r.id,r.scope,r.when]));
 assert.equal(fromRuleRow({scope:'global',scope_key:'*',instruction:'cc-rule/v2 palette prefer neon w=1 explicit src=feedback when=- ev='}),null);
 assert.deepEqual(rowsToRules([{scope:'global',scope_key:'*',instruction:'Use bigger photos'}]),[]);
 void toRuleRow;
});

test('business images need a matching authorization; low-quality and foreign images are withheld',()=>{
 const imgs=[{url:'https://studio.example/a.jpg',alt:'Finished packaging work',role:'hero' as const},
  {url:'https://cdn.elsewhere.example/b.jpg',alt:'Unrelated stock photo',role:'gallery' as const},
  {url:'https://studio.example/c.jpg',alt:'Out of focus shot',role:'gallery' as const,quality:'low' as const}];
 assert.equal(permittedBusinessImages(facts({imagery:{generatedAllowed:true,authorizedHost:null,businessImages:imgs,generated:[]}})).ok.length,0);
 const covered=permittedBusinessImages(facts({imagery:{generatedAllowed:true,authorizedHost:'studio.example',businessImages:imgs,generated:[]}}));
 assert.deepEqual(covered.ok.map(i=>i.url),['https://studio.example/a.jpg']);
 assert.deepEqual(covered.rejected.map(r=>r.reason.split(' ')[0]),['host','marked']);
 const plan=composePage(facts(),{...reviewed,imageryDensity:'balanced',composition:'immersive'});
 assert.ok(plan.sections.flatMap(s=>s.images).every(i=>i.origin==='generated'&&i.disclosure));
});

test('composer omits sections without facts and never branches on the industry label',()=>{
 const plan=composePage(facts(),reviewed);
 assert.ok(!plan.sections.some(s=>['team','proof','process','faq','visit','area'].includes(s.kind)));
 assert.deepEqual(composePage(facts({industry:'creative'}),reviewed),composePage(facts({industry:'unusual'}),reviewed));
 assert.deepEqual(traitDefaults(deriveTraits(facts({industry:'legal'})),'t1'),traitDefaults(deriveTraits(facts({industry:'restaurant'})),'t1'));
});

test('evaluator separates gates from structural metrics and catches real defects',()=>{
 const f=facts({conversionUrl:'https://test.example/contact',offerings:['Brand identity','Packaging','Signage','Menus','Labels','Wayfinding'],
  process:['Brief','Sketches','Final files'],team:[{name:'Ana Ruiz',role:'Designer'},{name:'Ben Cole',role:'Designer'},{name:'Cy Park',role:'Printer'}]});
 const plan=composePage(f,{...reviewed,composition:'bento'});
 const ok=evaluatePlan(f,plan,renderPlanHtml(plan,f.name));
 assert.deepEqual(ok.gates,[]);
 assert.ok(ok.checks.some(c=>c.id==='motion.coverage'&&c.pass));
 assert.ok(ok.metrics.cardRepetition<1,'bento repeats card grids');
 const lean=composePage(f,{...reviewed,composition:'service-index'});
 assert.ok(evaluatePlan(f,lean,renderPlanHtml(lean,f.name)).metrics.cardRepetition>ok.metrics.cardRepetition);
 const tampered={...plan,sections:plan.sections.map((s,i)=>i?s:{...s,heading:{text:'World-class solutions for all your needs',source:'fact' as const}})};
 const bad=evaluatePlan(f,tampered,renderPlanHtml(tampered,f.name));
 assert.ok(bad.gates.some(g=>/untraced/.test(g)));assert.ok(bad.gates.some(g=>/fallback/.test(g)));
 const still={...plan,sections:plan.sections.map(s=>({...s,reveal:'none' as const}))};
 assert.ok(evaluatePlan(f,still,renderPlanHtml(still,f.name)).gates.some(g=>/entrance transition/.test(g)));
 const noReduce=renderPlanHtml(plan,f.name).replace('prefers-reduced-motion:reduce','print');
 assert.ok(evaluatePlan(f,plan,noReduce).gates.some(g=>/reduced-motion/.test(g)));
 assert.ok(Math.abs(contrastRatio('#000000','#ffffff')-21)<.01);
});

test('loop is deterministic, budgeted, cached, prunes before rendering and logs outcomes',()=>{
 const f=facts({team:[{name:'Ana Ruiz',role:'Designer'},{name:'Ben Cole',role:'Designer'}],process:['Brief','Concepts','Final files']});
 const active=resolveRules(buildPreferenceModel([sig('t1','creative',{op:'more'}),sig('t1','creative',{dimension:'palette',op:'prefer',value:'forest'})]),{projectKey:'t1',industry:'creative'});
 const cache=memoryCache<Evaluation>();
 const a=runLoop({facts:f,active,cache});
 assert.deepEqual(a.chosen.candidate,runLoop({facts:f,active,cache:memoryCache<Evaluation>()}).chosen.candidate);
 assert.equal(a.ledger.modelCalls+a.ledger.crawls+a.ledger.imageGenerations,0);
 assert.deepEqual(a.chosen.gates,[]);
 assert.ok(a.decisions.every(d=>['accepted','rejected','reverted'].includes(d.outcome)&&d.reason.length>0));
 assert.ok(a.alternatives.every(x=>/^(imageryDensity|palette)=/.test(x.change)),'rules+search only searches decisions feedback touched');
 const again=runLoop({facts:f,active,cache});
 assert.equal(again.ledger.evaluations,0);assert.ok(again.ledger.cacheHits>0);
 assert.ok(runLoop({facts:f,active,cache:memoryCache<Evaluation>(),budget:{maxEvaluations:3}}).ledger.evaluations<=3);
 const none=runLoop({facts:f,active:{rules:[],shadowed:[]},cache:memoryCache<Evaluation>(),mode:'rules+search'});
 assert.equal(none.stoppedBecause,'no decision is affected by feedback');
});

test('a measured regression reverts the change and becomes a learned constraint that prunes later candidates',()=>{
 const f=facts();
 const active=resolveRules(buildPreferenceModel([sig('t1','creative',{dimension:'imageryDensity',op:'prefer',value:'immersive',strength:1})]),{projectKey:'t1',industry:'creative'});
 const r=runLoop({facts:f,active,cache:memoryCache<Evaluation>(),ledger:emptyLedger(),mode:'rules'});
 const d=r.decisions.find(x=>x.source==='feedback-rule'&&x.revised==='immersive')!;
 assert.equal(d.outcome,'reverted');assert.ok(d.regressed.length>0);
 const c=constraintFromRevert({...d,decisionId:d.id,projectKey:'t1',industry:'creative'},deriveTraits(f))!;
 assert.equal(c.source,'evaluation');assert.equal(c.value,'immersive');
 const withConstraint=resolveRules(buildPreferenceModel([sig('t1','creative',{dimension:'imageryDensity',op:'prefer',value:'immersive',strength:1})],[c]),{projectKey:'t1',industry:'creative',traits:deriveTraits(f)});
 const again=runLoop({facts:f,active:withConstraint,cache:memoryCache<Evaluation>(),mode:'rules'});
 assert.equal(again.decisions.find(x=>x.revised==='immersive')?.outcome,'rejected');
 assert.ok(again.ledger.rejectedBeforeRender>=1);
});

test('dataset export removes personal data, secrets, business names and image URLs',()=>{
 const ctx={names:['Dr. Amara Chen, DMD'],businessName:'Harbor Point Dental'};
 const text=redactText('Call Dr. Amara Chen at 617-555-0101 or amara@harbor.example, 40 Hancock St. Harbor Point Dental rocks. key=sk_live_ABCDEFGH12345678',ctx);
 for(const leak of ['Amara','Chen','617','@','Hancock','Harbor Point','sk_live'])assert.ok(!text.includes(leak),text);
 const r=runFeedbackBenchmark(corpus.slice(0,3),{generated:gen});
 const jsonl=exportDataset(r.records,{'fx-harbor-dental':['Dr. Amara Chen, DMD','Dr. Luis Ortega, DDS']});
 for(const line of jsonl.trim().split('\n')){
  assert.deepEqual(auditExportLine(line,['Harbor Point Dental','617-555-0101','Amara Chen','40 Hancock St']),[]);
  const rec=JSON.parse(line);
  for(const k of ['business','rendered','review','adjustments','alternatives','final','authorization','generatorVersion'])assert.ok(k in rec,k);
  assert.ok(!('internalNotes' in rec));
 }
});

test('integration adapters map rating rows, evaluations and production preferences',()=>{
 const e=feedbackRowToEvent({demo_id:'d',user_id:'u',rating:2,issue_tags:['layout'],notes:'Too many photos',created_at:'2026-10-01',revision_no:3},
  {businessId:'b',industry:'trades',reviewed});
 assert.equal(e.projectKey,'b');assert.equal(interpretFeedback(e).signals.some(s=>s.dimension==='imageryDensity'&&s.op==='less'),true);
 const f=facts();const plan=composePage(f,reviewed);const evaluation=evaluatePlan(f,plan,renderPlanHtml(plan,f.name));
 const row=evaluationToRow(evaluation,[],{organizationId:'o',demoId:'d',revisionNo:3,generatorVersion:'g',alignment:.5});
 assert.equal(row.evaluation_kind,'functional');assert.ok(row.score>=0&&row.score<=100);
 const prefs=candidateToPreferences(reviewed,defaultPreferences(),['rule a']);
 assert.equal(prefs.composition,'bento');assert.equal(prefs.feedbackCount,1);
 const back=candidateFromProduction({composition:prefs.composition,typography:prefs.typography,imageTreatment:prefs.imageTreatment,motion:'cinematic'},prefs,reviewed);
 for(const k of ['composition','typography','imageryDensity','motionSystem','spacing','copyDepth'] as const)assert.equal(back[k],reviewed[k],k);
 assert.equal(motionHints({...reviewed,motionSystem:'minimal'}).staggerMs,0);
});

test('experiment: withheld industries and styles, expectation-scored holdout, no paid work, no gate failures',()=>{
 const r=runFeedbackBenchmark(corpus,{generated:gen});
 assert.ok(r.corpus.industries>=15);assert.ok(r.corpus.withheldIndustries.length>=4);assert.ok(r.corpus.withheldStyles.length>=4);
 const arm=(m:string)=>r.arms.find(a=>a.mode===m)!;
 for(const a of r.arms){
  assert.equal(a.structuralFailures,0,a.mode);
  assert.equal(a.cost.modelCalls+a.cost.crawls+a.cost.imageGenerations+a.cost.browserRenders,0,a.mode);
 }
 assert.ok(arm('hybrid').holdoutAgreement>arm('baseline').holdoutAgreement,JSON.stringify(r.arms.map(a=>[a.mode,a.holdoutAgreement])));
 assert.ok(r.crossValidation['rules+search'].agreement>r.crossValidation.baseline.agreement);
 assert.ok(arm('rules+search').cost.evaluations<arm('search').cost.evaluations,'feedback-limited search costs less than open search');
 assert.equal(r.records.length,r.corpus.learnNotes+r.corpus.holdoutNotes);
 assert.equal(satisfies('imageryDensity:less',{...reviewed,imageryDensity:'accent'},reviewed),true);
});

test('fictional corpus stays fictional',()=>{
 for(const c of corpus){
  if(c.facts.phone)assert.match(c.facts.phone,/555-01\d\d/);
  for(const u of [c.facts.conversionUrl,...c.facts.imagery.businessImages.map(i=>i.url)].filter(Boolean))assert.match(u!,/\.example\//);
 }
});

test('production facts adapter never reads CRM notes and respects image authorization',async()=>{
 const {factsFromProduction}=await import('../lib/generator-loop/integration.ts');
 const row={id:'b1',name:'Shop',category:'Retail',city:'Boston',street_address:'1 Main St',phone:'617-555-0199',notes:'CRM: owner is difficult'} as const;
 const f=factsFromProduction(row,{about:'A shop.',factStatus:'researched',images:[{url:'https://shop.example/a.jpg',alt:'Shop front window',role:'hero',permission:'reference_only'}],
  generatedImageryEnabled:true,imageAuthorization:{mode:'generated_only',acceptedAt:null,sourceHost:null}},['Gifts'],{conversion:'visit',generated:[]});
 assert.ok(!JSON.stringify(f).includes('CRM'));
 assert.equal(f.imagery.businessImages.length,0);
 const g=factsFromProduction(row,{about:'A shop.',images:[{url:'https://shop.example/a.jpg',alt:'Shop front window',role:'hero',permission:'reference_only'}],
  imageAuthorization:{mode:'business_site_authorized',acceptedAt:'2026-10-11T00:00:00Z',sourceHost:'shop.example'}},['Gifts'],{conversion:'visit',generated:[]});
 assert.equal(permittedBusinessImages(g).ok.length,1);
});

test('orchestration helpers learn from production-shaped reviews and plan the next revision',async()=>{
 const {learnFromReviews,planNextRevision}=await import('../lib/generator-loop/integration.ts');
 const f=facts({id:'demo-business',industry:'creative'});
 const {model,events}=learnFromReviews([{row:{demo_id:'d1',user_id:'u',rating:2,issue_tags:[],notes:'Cards everywhere, it looks like a template. Too wordy.',created_at:'2026-10-01',revision_no:2},
  revisionContent:{generationSpec:{composition:'bento',typography:'humanist',imageTreatment:'framed',motion:'calm'},design:{conciseCopy:false}},facts:f}]);
 assert.equal(events[0].reviewed.composition,'bento');
 const plan=planNextRevision(f,model,defaultPreferences());
 assert.notEqual(plan.candidate.composition,'bento');
 assert.notEqual(plan.preferences.composition,'bento');
 assert.equal(plan.ledger.modelCalls,0);
});
