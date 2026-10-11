import test from 'node:test';
import assert from 'node:assert/strict';
import {parseApprovedManifest,publicAuditUrl,publicIp,preflightPublicWebsite} from '../scripts/local-audit-guard.mjs';

const business={
 id:'c26614c2-dd2f-4eb2-ab6c-49577b0676b3',
 name:'Dental practice',website_url:'https://www.example.org/'
};
const time=Date.parse('2026-10-10T22:00:00Z');
const manifest=(rows=[business],expiration='2026-10-10T23:00:00Z')=>JSON.stringify({
 kind:'command-center-local-audit/v1',expires_at:expiration,businesses:rows
});
test('one explicitly approved business may be scanned; query tokens are removed',()=>{
 const parsed=parseApprovedManifest(manifest(),time);
 assert.equal(parsed.length,1);
 assert.equal(parsed[0].url,'https://www.example.org/');
 assert.equal(publicAuditUrl('https://www.example.org/?secret=1#hash'),'https://www.example.org/');
});
test('rejects expired, duplicate, empty, oversized or tampered queues',()=>{
 assert.throws(()=>parseApprovedManifest(manifest([]),time));
 assert.throws(()=>parseApprovedManifest(manifest([business,business]),time));
 assert.throws(()=>parseApprovedManifest(manifest([business],'2026-10-10T21:00:00Z'),time));
 assert.throws(()=>parseApprovedManifest(manifest(Array(11).fill(business)),time));
 assert.throws(()=>parseApprovedManifest('{"businesses":[]}',time));
});
test('rejects private, localhost, non-http, IP, port or embedded credential URLs',()=>{
 for(const url of [
  'http://127.0.0.1/','http://10.0.0.1/','http://localhost:3000/',
  'http://foo.local/','http://example.org:8080/','http://user:pass@example.org',
  'http://[::1]/','ftp://example.org/','https://metadata.google.internal/'
 ])assert.throws(()=>publicAuditUrl(url),url);
});
test('deny private or reserved DNS answers including mixtures',()=>{
 const blocked=['127.0.0.1','10.2.3.4','169.254.10.20','172.17.0.1',
   '192.168.1.20','100.64.0.1','0.0.0.0','::1','fd12::1','fe80::1',
   '192.0.2.1','203.0.113.10'];
 for(const address of blocked)assert.equal(publicIp(address),false,address);
 assert.equal(publicIp('8.8.8.8'),true);
 assert.equal(publicIp('2606:4700:4700::1111'),true);
});
test('redirect preflight validates every redirected destination before scan',async()=>{
 const resolver=async host=>host==='private.example.org'?
  [{address:'10.0.0.9',family:4}]:[{address:'8.8.8.8',family:4}];
 const request=async()=>new Response('',{status:302,headers:{location:'https://private.example.org/'}});
 await assert.rejects(
  preflightPublicWebsite('https://www.example.org/',{resolver,request}),
  /non-public|unsafe/
 );
});
test('successful public preflight and approved redirect is allowed',async()=>{
 let count=0;
 const resolver=async()=>[{address:'8.8.8.8',family:4}];
 const request=async()=>count++===0?
  new Response(null,{status:301,headers:{location:'https://example.org/'}}):
  new Response(null,{status:200});
 assert.equal(await preflightPublicWebsite('https://www.example.org/',{resolver,request}),'https://example.org/');
});
