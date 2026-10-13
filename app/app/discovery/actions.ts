'use server';
import {randomUUID} from 'node:crypto';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireWorkspace,shortText} from '@/lib/workspace';
import {discover,areas,type Area,type Source} from '@/lib/discovery';
import {collectAllPages,streetFromRaw,postcodeFromRaw,strongLocationKey} from '@/lib/lead-identity';
import {validateCampaignInput,matchesTargetIndustry,TARGET_INDUSTRIES,type TargetIndustry} from '@/lib/discovery-campaigns';
import {resolveCampaign} from '@/lib/discovery-campaigns-server';

export async function scanAndStage(form:FormData){
 const {supabase,organizationId,user}=await requireWorkspace(true);
 const area=shortText(form.get('area')) as Area;
 const source=shortText(form.get('source')) as Source;
 const max=Number(form.get('max'));
 if(!Object.hasOwn(areas,area) || !['osm','boston-certified','boston-food'].includes(source)
    || ![25,50,75].includes(max)) throw Error('Choose a valid source, area and scan size.');
 const industry=shortText(form.get('industry'),40) as TargetIndustry;
 if(!TARGET_INDUSTRIES.includes(industry))throw Error('Choose a valid target industry.');
 const keyword=shortText(form.get('keyword'),60);
 const existingCampaign=shortText(form.get('campaign_id'),64);
 // Validate the new-campaign form before any external request; create it only after a successful scan.
 const campaignInput=existingCampaign?null:validateCampaignInput({
  name:form.get('campaign_name'),target_area:areas[area].label,industry,keyword,
  target_service:form.get('target_service'),discovery_source:source
 });
 let candidates;
 try{candidates=(await discover(source,area)).filter(x=>matchesTargetIndustry(x,industry,keyword));}
 catch(err){
   const reason=err instanceof Error?err.message:'Source request unavailable';
   console.warn('Discovery request failed:',reason);
   redirect('/app/discovery?error='+encodeURIComponent(reason.slice(0,240)));
 }
 // Both collections are paged. Otherwise the first 1,000 records masquerade as a complete deduplication check.
 const [existing,crm]=await Promise.all([
  collectAllPages<{raw_data:Record<string,unknown>|null;name:string|null;city:string|null;source_type:string}>(async(from,to)=>{
   const {data,error}=await supabase.from('lead_import_rows')
    .select('raw_data,name,city,source_type').eq('organization_id',organizationId)
    .order('created_at',{ascending:true}).order('id',{ascending:true}).range(from,to);
   return {data,error};
  }),
  collectAllPages<{name:string;city:string|null;street_address:string|null;postal_code:string|null}>(async(from,to)=>{
   const {data,error}=await supabase.from('businesses')
    .select('name,city,street_address,postal_code').eq('organization_id',organizationId)
    .order('created_at',{ascending:true}).order('id',{ascending:true}).range(from,to);
   return {data,error};
  })
 ]);
 const sourceIds=new Set(existing.map(x=>x.source_type+'|'+String(x.raw_data?.external_id||'')).filter(x=>!x.endsWith('|')));
 const locations=new Set<string>();
 for(const x of existing){
  const key=strongLocationKey(x.name||'',streetFromRaw(x.raw_data),x.city||'',postcodeFromRaw(x.raw_data));
  if(key)locations.add(key);
 }
 for(const x of crm){
  const key=strongLocationKey(x.name||'',x.street_address||'',x.city||'',x.postal_code||'');
  if(key)locations.add(key);
 }
 const campaign=await resolveCampaign(supabase,organizationId,user.id,existingCampaign,campaignInput);
 const batchId=randomUUID(),nowRows=[],seen=new Set<string>();
 let skipped=0;
 for(const x of candidates){
   const externalKey=x.source_type+'|'+x.external_id;
   const locationKey=strongLocationKey(x.name,streetFromRaw(x.raw_data),x.city,postcodeFromRaw(x.raw_data));
   if(sourceIds.has(externalKey)||seen.has(externalKey)||
      (locationKey!==null && locations.has(locationKey))){skipped++;continue;}
   seen.add(externalKey);if(locationKey)locations.add(locationKey);
   nowRows.push({
    organization_id:organizationId,submitted_by:user.id,batch_id:batchId,row_number:nowRows.length+1,
    name:x.name,city:x.city,category:x.category,website_url:x.website_url,
    phone:x.phone,source_url:x.source_url,source_type:x.source_type,
    raw_data:x.raw_data,review_status:'pending',campaign_id:campaign.id
   });
   if(nowRows.length>=max)break;
 }
 if(!nowRows.length)redirect('/app/discovery?added=0&skipped='+skipped+'&source='+source+'&campaign='+campaign.id);
 const {error}=await supabase.from('lead_import_rows').insert(nowRows);
 if(error)throw Error('Discovery staging failed. No records were imported: '+error.message);
 revalidatePath('/app');revalidatePath('/app/leads/import');revalidatePath('/app/discovery');
 redirect('/app/discovery?added='+nowRows.length+'&skipped='+skipped+'&source='+source+'&campaign='+campaign.id);
}
