import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyGoogleListingLink} from '../lib/google-listing-link.ts';

test('maps search URL is a search even if it returns one business',()=>{
 const result=classifyGoogleListingLink('https://www.google.com/maps/search/?api=1&query=Nakhon+Brighton');
 assert.equal(result.kind,'search');
});
test('CID and query_place_id provide a listing-specific reference, not verified identity',()=>{
 assert.equal(classifyGoogleListingLink('https://maps.google.com/?cid=4').kind,'specific_id');
 assert.equal(classifyGoogleListingLink('https://www.google.com/maps/search/?api=1&query=X&query_place_id=ChIJ123456789').kind,'specific_id');
});
test('place paths and short links without an explicit ID remain unverified',()=>{
 assert.equal(classifyGoogleListingLink('https://www.google.com/maps/place/Nakhon+Brighton/').kind,'unverified_link');
 assert.equal(classifyGoogleListingLink('https://maps.app.goo.gl/example').kind,'unverified_link');
});
test('unrelated and unsafe URLs are not cited as Google Maps listings',()=>{
 assert.equal(classifyGoogleListingLink('https://yelp.com/biz/a').kind,'invalid');
 assert.equal(classifyGoogleListingLink('javascript:alert(1)').kind,'invalid');
 assert.equal(classifyGoogleListingLink('https://user:pass@google.com/maps').kind,'invalid');
 assert.equal(classifyGoogleListingLink('').kind,'none');
});
