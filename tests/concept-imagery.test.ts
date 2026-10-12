import test from 'node:test';
import assert from 'node:assert/strict';
import {getGeneratedConceptSet,getPrivatePreviewConcept} from '../lib/concept-imagery.ts';

test('each vertical has a clearly disclosed local preview concept',()=>{
 for(const template of ['medical','landscaping','universal'] as const){
  const set=getGeneratedConceptSet(template);
  const images=[set.hero,set.editorial,set.detail];
  assert.equal(new Set(images.map(x=>x.src)).size,3);
  for(const image of images){
   assert.match(image.src,/^\/concepts\/[a-z0-9-]+\.jpg$/);
   assert.match(image.disclosure,/AI-generated concept visual\./);
   assert.match(image.disclosure,/Not a photograph of the business\./);
  }
 }
});

test('concept imagery is not shaped like an approved blueprint asset',()=>{
 const image=getPrivatePreviewConcept('medical') as Record<string,unknown>;
 assert.equal('permission' in image,false);
 assert.equal('sourceUrl' in image,false);
});
