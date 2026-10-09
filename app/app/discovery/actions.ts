'use server';
import {randomUUID} from 'node:crypto';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireWorkspace,shortText} from '@/lib/workspace';
import {discover,areas,type Area,type Source} from '@/lib/discovery';
import {normalizeBusiness} from '@/lib/csv';

export async function scanAndStage(form:FormData){
 const {supabase,organizationId,user}=await requireWorkspace(true);
 const area=shortText(form.get('area')) as Area;
 const source=shortText(form.get('source')) as Source;
 const max=Number(form.get('max'));
 if(!Object.hasOwn(areas,area) || !['osm','boston-certified','boston-food'].includes(source)
    || ![25,50,75].includes(max)) throw Error('Choose a valid source, area and scan size.');
 let candidates;
 try{candidates=await discover(source,area);}
 catch(err){
   const reason=err instanceof Error?err.message:'Source request unavailable';
   console.warn('Discovery request failed:',reason);
   redirect('/app/discovery?error='+encodeURIComponent(reason.slice(0,240)));
 }
 const [{data:existing,error:stageError},{data:crm,error:crmError}]=await Promise.all([
  supabase.from('lead_import_rows').select('raw_data,name,city,source_type')
    .eq('organization_id',organizationId).order('created_at',{ascending:false}).limit(1000),
  supabase.from('businesses').select('name,city').eq('organization_id',organizationId).limit(1000)
 ]);
 if(stageError||crmError) throw Error('Cannot check duplicates before discovery; no candidates staged.');
 const sourceIds=new Set((existing??[]).map(x=>String(x.raw_data?.external_id??'')).filter(Boolean));
 const names=new Set([...existing??[],...crm??[]].filter(x=>x.name && x.city)
   .map(x=>normalizeBusiness(x.name)+'|'+normalizeBusiness(x.city)));
 const batchId=randomUUID(),nowRows=[],seen=new Set<string>();
 let skipped=0;
 for(const x of candidates){
   const key=normalizeBusiness(x.name)+'|'+normalizeBusiness(x.city);
   if(sourceIds.has(x.external_id)||seen.has(x.external_id)||
      (x.city && names.has(key))){skipped++;continue;}
   seen.add(x.external_id);if(x.city)names.add(key);
   nowRows.push({
    organization_id:organizationId,submitted_by:user.id,batch_id:batchId,row_number:nowRows.length+1,
    name:x.name,city:x.city,category:x.category,website_url:x.website_url,
    phone:x.phone,source_url:x.source_url,source_type:x.source_type,
    raw_data:x.raw_data,review_status:'pending'
   });
   if(nowRows.length>=max)break;
 }
 if(!nowRows.length)redirect('/app/discovery?added=0&skipped='+skipped+'&source='+source);
 const {error}=await supabase.from('lead_import_rows').insert(nowRows);
 if(error)throw Error('Discovery staging failed. No records were imported: '+error.message);
 revalidatePath('/app');revalidatePath('/app/leads/import');revalidatePath('/app/discovery');
 redirect('/app/discovery?added='+nowRows.length+'&skipped='+skipped+'&source='+source);
}
