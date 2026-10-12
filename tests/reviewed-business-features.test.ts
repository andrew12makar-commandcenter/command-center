import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewedSiteFeatures} from '../lib/reviewed-business-features.ts';
import {cleanSiteContent} from '../lib/site-blueprint.ts';

const features=[
 {id:'a',kind:'team',label:'Meet the care team',detail:'Staff introductions on the source website.',
  sourceUrl:'https://example.org/team',status:'reviewed'},
 {id:'b',kind:'faq',label:'Questions about new patients',detail:'Questions answered by the original site.',
  sourceUrl:'https://example.org/faq',status:'reviewed'},
 {id:'c',kind:'trust',label:'Years serving the community',detail:'Unreviewed claim, not suitable for rendering.',
  sourceUrl:'https://example.org/about',status:'candidate'},
 {id:'d',kind:'gallery',label:'Gallery',detail:'This heading adds no customer-specific information.',
  sourceUrl:'https://example.org/gallery',status:'reviewed'}
];
test('only source-linked, reviewer-approved, business-specific details enter page composition',()=>{
 const content=cleanSiteContent({researchInsights:features,factStatus:'researched'});
 const result=reviewedSiteFeatures({content});
 assert.deepEqual(result.map(x=>x.id),['a','b']);
 assert.ok(result.every(x=>x.sourceUrl.startsWith('https://example.org/')));
 assert.ok(result.every(x=>!x.detail.includes('Unreviewed')));
});
test('unsafe sources and no review result in no published-looking company claims',()=>{
 const content=cleanSiteContent({researchInsights:[...features,{...features[0],id:'evil',
  label:'Independent clinic certification',sourceUrl:'javascript:alert(1)'}]});
 const result=reviewedSiteFeatures({content});
 assert.ok(!result.some(x=>x.id==='evil'));
 assert.equal(reviewedSiteFeatures({content:cleanSiteContent({researchInsights:features.map(x=>({...x,status:'candidate'}))})}).length,0);
});
