import test from 'node:test';
import assert from 'node:assert/strict';
import {collectAllPages,potentialMatches,strongLocationKey,streetFromRaw,postcodeFromRaw,researchServiceArea,type BusinessIdentity} from '../lib/lead-identity.ts';
const lead=(id:string,city:string|null,street:string|null=null):BusinessIdentity=>({
 id,name:'Dr. Smith Clinic',city,street_address:street,postal_code:'02135',
 phone:'617-555-0101',website_url:null
});
test('same doctor name in same city is only a possible match, not automatic merge',()=>{
 const matched=potentialMatches({name:'Dr Smith Clinic',city:'Brighton',phone:null,website_url:null},[lead('1','Brighton')]);
 assert.equal(matched.length,1);
 assert.equal(matched[0].strength,'possible');
});
test('empty cities do not turn different branches into proven duplicates',()=>{
 const matched=potentialMatches({name:'Dr Smith Clinic',city:null,phone:null,website_url:null},
 [lead('1','Brighton'),lead('2','Brookline')],5);
 assert.equal(matched.length,2);
 assert.ok(matched.every(x=>x.strength==='possible'));
});
test('name and confirmed street location create stronger review evidence',()=>{
 const matched=potentialMatches({name:'Dr Smith Clinic',city:'Brighton',phone:null,website_url:null,
   raw_data:{street:'Main Street',housenumber:'10',postcode:'02135'}},
   [lead('1','Brighton','10 Main Street')]);
 assert.equal(matched[0].strength,'strong');
 assert.match(matched[0].reason,/street-level/);
});
test('same name and city but different street is not a strong match',()=>{
 const matched=potentialMatches({name:'Dr Smith Clinic',city:'Brighton',phone:null,website_url:null,
  raw_data:{street:'Main Street',housenumber:'20',postcode:'02135'}},
  [lead('1','Brighton','10 Main Street')]);
 assert.equal(matched[0].strength,'possible');
});
test('OSM address and scan area are not confused with an actual service area',()=>{
 const data={street:'Beacon St',housenumber:'101',postcode:'02135',search_area:'Brighton'};
 assert.equal(streetFromRaw(data),'101 Beacon St');
 assert.equal(postcodeFromRaw(data),'02135');
 assert.equal(researchServiceArea(data),'','search geography is not a business claim');
 assert.equal(researchServiceArea({...data,service_area:'Allston and Brighton'}),'Allston and Brighton');
 assert.equal(researchServiceArea({...data,servicearea:'Brighton'}),'','matching scan area alone is not proof');
});
test('automatic discovery dedupe requires street-level location identity',()=>{
 assert.equal(strongLocationKey('Dr Smith Clinic','', 'Brighton','02135'),null);
 assert.equal(strongLocationKey('Dr Smith Clinic','10 Main St','Brighton','02135'),
   strongLocationKey('Dr. Smith Clinic','10 Main St','Brookline','02135'));
 assert.notEqual(strongLocationKey('Dr Smith Clinic','10 Main St','Brighton','02135'),
   strongLocationKey('Dr Smith Clinic','20 Main St','Brighton','02135'));
});
test('all CRM pages are checked, including rows past one thousand',async()=>{
 const rows=Array.from({length:1260},(_,n)=>n);
 const requests:number[]=[];
 const collected=await collectAllPages(async(start,end)=>{
  requests.push(start);return {data:rows.slice(start,end+1),error:null};
 },500);
 assert.equal(collected.length,1260);
 assert.deepEqual(requests,[0,500,1000]);
});
test('paged queries fail closed rather than trusting an incomplete response',async()=>{
 await assert.rejects(collectAllPages(async(start)=>{
   if(start===0)return {data:Array(500).fill(1),error:null};
   return {data:null,error:{message:'database unavailable'}};
 },500),/database unavailable/);
});
test('record safety limit fails explicitly instead of silently truncating',async()=>{
 await assert.rejects(collectAllPages(async()=>({data:Array(500).fill(1),error:null}),500,1000),/More than 1000/);
});
