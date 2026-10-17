import test from 'node:test';
import assert from 'node:assert/strict';
import {splitRegistryLocation,hasEntityRegistryContext} from '../lib/registry-import.ts';
import {streetFromRaw,postcodeFromRaw} from '../lib/lead-identity.ts';
import {qualifyStagedRow} from '../lib/prospect-qualification.ts';

test('state entity filing addresses are preserved separately from verified business locations',()=>{
 const record=splitRegistryLocation({sourceType:'Massachusetts business entity registry',city:'Boston',address:'100 Federal St Ste 500',postcode:'02110'});
 assert.equal(record.isEntityRegistry,true);
 assert.equal(record.city,'');
 assert.equal(record.street,'');
 assert.equal(record.postcode,'');
 assert.equal(record.registryCity,'Boston');
 assert.equal(record.registryAddress,'100 Federal St Ste 500');
});

test('municipal business license locations remain available as candidate locations',()=>{
 const record=splitRegistryLocation({sourceType:'Boston food license',city:'Boston',address:'12 Market Street',postcode:'02135'});
 assert.equal(record.isEntityRegistry,false);
 assert.equal(record.city,'Boston');
 assert.equal(record.street,'12 Market Street');
 assert.equal(record.postcode,'02135');
 assert.equal(record.registryAddress,null);
});

test('annual Massachusetts Corporations Book exports are recognized as entity-registry evidence',()=>{
 const record=splitRegistryLocation({sourceType:'Massachusetts Corporations Book',city:'Brookline',address:'registered office',postcode:'02446'});
 assert.equal(record.isEntityRegistry,true);
 assert.equal(record.city,'');
 assert.equal(record.street,'');
 assert.equal(record.registryAddress,'registered office');
});

test('state registered office is never reused as a prospect storefront or target-area match',()=>{
 const raw={registry_context:'entity_filing',address:'100 Federal St Ste 500',postcode:'02110',registry_city:'Boston'};
 assert.equal(hasEntityRegistryContext(raw),true);
 assert.equal(streetFromRaw(raw),'');
 assert.equal(postcodeFromRaw(raw),'');
 const qualified=qualifyStagedRow({name:'Example Holdings LLC',city:'',category:'Limited Liability Company',website_url:null,phone:null,
  source_url:'https://corp.sec.state.ma.us/CorpWeb/CorpSearch/CorpSummary.aspx',source_type:'Massachusetts business entity registry',
  review_status:'pending',raw_data:raw},{targetService:'website_design',duplicateWarning:false,targetArea:'Brighton'});
 assert.equal(qualified.industry,'Industry not yet verified');
 assert.ok(!qualified.parts.find(part=>part.key==='fit')!.why.some(reason=>/In Brighton/.test(reason)));
 assert.ok(qualified.unmet.includes('Geographic relevance not shown'));
});
