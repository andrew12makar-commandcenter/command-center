import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {classifyWebPresence} from '@/lib/web-presence';
import {currentAudit,type AuditRecord,type OpportunityBusiness} from '@/lib/opportunity-board';
import {auditSummary,qualifyBusiness,type BusinessForQualification,type Qualification} from '@/lib/prospect-qualification';
import type {Campaign} from '@/lib/discovery-campaigns';

export type SourceRow={business_id:string;source_url:string|null;source_type:string|null;confidence:string|null};
// Split recorded provenance into independent sources vs social/directory profiles.
export function sourceEvidence(sources:SourceRow[]){
 const profile=sources.find(s=>s.source_type==='social_profile'||['social','listing'].includes(classifyWebPresence(s.source_url).kind));
 const independent=sources.filter(s=>s!==profile&&s.source_type!=='social_profile'&&!['social','listing'].includes(classifyWebPresence(s.source_url).kind));
 const best=independent.find(s=>s.confidence==='matched')??independent[0];
 return {sourceUrl:best?.source_url??null,sourceType:best?.source_type??null,profileUrl:profile?.source_url??null,independent};
}
export function qualifyCrmBusiness(
 b:BusinessForQualification&{id:string},audits:AuditRecord[],sources:SourceRow[],campaign:Campaign|null,
 extra:{staged?:Record<string,unknown>|null;hasDemo?:boolean}={}
):{q:Qualification;audit:AuditRecord|null}{
 const audit=currentAudit(b as unknown as OpportunityBusiness,audits);
 const ev=sourceEvidence(sources);
 return {audit,q:qualifyBusiness(b,{audit:auditSummary(audit),sourceUrl:ev.sourceUrl,sourceType:ev.sourceType,
  profileUrl:ev.profileUrl,targetService:campaign?.target_service??null,targetArea:campaign?.target_area??null,
  staged:extra.staged??null,hasDemo:extra.hasDemo})};
}
// The staged candidate a CRM record was imported from keeps its source and review evidence.
export async function readOriginRaw(supabase:SupabaseClient,organizationId:string,businessId:string):Promise<Record<string,unknown>|null>{
 const {data}=await supabase.from('lead_import_rows').select('raw_data').eq('organization_id',organizationId)
  .eq('matched_business_id',businessId).in('review_status',['imported','duplicate']).order('created_at',{ascending:false}).limit(1);
 return (data?.[0]?.raw_data as Record<string,unknown>|undefined)??null;
}
export async function readCampaign(supabase:SupabaseClient,organizationId:string,id:string|null|undefined):Promise<Campaign|null>{
 if(!id)return null;
 const {data}=await supabase.from('discovery_campaigns')
  .select('id,name,target_area,target_industry,target_service,discovery_source,created_at')
  .eq('organization_id',organizationId).eq('id',id).maybeSingle();
 return (data as Campaign|null)??null;
}
