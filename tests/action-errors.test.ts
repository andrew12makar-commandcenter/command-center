import test from 'node:test';
import assert from 'node:assert/strict';
import {errorReturnUrl,safeQueueReturn} from '../lib/action-errors.ts';

const row='7cf1ad03-52ba-4d64-a2e3-671d76b0aa5d';
test('invalid disqualification input returns inline to the same filtered queue view',()=>{
 const u=errorReturnUrl('/app/leads/import?campaign=abc&status=all',row,'Record the evidence-backed reason for disqualifying (at least 8 characters).');
 const parsed=new URL(u,'http://local');
 assert.equal(parsed.pathname,'/app/leads/import');
 assert.equal(parsed.searchParams.get('campaign'),'abc');
 assert.equal(parsed.searchParams.get('status'),'all');
 assert.match(parsed.searchParams.get('err')||'',/at least 8 characters/);
 assert.equal(parsed.searchParams.get('row'),row);
 assert.equal(parsed.hash,'#row-'+row);
});
test('error returns never leave the queue and ignore invalid row ids',()=>{
 assert.equal(safeQueueReturn('https://evil.example/'),'/app/leads/import');
 assert.equal(safeQueueReturn('//evil.example/app/leads/import'),'/app/leads/import');
 const u=errorReturnUrl('/elsewhere','not-a-uuid','x'.repeat(500));
 assert.ok(u.startsWith('/app/leads/import?err='));
 assert.ok(!u.includes('row='));
 assert.ok(decodeURIComponent(u).length<300);
});
