'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireWorkspace,shortText,validUuid} from '@/lib/workspace';
import {analyzeWebsite,publicWebsite} from '@/lib/website-intelligence';
import {classifyWebPresence} from '@/lib/web-presence';
import {interpretLocalLighthouseJson} from '@/lib/lighthouse-import';

// Only named, already-approved CRM businesses can be inspected.
// One site per click and a 20-minute per-company cooldown prevents quota abuse.
export async function auditBusiness(form:FormData){
 const {supabase,organizationId}=await requireWorkspace(true);
 const id=shortText(form.get('business_id'),64);
 if(!validUuid(id))throw Error('Invalid CRM business.');
 const {data:business,error:loadError}=await supabase.from('businesses')
   .select('id,name,website_url').eq('organization_id',organizationId).eq('id',id).maybeSingle();
 if(loadError||!business)throw Error('CRM business not found in this workspace.');
 if(!business.website_url)redirect('/app/intelligence?error=no-website');
 const presence=classifyWebPresence(business.website_url);
 if(presence.kind==='social'||presence.kind==='listing')redirect('/app/intelligence?error=profile-not-site&business='+id);
 let target:string;
 try{target=publicWebsite(business.website_url);}
 catch{redirect('/app/intelligence?error=invalid-website');}
 const {data:latest,error:previousError}=await supabase.from('website_assessments')
   .select('assessed_at').eq('organization_id',organizationId).eq('business_id',id)
   .order('assessed_at',{ascending:false}).limit(1).maybeSingle();
 if(previousError)throw Error('Could not check previous scans. No new audit was requested.');
 if(latest && Date.now()-Date.parse(latest.assessed_at)<20*60*1000){
   redirect('/app/intelligence?error=cooldown');
 }
 const result=await analyzeWebsite(target,fetch,process.env.PAGESPEED_API_KEY);
 const {error:saveError}=await supabase.from('website_assessments').insert({
  organization_id:organizationId,business_id:id,website_url:target,
  status:result.status,findings:result.findings,evidence:result.evidence,
 });
 if(saveError)throw Error('Could not save audited evidence: '+saveError.message);
 revalidatePath('/app/intelligence');
 revalidatePath('/app/leads/'+id);
 redirect('/app/intelligence?audited='+id);
}

/** Manual Chrome DevTools Lighthouse fallback. Does not call the Google API
 *  and therefore does not consume PageSpeed quota or require PAGESPEED_API_KEY.
 *  This upload is user-supplied evidence, not independent attestation.
 */
export async function importLighthouseReport(form:FormData){
 const {supabase,organizationId}=await requireWorkspace(true);
 const id=shortText(form.get('business_id'),64);
 if(!validUuid(id))throw Error('Select a valid CRM business.');
 const file=form.get('lighthouse_json');
 if(!(file instanceof File)||!file.size||file.size>8_000_000)
  throw Error('Select a non-empty Lighthouse JSON export smaller than 8 MB.');
 if(!file.name.toLowerCase().endsWith('.json'))
  throw Error('Export the Lighthouse report as a .json file, not an HTML report.');
 const {data:business,error:loadError}=await supabase.from('businesses')
  .select('id,website_url').eq('organization_id',organizationId).eq('id',id).maybeSingle();
 if(loadError||!business||!business.website_url)
  throw Error('This business needs a recorded independent website before importing an audit.');
 let expected:string;
 try{expected=publicWebsite(business.website_url);}
 catch{throw Error('Social profiles and invalid URLs cannot receive website audits.');}
 const result=interpretLocalLighthouseJson(await file.text(),expected);
 const {error:saveError}=await supabase.from('website_assessments').insert({
  organization_id:organizationId,business_id:id,website_url:expected,
  status:result.status,findings:result.findings,evidence:result.evidence
 });
 if(saveError)throw Error('Could not save local Lighthouse evidence: '+saveError.message);
 revalidatePath('/app/intelligence');revalidatePath('/app/opportunities');
 revalidatePath('/app/leads/'+id);
 redirect('/app/intelligence?imported='+id+'#latest-audits');
}
