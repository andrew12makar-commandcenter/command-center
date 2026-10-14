import test from 'node:test';
import assert from 'node:assert/strict';
import {assessViewport,summarize,thumbnailSimilarity,repetitionFindings} from '../scripts/browser-qa/assess.mjs';

const clean={
 layout:{viewportWidth:390,pageOverflow:0,clipped:[],overlaps:[],images:[],links:[],smallText:[]},
 fold:{h1Visible:true,h1Opacity:1,brandVisible:true,actionInFold:true,navVisible:false,menuButton:true},
 reveal:[],reduced:{runningAnimations:0,transparentMotionElements:0},
 console:{errors:[],pageErrors:[],failedRequests:[]},axe:[],viewport:{mobile:true},nav:[]
};

test('a clean render produces no findings',()=>{
 assert.deepEqual(assessViewport(clean),[]);
});

test('real rendering defects are blocking',()=>{
 const f=assessViewport({...clean,
  layout:{...clean.layout,pageOverflow:40,clipped:[{element:'h1',overflowPx:12}],
   images:[{src:'/a.jpg',broken:true}],links:[{text:'Book',href:'#missing',hashTargetMissing:true,visible:true,width:80,height:44}]},
  fold:{...clean.fold,actionInFold:false},
  reveal:[{section:'about',faded:[{tag:'p',text:'x',opacity:0.4}]}],
  reduced:{runningAnimations:2,transparentMotionElements:0},
  console:{errors:[],pageErrors:['TypeError: x'],failedRequests:[]},
  axe:[{id:'color-contrast',impact:'serious',help:'contrast',nodes:2,targets:['p']}],
  nav:[{text:'Services',href:'#services',reached:false}]});
 const codes=new Set(f.filter(x=>x.severity==='blocking').map(x=>x.code));
 for(const c of ['horizontal-overflow','clipped-text','broken-image','broken-anchor','no-action-in-first-screen',
  'content-hidden-by-animation','reduced-motion-ignored','runtime-exception','axe:color-contrast','navigation-did-not-scroll'])
  assert.ok(codes.has(c),c);
});

test('mobile-only usability issues are warnings, and missing mobile navigation is flagged',()=>{
 const f=assessViewport({...clean,fold:{...clean.fold,menuButton:false},
  layout:{...clean.layout,links:[{text:'617',href:'tel:617',visible:true,width:100,height:18}],smallText:[{element:'p',fontSize:'10px'}]},
  axe:[{id:'region',impact:'moderate',help:'landmarks',nodes:1,targets:['div']}]});
 assert.equal(summarize(f).blocking,0);
 assert.deepEqual(summarize(f).codes,['axe:region','mobile-navigation-missing','small-tap-target','small-text']);
});

test('layout similarity ignores colour scheme but detects identical structure',()=>{
 const a=[10,10,200,200,10,10],b=a.map(x=>x+30),c=[200,10,10,10,200,10];
 assert.equal(thumbnailSimilarity(a,b),1);
 assert.ok(thumbnailSimilarity(a,c)<0.5);
 const sig={composition:'composition-centered',order:['services','about'],heroColumns:1,heroImage:false};
 const r=repetitionFindings([{id:'x',signature:sig,thumbnail:a},{id:'y',signature:sig,thumbnail:b},{id:'z',signature:{...sig,composition:'composition-bento'},thumbnail:c}]);
 assert.deepEqual(r.map(x=>[x.a,x.b,x.severity]),[['x','y','warning']]);
});
