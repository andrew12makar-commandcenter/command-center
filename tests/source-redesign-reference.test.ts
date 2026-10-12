import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveSiteRedesignReference} from '../lib/source-redesign-reference.ts';
import {cleanSiteContent} from '../lib/site-blueprint.ts';

const page={url:'https://example.org/services',title:'Original Company',description:'Original content',
 headings:['Outdoor services','Gallery'],excerpts:['Original business website research excerpt.'],
 themeColor:'#387a51'};
const approved={url:'https://example.org/media/garden.jpg',sourceUrl:'https://example.org/services',
 role:'gallery',alt:'Approved outdoor business photo',permission:'approved'};
const pending={url:'https://example.org/media/hero.jpg',sourceUrl:'https://example.org/services',
 role:'hero',alt:'Photo awaiting permission',permission:'reference_only'};
const source=(opts={})=>cleanSiteContent({researchPages:[page],images:[approved,pending],
  researchInsights:[{id:'a',kind:'gallery',label:'Original project gallery',detail:'Sourced from the business',
   sourceUrl:'https://example.org/services',status:'reviewed'}],generatedImageryEnabled:true,...opts});

test('existing website becomes an inspectable redesign brief with only approved media counted',()=>{
 const plan=deriveSiteRedesignReference(source(),'landscaping',['Outdoor planning','Garden maintenance']);
 assert.deepEqual(plan.sourceHosts,['example.org']);
 assert.deepEqual(plan.sourceThemeColors,['#387a51']);
 assert.equal(plan.sourcePages,1);
 assert.equal(plan.approvedImages,1);
 assert.equal(plan.unapprovedImageReferences,1);
 assert.equal(plan.mediaPlan,'approved-business-media');
 assert.ok(plan.warnings.some(w=>/rights/.test(w)));
 assert.ok(!plan.imageBriefs.length,'do not replace an approved photo with generic concepts');
});

test('unapproved original-site photos do not satisfy the visual reference gate',()=>{
 const plan=deriveSiteRedesignReference(source({images:[pending]}),'landscaping',['Planting design']);
 assert.equal(plan.approvedImages,0);
 assert.equal(plan.mediaPlan,'concept-image-brief-needed');
 assert.ok(plan.imageBriefs.every(text=>/concept/i.test(text)));
 assert.ok(plan.imageBriefs.every(text=>/no (identifiable|claimed)/i.test(text)));
 assert.equal(plan.recommendedImageTreatment,'framed');
});

test('style cues are sanitized and cannot invent original-site branding',()=>{
 const s=source({researchPages:[{...page,themeColor:'javascript:alert(1)'}]});
 const plan=deriveSiteRedesignReference(s,'medical',['Preventive checkups']);
 assert.deepEqual(plan.sourceThemeColors,[]);
 assert.ok(plan.warnings.every(x=>!x.includes('javascript')));
});

test('unreviewed gallery candidates never trigger gallery-first source design',()=>{
 const preview=source({researchInsights:[{id:'a',kind:'gallery',label:'Gallery',detail:'Unreviewed',
  sourceUrl:'https://example.org/services',status:'candidate'}],
  images:[approved,approved,approved]});
 const plan=deriveSiteRedesignReference(preview,'landscaping',['Plan','Maintain','Design']);
 assert.notEqual(plan.recommendedComposition,'immersive');
});

test('without existing site and without AI permission, leave a safe typographic fallback',()=>{
 const plan=deriveSiteRedesignReference(cleanSiteContent({generatedImageryEnabled:false}),'universal',[]);
 assert.equal(plan.sourcePages,0);
 assert.equal(plan.mediaPlan,'typographic');
 assert.deepEqual(plan.imageBriefs,[]);
 assert.equal(plan.recommendedImageTreatment,'minimal');
});
