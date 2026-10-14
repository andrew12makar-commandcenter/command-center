import test from 'node:test';
import assert from 'node:assert/strict';
import {filterOpportunityBoard} from '../lib/opportunity-board-filter.ts';
import type {BoardStage} from '../lib/opportunity-board.ts';

const stages:BoardStage[]=['research_website','verify_business','technical_review','audit_website'];
const fixtures=[
 {stage:'research_website' as BoardStage,business:{name:'Nakhon',city:'Brighton',category:'Restaurant',service_area:null},meta:{isTest:false,opportunity:'website_design',campaignId:'brighton'}},
 {stage:'verify_business' as BoardStage,business:{name:'Ryan Insurance',city:'Brighton',category:'Insurance',service_area:null},meta:{isTest:false,opportunity:'gbp',campaignId:'brighton'}},
 {stage:'technical_review' as BoardStage,business:{name:'Test: Mock Shop',city:'Brighton',category:null,service_area:null},meta:{isTest:true,opportunity:'website_design',campaignId:'test'}},
 {stage:'audit_website' as BoardStage,business:{name:'Brighton Dental',city:'Brighton',category:'Dentist',service_area:null},meta:{isTest:false,opportunity:'local_seo',campaignId:'brighton'}}
];
const defaults={showTests:false,stage:null,opportunity:'',campaignFilter:'',q:''};
const run=(params:Partial<typeof defaults>={})=>filterOpportunityBoard(fixtures,stages,{...defaults,...params},row=>row.meta);

test('stage counts and list exclude test campaigns by default',()=>{
 const {searched,counts,testCount}=run();
 assert.equal(searched.length,3);
 assert.equal(testCount,1);
 assert.deepEqual(counts,{research_website:1,verify_business:1,technical_review:0,audit_website:1});
 assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),searched.length);
});
test('stage selection changes the table but preserves other stage counters',()=>{
 const {searched,counts}=run({stage:'research_website'});
 assert.deepEqual(searched.map(x=>x.business.name),['Nakhon']);
 assert.equal(counts.verify_business,1);
 assert.equal(counts.audit_website,1);
});
test('search, opportunity and campaign are shared by tile totals and table',()=>{
 const {searched,counts}=run({q:'Brighton',campaignFilter:'brighton',opportunity:'local_seo'});
 assert.deepEqual(searched.map(x=>x.business.name),['Brighton Dental']);
 assert.equal(counts.audit_website,1);
 assert.equal(counts.research_website,0);
});
test('test-toggle restores test business without altering production population',()=>{
 const {searched,counts}=run({showTests:true});
 assert.equal(searched.length,4);
 assert.equal(counts.technical_review,1);
 assert.equal(searched.filter(x=>x.meta.isTest).length,1);
});
