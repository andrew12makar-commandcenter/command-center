import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCampaignInput,isTestCampaign,matchesTargetIndustry} from '../lib/discovery-campaigns.ts';
import {classifyGoogleListingLink} from '../lib/google-listing-link.ts';
import {qualifyStagedRow} from '../lib/prospect-qualification.ts';
import {researchServiceArea,potentialMatches,type BusinessIdentity} from '../lib/lead-identity.ts';
import {filterOpportunityBoard,type BoardVisibility} from '../lib/opportunity-board-filter.ts';
import type {BoardStage} from '../lib/opportunity-board.ts';

const now=new Date('2026-10-14T17:00:00Z');
const campaign=validateCampaignInput({name:'Brighton web redesign',target_area:'Brighton',
 industry:'medical',keyword:'dental',target_service:'website_design',discovery_source:'osm'});
const row={
 name:'Brighton Dental Associates',category:'amenity: dentist',city:'Brighton',website_url:null,
 phone:'617-555-0100',source_url:'https://www.openstreetmap.org/node/1',source_type:'openstreetmap',
 review_status:'pending',raw_data:{
  search_area:'Brighton',street:'Beacon Street',housenumber:'21',postcode:'02135',
  googlemapsurl:'https://www.google.com/maps/search/?api=1&query=Brighton+Dental'
 }
};
const q=()=>qualifyStagedRow(row,{targetService:campaign.target_service,
 duplicateWarning:false,targetArea:campaign.target_area,now});
const stages:BoardStage[]=['research_website','verify_business','technical_review'];
const boardFilters:BoardVisibility={showTests:false,stage:null,opportunity:'',campaignFilter:'',q:''};

test('discovery targeting and qualification keep the website campaign primary despite missing GBP evidence',()=>{
 assert.equal(matchesTargetIndustry(row,'medical','dental'),true);
 const result=q();
 assert.equal(result.primaryOpportunity,'website_design');
 assert.equal(result.gbpState,'unknown');
 assert.equal(result.gbpStatus,'unconfirmed');
 assert.match(result.lanes.find(l=>l.lane==='gbp')!.why,/Maps search link.*not a confirmed/i);
 assert.equal(researchServiceArea(row.raw_data),'');
 assert.equal(classifyGoogleListingLink(row.raw_data.googlemapsurl).kind,'search');
});

test('an exact Maps ID is not proof of listing ownership, and same-name businesses remain manual matches',()=>{
 const recorded=qualifyStagedRow({...row,raw_data:{...row.raw_data,
  googlemapsurl:'https://maps.google.com/?cid=12345'}},
  {targetService:'gbp',duplicateWarning:false,targetArea:'Brighton',now});
 assert.equal(recorded.gbpStatus,'recorded');
 assert.equal(recorded.gbpState,'unknown');
 const crm:BusinessIdentity[]=[{id:'known',name:row.name,city:'Brighton',
  street_address:'99 Beacon Street',postal_code:'02135',phone:null,website_url:null}];
 const matches=potentialMatches(row,crm);
 assert.equal(matches.length,1);
 assert.equal(matches[0].strength,'possible');
});

test('candidate-to-board view shares test exclusion and stage counts across campaigns',()=>{
 const qualified=q();
 const items=[
  {stage:'research_website' as BoardStage,
   business:{name:row.name,city:row.city,category:row.category,service_area:null},
   meta:{isTest:false,opportunity:qualified.primaryOpportunity,campaignId:'real'}},
  {stage:'technical_review' as BoardStage,
   business:{name:'Test: Brighton mock',city:'Brighton',category:'dentist',service_area:null},
   meta:{isTest:isTestCampaign({name:'Test: Brighton mock'}),opportunity:'website_design',campaignId:'test'}}
 ];
 const hidden=filterOpportunityBoard(items,stages,{...boardFilters,campaignFilter:'real'},x=>x.meta);
 assert.equal(hidden.searched.length,1);
 assert.equal(hidden.counts.technical_review,0);
 assert.equal(hidden.testCount,0);
 const filtered=filterOpportunityBoard(items,stages,{...boardFilters,campaignFilter:'test',showTests:true},x=>x.meta);
 assert.equal(filtered.counts.technical_review,1);
 assert.equal(filtered.searched[0].business.name,'Test: Brighton mock');
});
