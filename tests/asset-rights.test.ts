import assert from 'node:assert/strict';
import test from 'node:test';
import {applyImageRightsDecision,summarizeAssetRights} from '../lib/asset-rights.ts';
import {cleanSiteContent} from '../lib/site-blueprint.ts';

const content=()=>cleanSiteContent({images:[{
 url:'https://business.example/photo.jpg',sourceUrl:'https://business.example/gallery',
 role:'gallery',alt:'Storefront reference',permission:'reference_only'
}]});

test('source images remain pending until an operator records a decision',()=>{
 assert.deepEqual(summarizeAssetRights(content()),{approved:0,pending:1,rejected:0,total:1});
});

test('approval requires explicit confirmation and preserves review evidence',()=>{
 assert.throws(()=>applyImageRightsDecision(content(),{
  url:'https://business.example/photo.jpg',decision:'approved',evidence:'Owner email confirms use',
  confirmed:false,reviewedAt:'2026-10-12T12:00:00Z'
 }),/independently verified/);
 const reviewed=applyImageRightsDecision(content(),{
  url:'https://business.example/photo.jpg',decision:'approved',evidence:'Owner email confirms use',
  confirmed:true,reviewedAt:'2026-10-12T12:00:00Z'
 });
 assert.equal(reviewed.images[0].permission,'approved');
 assert.equal(reviewed.images[0].rightsNote,'Owner email confirms use');
 assert.equal(reviewed.images[0].rightsReviewedAt,'2026-10-12T12:00:00Z');
});

test('rejected references stay preserved but cannot render as approved media',()=>{
 const reviewed=applyImageRightsDecision(content(),{
  url:'https://business.example/photo.jpg',decision:'rejected',evidence:'No reusable license found',
  confirmed:false,reviewedAt:'2026-10-12T12:00:00Z'
 });
 assert.deepEqual(summarizeAssetRights(reviewed),{approved:0,pending:0,rejected:1,total:1});
});
