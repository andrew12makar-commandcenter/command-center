'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireWorkspace,shortText,validUuid} from '@/lib/workspace';
import {analyzeWebsite,publicWebsite} from '@/lib/website-intelligence';
import {classifyWebPresence} from '@/lib/web-presence';
import {preferredAuditEngine,completedAuditOnCooldown,remoteProviderQuotaFailure} from '@/lib/audit-policy';
import {interpretLocalLighthouseJson} from '@/lib/lighthouse-import';
// Local-only script is intentionally not bundled into exported customer websites.
// @ts-expect-error: Local ESM runner is intentionally JavaScript-only.
import {runOneLocalLighthouse} from '../../../scripts/local-lighthouse-once.mjs';

// Only named, already-approved CRM businesses can be inspected.
// One site per click. Completed measurements have a 20-minute cooldown;
// an inconclusive remote 429 must not prevent a working local measurement.
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
 const engine=preferredAuditEngine(process.env.NODE_ENV==='development',Boolean(process.env.PAGESPEED_API_KEY?.trim()));
 const localMode=engine==='local';
 // In a deployed environment, never run a Chrome browser on user-provided URLs.
 // An authenticated user can instead import a real local Lighthouse JSON report.
 if(engine==='manual')
   redirect('/app/intelligence?business='+id+'&error=remote-not-configured#lighthouse-fallback');
 const {data:latest,error:previousError}=await supabase.from('website_assessments')
   .select('assessed_at,status').eq('organization_id',organizationId).eq('business_id',id)
   .order('assessed_at',{ascending:false}).limit(1).maybeSingle();
 if(previousError)throw Error('Could not check previous scans. No new audit was requested.');
 // Don't lock a prospect out because Google's external service returned HTTP 429.
 if(completedAuditOnCooldown(latest))
   redirect('/app/intelligence?business='+id+'&error=cooldown#latest-audits');
 let result;
 if(localMode){
  let raw:string;
  try{raw=await runOneLocalLighthouse(target);}
  catch(error){
   const message=error instanceof Error?error.message:'';
   const code=/still running/i.test(message)?'local-busy':
    /not installed/i.test(message)?'local-install':
    /preflight|unsafe|DNS|denied|HTTP 403|HTTP 429/i.test(message)?'local-preflight':
    'local-failed';
   redirect('/app/intelligence?business='+id+'&error='+code+'#local-lighthouse-queue');
  }
  try{result=interpretLocalLighthouseJson(raw,target);}
  catch{redirect('/app/intelligence?business='+id+'&error=local-report#local-lighthouse-queue');}
  result.findings.source_method='local_lighthouse_execution';
  result.findings.provider='Local Chrome Lighthouse';
  result.findings.note=result.findings.note.replace(
   'Operator-imported Chrome Lighthouse JSON, not independently authenticated by the PageSpeed API.',
   'Chrome Lighthouse executed on the authenticated local development server. No Google PageSpeed API request was made.'
  );
 }else{
  result=await analyzeWebsite(target,fetch,process.env.PAGESPEED_API_KEY);
  // API service exhaustion is not a new measurement. Keep historical records,
  // but don't append a fresh empty card for every unsuccessful button press.
  if(remoteProviderQuotaFailure(result.status,result.findings.error))
   redirect('/app/intelligence?business='+id+'&error=remote-unavailable#lighthouse-fallback');
 }
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
  redirect('/app/intelligence?business='+id+'&error=upload-size#lighthouse-fallback');
 if(!file.name.toLowerCase().endsWith('.json'))
  redirect('/app/intelligence?business='+id+'&error=upload-json#lighthouse-fallback');
 const {data:business,error:loadError}=await supabase.from('businesses')
  .select('id,website_url').eq('organization_id',organizationId).eq('id',id).maybeSingle();
 if(loadError||!business||!business.website_url)
  throw Error('This business needs a recorded independent website before importing an audit.');
 let expected:string;
 try{expected=publicWebsite(business.website_url);}
 catch{throw Error('Social profiles and invalid URLs cannot receive website audits.');}
 let result:ReturnType<typeof interpretLocalLighthouseJson>;
 try{result=interpretLocalLighthouseJson(await file.text(),expected);}
 catch(err){
  const message=err instanceof Error?err.message:'';
  const code=message.includes('does not match')?'upload-mismatch':
    message.includes('within 7 days')?'upload-stale':'upload-json';
  redirect('/app/intelligence?business='+id+'&error='+code+'#lighthouse-fallback');
 }
 const {error:saveError}=await supabase.from('website_assessments').insert({
  organization_id:organizationId,business_id:id,website_url:expected,
  status:result.status,findings:result.findings,evidence:result.evidence
 });
 if(saveError)throw Error('Could not save local Lighthouse evidence: '+saveError.message);
 revalidatePath('/app/intelligence');revalidatePath('/app/opportunities');
 revalidatePath('/app/leads/'+id);
 redirect('/app/intelligence?imported='+id+'#latest-audits');
}
