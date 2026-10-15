import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCampaignInput,matchesTargetIndustry,industryDescription} from '../lib/discovery-campaigns.ts';
import {normalizeProjectStatus} from '../lib/project-status.ts';
import raw from '../docs/prospect-discovery-status.json' with {type:'json'};

test('campaign input is validated and normalized',()=>{
 const c=validateCampaignInput({name:'  Brighton dentists  ',target_area:'Brighton',industry:'medical',keyword:'dent',target_service:'website_design',discovery_source:'osm'});
 assert.equal(c.name,'Brighton dentists');assert.equal(c.target_industry,'Medical / dental · dent');
 assert.equal(c.target_service,'website_design');
 assert.throws(()=>validateCampaignInput({name:'x',target_area:'',industry:'any',target_service:'gbp',discovery_source:'osm'}));
 assert.throws(()=>validateCampaignInput({name:'Valid',target_area:'',industry:'any',target_service:'ads',discovery_source:'osm'}));
 assert.throws(()=>validateCampaignInput({name:'Valid',target_area:'',industry:'any',target_service:'gbp',discovery_source:'google-maps'}));
 assert.throws(()=>validateCampaignInput({name:'Valid',target_area:'',industry:'fintech',target_service:'gbp',discovery_source:'osm'}));
});
test('industry targeting uses recorded category or name hints only',()=>{
 assert.equal(matchesTargetIndustry({name:'Smile Studio',category:'amenity: dentist'},'medical'),true);
 assert.equal(matchesTargetIndustry({name:'Green Lawn Co',category:'craft: gardener'},'medical'),false);
 assert.equal(matchesTargetIndustry({name:'Green Lawn Co',category:null},'home_services'),true);
 assert.equal(matchesTargetIndustry({name:'Corner Bakery',category:'shop: bakery'},'other'),true);
 assert.equal(matchesTargetIndustry({name:'Corner Bakery',category:'shop: bakery'},'any','dent'),false);
 assert.equal(industryDescription('any','salon'),'Keyword: salon');
 assert.equal(industryDescription('any',''),'Any industry');
});
test('tracker file is valid and uses only allowed statuses and agents',()=>{
 const s=normalizeProjectStatus(raw);
 const allowed=['not_started','in_progress','blocked','ready_for_review','complete'];
 assert.ok(allowed.includes((raw as {overall_status:string}).overall_status));
 for(const m of (raw as {milestones:{status:string;responsible_agent:string}[]}).milestones){
  assert.ok(allowed.includes(m.status),m.status);
 assert.ok(['Claude','ChatGPT','Codex'].includes(m.responsible_agent));
 }
 assert.equal(s.responsible_agent,'Codex');
 assert.equal(s.milestones.find(m=>m.id==='M8')?.status,'ready_for_review');
 assert.ok(s.milestones.length>=6);assert.ok(s.next_action.length>0);
 assert.doesNotMatch(JSON.stringify(raw),/(service_role|sk-[a-z0-9]|SUPABASE_[A-Z_]*=|password\s*[:=])/i);
});
