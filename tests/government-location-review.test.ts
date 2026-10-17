import test from 'node:test';
import assert from 'node:assert/strict';
import type {GovernmentCandidate} from '../lib/government-discovery.ts';
import {findCoveredGovernmentReview, governmentLocationKey, isSameGovernmentLocation, validateGovernmentLocationReview} from '../lib/government-location-review.ts';

function record(name='Brighton Example',address='12 Market St',zip='02135'):GovernmentCandidate{
 return {source_id:'active-food-establishment-licenses',source_title:'Active Food Establishment Licenses',source_url:'https://data.boston.gov/dataset/active-food-establishment-licenses',download_url:'https://data.boston.gov/example.csv',downloaded_at:'2026-10-15T00:00:00.000Z',candidate_id:'food:example',source_row_index:1,record_id:'example',name,legal_name:null,category:'Food establishment',address,city:'Brighton',zip,website:null,license_status:'Active',license_type:'Food',issued_on:null,expires_on:null,coordinates:null,distance_miles:null,location_status:'needs_location_match',possible_duplicate_ids:[]};
}
function review(status:'covered'|'researching'='covered'){
 return validateGovernmentLocationReview({name:'Brighton Example',address:'12 Market St',zip:'02135',googleProfileUrl:'https://www.google.com/maps/place/Brighton+Example',websiteUrl:'https://brighton-example.test',seoEvidenceUrl:'https://brighton-example.test/services',evidenceNote:'Exact profile and address match; site works; local service pages observed.',websiteStrong:true,mapsProfileConfirmed:true,seoStrong:true},status,'2026-10-15T00:00:00.000Z').review!;
}

test('government review key is stable and requires full source location fields',()=>{
 assert.equal(governmentLocationKey('  Brighton Example! ','12 Market St','02135'),'brightonexample|12marketst|02135');
 assert.equal(governmentLocationKey('Brighton Example','12 Market St',''),null);
 assert.equal(governmentLocationKey('Brighton Example','','02135'),null);
});

test('a location cannot be marked covered without all three evidence checks and URLs',()=>{
 const base={name:'Brighton Example',address:'12 Market St',zip:'02135',googleProfileUrl:'https://www.google.com/maps/place/example',websiteUrl:'https://example.com',seoEvidenceUrl:'https://example.com/services',evidenceNote:'Observed',websiteStrong:true,mapsProfileConfirmed:true,seoStrong:true};
 assert.ok(validateGovernmentLocationReview({...base,seoStrong:false},'covered').error);
 assert.ok(validateGovernmentLocationReview({...base,googleProfileUrl:'https://google.com/search?q=example'},'covered').error);
 assert.ok(validateGovernmentLocationReview({...base,websiteUrl:'http://example.com'},'covered').error);
 assert.equal(validateGovernmentLocationReview(base,'covered').review?.status,'covered');
});

test('covered suppression requires exact displayed name, full address, ZIP and covered state',()=>{
 const covered=review();
 const reviews={[covered.key]:covered};
 const records=[record()];
 assert.ok(findCoveredGovernmentReview({name:'Brighton Example',address:'12 Market St',zip:'02135'},records,reviews));
 assert.ok(findCoveredGovernmentReview({name:'Brighton Example',address:'12 Market St',zip:'02135-1234'},records,reviews));
 assert.ok(findCoveredGovernmentReview({name:'Brighton Example',address:'12 Market',zip:'02135'},records,reviews));
 assert.equal(findCoveredGovernmentReview({name:'Brighton Example LLC',address:'12 Market St',zip:'02135'},records,reviews),null);
 assert.equal(findCoveredGovernmentReview({name:'Brighton Example',address:'12 Market St Suite 2',zip:'02135'},records,reviews),null);
 assert.equal(findCoveredGovernmentReview({name:'Brighton Example',address:'12 Market Ave',zip:'02135'},records,reviews),null);
 assert.equal(findCoveredGovernmentReview({name:'Brighton Example',address:'12 Market St',zip:null},records,reviews),null);
 const researching=review('researching');
 assert.equal(findCoveredGovernmentReview({name:'Brighton Example',address:'12 Market St',zip:'02135'},records,{[researching.key]:researching}),null);
 assert.equal(isSameGovernmentLocation({name:'Brighton Example',address:'12 Market St',zip:'02135'},covered),true);
});
