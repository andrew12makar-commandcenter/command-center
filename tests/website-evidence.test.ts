import test from 'node:test';
import assert from 'node:assert/strict';
import {parseWebsiteHtml,nameMatches,websiteWeaknessCount,seoGapCount,type WebsiteCheck} from '../lib/website-evidence.ts';
import {classifyIndustry,isLegalStructure,industryLabel} from '../lib/business-classification.ts';
import {mapBostonCsv} from '../lib/discovery.ts';

const now=new Date('2026-10-14T12:00:00Z');
const good=`<!doctype html><html><head><title>Corner Bakery | Brighton MA</title>
<meta name="viewport" content="width=device-width"><meta name="description" content="Fresh bread in Brighton.">
<link rel="canonical" href="https://cornerbakery.example/">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Bakery","name":"Corner Bakery"}</script>
</head><body><a href="tel:6175550100">Call</a><footer>© 2026 Corner Bakery</footer></body></html>`;
const weak=`<html><head><title></title></head><body><h1>Welcome</h1><p>Copyright 2016 Corner Bakery</p></body></html>`;

test('parses titles, descriptions, canonical links and JSON-LD deterministically',()=>{
 const a=parseWebsiteHtml(good,{finalUrl:'https://cornerbakery.example/',businessName:'Corner Bakery',now});
 assert.equal(a.title,'Corner Bakery | Brighton MA');
 assert.equal(a.canonical,'https://cornerbakery.example/');
 assert.deepEqual(a.json_ld_types,['Bakery']);
 assert.equal(a.local_business_schema,true);
 assert.equal(a.name_match,true);assert.equal(a.phone_on_page,true);
 assert.deepEqual(a.issues,[]);
 assert.deepEqual(a,parseWebsiteHtml(good,{finalUrl:'https://cornerbakery.example/',businessName:'Corner Bakery',now}));
});
test('weak sites produce objective, named issues',()=>{
 const w=parseWebsiteHtml(weak,{finalUrl:'http://cornerbakery.example/',businessName:'Corner Bakery',now});
 for(const i of ['no_https','no_viewport','no_title','no_meta_description','no_local_business_schema','old_copyright'])
  assert.ok(w.issues.includes(i as never),i);
 const c={...w,checked_at:'x',url:'x',status:'reachable',robots_txt:false,sitemap:false,issues:[...w.issues,'no_sitemap']} as WebsiteCheck;
 assert.equal(websiteWeaknessCount(c),5);assert.equal(seoGapCount(c),4);
});
test('malformed JSON-LD is ignored, not guessed',()=>{
 const x=parseWebsiteHtml('<script type="application/ld+json">{bad json</script>',{finalUrl:'https://a.example/',businessName:'A Co',now});
 assert.deepEqual(x.json_ld_types,[]);
});
test('business-name matching ignores legal suffixes',()=>{
 assert.equal(nameMatches('Welland & Co., LLC','Welland and Company design studio'),true);
 assert.equal(nameMatches('Welland & Co., LLC','Some other firm'),false);
 assert.equal(nameMatches('LLC Inc',''),null);
});
test('LLC and Corporation are legal structures, never an industry conclusion',()=>{
 for(const c of ['Limited Liability Company (LLC)','Corporation','Sole Proprietorship','LLC','Inc.']){
  assert.equal(isLegalStructure(c),true,c);
  const d=classifyIndustry('Welland & Co., LLC',c);
  assert.notEqual(d.template,'universal',c);
  assert.equal(industryLabel(d),'Industry not yet verified');
 }
 assert.equal(isLegalStructure('amenity: dentist'),false);
 assert.equal(isLegalStructure('Landscaping services'),false);
});
test('Boston certified directory maps business type to legal structure, not category',()=>{
 const csv='Company Name,Business Type,Services Provided,Zip Code,Website\nYard Co,Limited Liability Company (LLC),Landscaping and lawn care,02135,https://yard.example\nOffice Co,Corporation,,02135,';
 const r=mapBostonCsv(csv,'https://data.boston.gov/x.csv','boston-certified','brighton');
 assert.equal(r[0].category,'Landscaping and lawn care');
 assert.equal(r[0].raw_data.legal_structure,'Limited Liability Company (LLC)');
 assert.equal(r[1].category,'Certified business');
 assert.equal(r[1].raw_data.legal_structure,'Corporation');
});

test('numeric entities are decoded and LocalBusiness subtypes are recognised',()=>{
 const h='<title>Home - Caf&#233; Lava</title><script type="application/ld+json">{"@type":"InsuranceAgency"}</script>';
 const x=parseWebsiteHtml(h,{finalUrl:'https://a.example/',businessName:'Cafe Lava',now});
 assert.equal(x.title,'Home - Café Lava');
 assert.equal(x.local_business_schema,true);
});
