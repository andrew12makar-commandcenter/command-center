import test from 'node:test';
import assert from 'node:assert/strict';
import {importRecoveryDecision,missingImportEvidence} from '../lib/staged-import-recovery.ts';

const pending={id:'staged-1',name:'Brighton Dental, LLC',matched_business_id:null,review_status:'pending'};
test('new pending staging row creates once; linked row resumes its exact matching business',()=>{
 assert.equal(importRecoveryDecision(pending,null),'create');
 assert.equal(importRecoveryDecision({...pending,name:'Mi',matched_business_id:'crm-1'},
  {id:'crm-1',name:'Mi'}),'resume');
 // If the staging link could not be stamped after inserting the CRM record,
 // the matching deterministic UUID still lets a later request resume safely.
 assert.equal(importRecoveryDecision(pending,{id:'staged-1',name:'Brighton Dental LLC'}),'resume');
 assert.equal(importRecoveryDecision(pending,{id:'staged-1',name:'Unrelated Company'}),'blocked');

 assert.equal(importRecoveryDecision({...pending,matched_business_id:'crm-1'},
   {id:'crm-1',name:'Brighton Dental LLC'}),'resume');
 assert.equal(importRecoveryDecision({...pending,matched_business_id:'crm-1'},null),'blocked');
 assert.equal(importRecoveryDecision({...pending,matched_business_id:'crm-1'},
   {id:'crm-2',name:pending.name}),'blocked');
 assert.equal(importRecoveryDecision({...pending,matched_business_id:'crm-1'},
   {id:'crm-1',name:'Different Dental Business'}),'blocked');
});
test('completed, skipped and duplicate rows never resume or create via import action',()=>{
 for(const review_status of ['imported','duplicate','skipped','invalid']){
  assert.equal(importRecoveryDecision({...pending,review_status},null),'blocked');
 }
});
test('resume can skip previously saved provenance but retain missing source types',()=>{
 const input=[
  {source_url:'https://example.com/source',source_type:'local_registry',raw_name:'Brighton Dental'},
  {source_url:'https://example.com/social',source_type:'social_profile',raw_name:'Brighton Dental'},
  {source_url:'https://example.com/source',source_type:'local_registry',raw_name:'Brighton Dental'}
 ];
 const existing=[{source_url:'https://example.com/source',source_type:'local_registry'}];
 assert.deepEqual(missingImportEvidence(input,existing),[input[1]]);
 assert.deepEqual(missingImportEvidence(input,[]),[input[0],input[1]]);
 assert.deepEqual(missingImportEvidence(input,[...existing,{source_url:'https://example.com/social',source_type:'social_profile'}]),[]);
});
