import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {validUuid} from '@/lib/workspace';
import type {Campaign,CampaignInput} from '@/lib/discovery-campaigns';

// Either reuse an organization's existing campaign or create a new one. Never both.
export async function resolveCampaign(
 supabase:SupabaseClient,organizationId:string,userId:string,
 existingId:string,input:CampaignInput|null
):Promise<Campaign>{
 if(existingId){
  if(!validUuid(existingId))throw Error('Invalid discovery campaign.');
  const {data,error}=await supabase.from('discovery_campaigns')
   .select('id,name,target_area,target_industry,target_service,discovery_source,created_at')
   .eq('organization_id',organizationId).eq('id',existingId).maybeSingle();
  if(error)throw Error('Could not read discovery campaigns. Has migration 0007 been applied? '+error.message);
  if(!data)throw Error('That discovery campaign was not found in your organization.');
  return data as Campaign;
 }
 if(!input)throw Error('Choose an existing campaign or name a new one.');
 const {data,error}=await supabase.from('discovery_campaigns').insert({
  organization_id:organizationId,created_by:userId,...input
 }).select('id,name,target_area,target_industry,target_service,discovery_source,created_at').single();
 if(error||!data)throw Error('Could not create the discovery campaign. Has migration 0007 been applied? '+(error?.message??''));
 return data as Campaign;
}

export async function listCampaigns(supabase:SupabaseClient,organizationId:string):Promise<{campaigns:Campaign[];available:boolean}>{
 const {data,error}=await supabase.from('discovery_campaigns')
  .select('id,name,target_area,target_industry,target_service,discovery_source,created_at')
  .eq('organization_id',organizationId).order('created_at',{ascending:false}).limit(200);
 if(error)return {campaigns:[],available:false};
 return {campaigns:(data??[]) as Campaign[],available:true};
}
