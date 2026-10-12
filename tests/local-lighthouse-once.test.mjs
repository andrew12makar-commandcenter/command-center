import test from 'node:test';
import assert from 'node:assert/strict';
import {localLighthouseArgs,localLighthouseBusy,runOneLocalLighthouse} from '../scripts/local-lighthouse-once.mjs';

test('local runner uses installed Lighthouse and saves mobile SEO and performance evidence',()=>{
 const args=localLighthouseArgs('https://example.org/','/tmp/report.json');
 assert.ok(args.includes('--only-categories=performance,seo'));
 assert.ok(args.includes('--form-factor=mobile'));
 assert.ok(args.includes('--output=json'));
 assert.ok(args.includes('--output-path=/tmp/report.json'));
 assert.ok(args.some(x=>x.includes('--disable-extensions')));
 assert.ok(args.every(x=>!x.includes('PAGESPEED_API_KEY')));
});
test('local runner cannot execute on a deployed server',async()=>{
 const old=process.env.NODE_ENV;
 process.env.NODE_ENV='production';
 try{
  await assert.rejects(runOneLocalLighthouse('https://example.org/'),/development server/);
  assert.equal(localLighthouseBusy(),false);
 }finally{
  if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;
 }
});
test('private and localhost URLs cannot start a local browser process',async()=>{
 const old=process.env.NODE_ENV;
 process.env.NODE_ENV='development';
 try{
  await assert.rejects(runOneLocalLighthouse('http://127.0.0.1:3001/'),/public|domain|URL|website/i);
  assert.equal(localLighthouseBusy(),false);
 }finally{
  if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;
 }
});
