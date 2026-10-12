import test from 'node:test';
import assert from 'node:assert/strict';
import {preferredAuditEngine,completedAuditOnCooldown,remoteProviderQuotaFailure} from '../lib/audit-policy.ts';

const now=Date.parse('2026-10-12T20:45:00.000Z');
test('authenticated Mac development audits use local Chrome, never anonymous Google API',()=>{
 assert.equal(preferredAuditEngine(true,false),'local');
 assert.equal(preferredAuditEngine(true,true),'local');
 assert.equal(preferredAuditEngine(false,false),'manual');
 assert.equal(preferredAuditEngine(false,true),'remote');
});
test('Google quota errors do not block a genuine local audit for twenty minutes',()=>{
 const failed={status:'inconclusive',assessed_at:new Date(now-45_000).toISOString()};
 const measured={status:'verified_gaps',assessed_at:new Date(now-45_000).toISOString()};
 assert.equal(completedAuditOnCooldown(failed,now),false);
 assert.equal(completedAuditOnCooldown(measured,now),true);
 assert.equal(completedAuditOnCooldown({...measured,assessed_at:new Date(now-30*60_000).toISOString()},now),false);
 assert.equal(completedAuditOnCooldown(null,now),false);
});
test('quota and access denial are not measurements and must not append new audit cards',()=>{
 for(const status of ['429','401','403'])
  assert.equal(remoteProviderQuotaFailure('inconclusive','Google PageSpeed HTTP '+status),true);
 assert.equal(remoteProviderQuotaFailure('inconclusive','Timed out'),false);
 assert.equal(remoteProviderQuotaFailure('verified_gaps','HTTP 429'),false);
});
