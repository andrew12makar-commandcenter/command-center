import test from 'node:test';
import assert from 'node:assert/strict';
import {selectSiteMedia} from '../lib/site-media-selection.ts';
import {buildSiteBlueprint,cleanSiteContent,type SiteBlueprint} from '../lib/site-blueprint.ts';
import {createDraft} from '../lib/demo-engine.ts';
import type {GeneratedConceptSet} from '../lib/concept-imagery.ts';

const host='https://studio.example';
const concepts:GeneratedConceptSet={
 hero:{src:'/concepts/hero.jpg',alt:'Concept hero',disclosure:'AI generated; not a real business photo.',role:'hero'},
 editorial:{src:'/concepts/editorial.jpg',alt:'Concept editorial',disclosure:'AI generated; not a real business photo.',role:'editorial'},
 detail:{src:'/concepts/detail.jpg',alt:'Concept detail',disclosure:'AI generated; not a real business photo.',role:'detail'},
};
const image=(file:string,role:'hero'|'gallery'|'team',permission:'approved'|'reference_only'='approved')=>({
 url:host+'/'+file+'.jpg',sourceUrl:host+'/gallery',role,permission,alt:'Studio photograph of '+file
});
function siteWith(images:ReturnType<typeof image>[],generatedImageryEnabled=true):SiteBlueprint{
 const draft=createDraft('Test Studio','Brighton','photography','universal');
 return buildSiteBlueprint('universal',{...draft,
  siteContent:cleanSiteContent({about:'Fictional studio for isolated render tests.',sourceUrl:host,
   factStatus:'unreviewed',images,generatedImageryEnabled})},
  {name:'Test Studio',city:'Brighton'});
}

test('production media selection never renders team or unapproved reference images in the gallery',()=>{
 const site=siteWith([
  image('hero','hero'),image('hero','gallery'),image('team','team'),
  image('work','gallery'),image('unlicensed','gallery','reference_only')]);
 const picked=selectSiteMedia(site,concepts);
 assert.equal(picked.displayHero?.src,host+'/hero.jpg');
 assert.deepEqual(picked.gallery.map(x=>x.src),[
  host+'/work.jpg','/concepts/editorial.jpg','/concepts/detail.jpg'
 ]);
 assert.ok(!picked.gallery.some(x=>x.src.endsWith('/team.jpg')||x.src.endsWith('/unlicensed.jpg')));
 assert.ok(picked.gallery.every(x=>x.concept||x.src.startsWith(host)));
});

test('generated imagery fallback is clearly a concept, not an approved business photograph',()=>{
 const picked=selectSiteMedia(siteWith([]),concepts);
 assert.equal(picked.displayHero?.src,concepts.hero.src);
 assert.equal(picked.displayHero?.concept,true);
 assert.ok(picked.gallery.every(x=>x.concept&&x.credit?.includes('not a real business photo')));
});

test('minimal imagery and disabled concept generation suppress all unused images',()=>{
 const site=siteWith([image('hero','hero'),image('work','gallery')],false);
 const noConcept=selectSiteMedia(site,concepts);
 assert.equal(noConcept.displayHero?.src,host+'/hero.jpg');
 assert.deepEqual(noConcept.gallery.map(x=>x.src),[host+'/work.jpg']);
 const minimal={...site,design:{...site.design,imageTreatment:'minimal' as const}};
 assert.deepEqual(selectSiteMedia(minimal,concepts),{displayHero:null,gallery:[]});
});
