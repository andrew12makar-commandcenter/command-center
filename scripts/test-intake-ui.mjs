// Signed-in browser smoke test of the actual Next.js login, review queue and
// server action against the disposable Supabase instance used by CI.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {chromium} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';

const api=process.env.CC_TEST_SUPABASE_URL,secret=process.env.CC_TEST_SUPABASE_SERVICE_KEY;
const web=process.env.CC_TEST_WEB_URL||'http://127.0.0.1:3000';
if(process.env.CC_ISOLATED_DB!=='YES'||new URL(api).hostname!=='127.0.0.1'||
 new URL(web).hostname!=='127.0.0.1')throw Error('Refusing UI test against nonlocal instance.');
const service=createClient(api,secret,{auth:{persistSession:false,autoRefreshToken:false}});
function checked(r,label){if(r.error)throw Error(label+': '+r.error.message);return r.data;}
const suffix=randomUUID().slice(0,8),name='Isolated UI Practice '+suffix;
const email='ui-test-'+suffix+'@example.invalid',password='LocalOnlyZ9!'+suffix;
const u=checked(await service.auth.admin.createUser({email,password,email_confirm:true}),'create signed-in test user').user;
const org=checked(await service.from('organizations').insert({name:'Isolated Next UI Org '+suffix}).select('id').single(),'org').id;
checked(await service.from('organization_members').insert({organization_id:org,user_id:u.id,role:'owner'}),'membership');
const rowId=randomUUID();
checked(await service.from('lead_import_rows').insert({
 id:rowId,organization_id:org,submitted_by:u.id,batch_id:randomUUID(),row_number:1,
 name,city:'Brighton',category:'amenity:clinic',
 source_type:'public_directory',source_url:'https://example.org/ui/'+suffix,
 raw_data:{search_area:'Brighton',street:'22 Cambridge Street',postcode:'02135',
 googlemapsurl:'https://www.google.com/maps/search/?api=1&query=Test+Clinic'},
 review_status:'pending'
}),'stage UI candidate');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
for(let i=0;i<100;i++){
 try{const r=await fetch(web+'/login');if(r.status===200)break;}catch{}
 if(i===99)throw Error('Next UI not reachable');
 await sleep(1000);
}
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(web+'/login',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Email').fill(email);
 await page.getByLabel('Password').fill(password);
 await Promise.all([
  page.waitForURL(url=>url.pathname.startsWith('/app'),{timeout:30000}),
  page.getByRole('button',{name:'Sign in'}).click()
 ]);
 if(!page.url().includes('/app'))throw Error('Sign in did not enter protected workspace');
 process.stdout.write('PASS browser: actual Next.js server-action login with locally issued GoTrue credentials\n');
 await page.goto(web+'/app/leads/import?query='+encodeURIComponent(name),{waitUntil:'domcontentloaded'});
 const card=page.locator('#row-'+rowId);
 await card.waitFor({state:'visible',timeout:30000});
 await card.getByText('Import, duplicates and advanced controls').click();
 await card.getByRole('checkbox',{name:'Open the CRM record after import'}).check();
 await Promise.all([
  page.waitForURL(url=>url.pathname==='/app/leads/'+rowId,{timeout:45000}),
  card.getByRole('button',{name:'Import to CRM'}).click()
 ]);
 await page.getByRole('heading',{name}).waitFor({timeout:30000});
 if(errors.length)throw Error('Next browser JS errors: '+errors.join('; '));
 const row=checked(await service.from('lead_import_rows').select('review_status,matched_business_id')
   .eq('id',rowId).single(),'get staged row');
 assert.equal(row.review_status,'imported');
 assert.equal(row.matched_business_id,rowId);
 const crm=checked(await service.from('businesses').select('id,name,google_business_url')
   .eq('id',rowId).single(),'get created CRM');
 assert.equal(crm.name,name);
 assert.equal(crm.google_business_url,null,'search URL must not become a CRM GBP listing');
 const source=checked(await service.from('business_sources').select('id').eq('business_id',rowId),'get source records');
 assert.equal(source.length,1);
 process.stdout.write('PASS browser: review queue -> real Next server action -> CRM record and staged provenance validated\n');
 await context.close();
}finally{await browser.close();}
