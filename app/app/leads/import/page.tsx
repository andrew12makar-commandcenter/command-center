import Link from 'next/link';
import {requireWorkspace} from '@/lib/workspace';
import {approveImportedRow,linkImportedDuplicate,skipImportedRow,stageCsv,stagePublicBusinessList,triageStagedRow,updateStagedQualification,
 checkCandidateWebsite,runCandidateLocalLighthouse,saveCandidateReview} from '../actions';
import {collectAllPages,potentialMatches,phonesConflict,type BusinessIdentity,type PotentialMatch} from '@/lib/lead-identity';
import {normalizeBusiness} from '@/lib/csv';
import {classifyIndustry} from '@/lib/business-classification';
import {hasEntityRegistryContext} from '@/lib/registry-import';
import {classifyWebPresence,independentWebsite,discoveredProfile,recordedWebsite} from '@/lib/web-presence';
import {listCampaigns} from '@/lib/discovery-campaigns-server';
import {TARGET_SERVICES,targetServiceLabels,isTestCampaign,type Campaign} from '@/lib/discovery-campaigns';
import {qualifyStagedRow,stagedStreet,formatLocation,readReview,OPPORTUNITIES,STRENGTHS,CONFIDENCES,READINESS,NEXT_ACTIONS,RESEARCH_STATUSES,
 EVIDENCE_STATES,opportunityLabels,strengthLabels,confidenceLabels,readinessLabels,nextActionLabels,researchStatusLabels,evidenceStateLabels,compareQualificationNeed,
 type Qualification} from '@/lib/prospect-qualification';
import {websiteIssueLabels} from '@/lib/website-evidence';
import {classifyGoogleListingLink} from '@/lib/google-listing-link';
import {sameLighthousePage} from '@/lib/lighthouse-import';
import type {TechnicalSignals} from '@/lib/lighthouse-signals';
import {EvidenceChip,ProgressChip,ScoreBadge,Headline,ScoreBreakdown,Fold} from '@/components/prospect-ui';
import PublicPresenceEvidenceCard from '@/components/public-presence-evidence-card';
import {PublicListImport} from '@/components/public-list-import';
import {getProspectKnownBusinesses} from '@/lib/brighton-shortlist';
import type {KnownBusiness} from '@/lib/public-business-import';

function safeExternalUrl(value:string|null|undefined):string|null{
 if(!value)return null;
 try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.toString():null;}
 catch{return null;}
}
type FilterKey='query'|'campaign'|'opportunity'|'strength'|'confidence'|'readiness'|'status'|'area'|'industry'|'website'|'target_fit'|'sort'|'page'|'tests';
type Params=Partial<Record<FilterKey|'staged'|'error'|'err'|'row'|'public_staged'|'public_skipped'|'public_rows'|'public_error',string>>;
type StagedRow={
 id:string;name:string|null;city:string|null;category:string|null;source_url:string|null;source_type:string|null;
 website_url:string|null;phone:string|null;review_status:string;matched_business_id:string|null;row_number:number;
 created_at:string;raw_data:Record<string,unknown>|null;campaign_id?:string|null;triage_status?:string|null;
 primary_opportunity_override?:string|null;evidence_confidence_override?:string|null;next_action_override?:string|null;
 disqualification_reason?:string|null;
};
type Scored={row:StagedRow;q:Qualification;matches:PotentialMatch[];campaign:Campaign|null;area:string;industryTemplate:string;recoveryBusinessId:string|null};
const BASE_COLUMNS='id,name,city,category,source_url,source_type,website_url,phone,review_status,matched_business_id,row_number,created_at,raw_data';
const NEW_COLUMNS=',campaign_id,triage_status,primary_opportunity_override,evidence_confidence_override,next_action_override,disqualification_reason';
const PAGE_SIZE=30;
const SOURCE_FIELDS=['companyname','entityname','legalname','legal_structure','businesstype','entitytype','servicesprovided','original_category','address','registeredaddress','registry_registered_address','registry_city','registry_context','postcode','neighborhood',
 'contactname','contacttitle','phone','email','website','numberemployees','datebusinessestablished','search_area','provider','external_id','registry_url'];

function CandidateCard({x,here,err,compact=false}:{x:Scored;here:string;err:string|null;compact?:boolean}){
 const {row,q,matches,campaign,recoveryBusinessId}=x;
 const raw=row.raw_data||{};const review=readReview(raw);const m=review.manual;const c=review.website_check;
 const site=independentWebsite(m?.website_url||null)||recordedWebsite(row.website_url,raw);
 const profile=discoveredProfile(row.raw_data,row.website_url),source=safeExternalUrl(row.source_url);
 const maps=classifyGoogleListingLink(m?.gbp_url||null);
 const possibleWebsiteUrls=typeof raw.possible_website_urls==='string'?raw.possible_website_urls.split(/\s+/).map(safeExternalUrl).filter((u):u is string=>Boolean(u)):[];
 const distanceMiles=Number(raw.distance_miles);
 const localAudit=review.local_lighthouse;
 const auditMatchesSite=Boolean(localAudit&&site&&sameLighthousePage(localAudit.website_url,site));
 const pending=row.review_status==='pending';
 const hidden=(<><input type="hidden" name="row_id" value={row.id}/><input type="hidden" name="return_to" value={here}/></>);
 const location=formatLocation(stagedStreet(raw)||m?.address||null,row.city,null,typeof raw.postcode==='string'&&raw.postcode?raw.postcode:null);
 return <article id={'row-'+row.id} className="panel scroll-mt-6 p-4">
  {err&&<p role="alert" className="mb-3 rounded-lg border border-rose-700/60 bg-rose-950/30 p-2 text-sm text-rose-100">{err}</p>}
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div className="min-w-0">
    <h3 className="text-base font-semibold">{row.name||'Missing name'}</h3>
    <p className="muted text-xs">{location}{Number.isFinite(distanceMiles)?' · '+distanceMiles.toFixed(2)+' mi from Brighton Center':''} · {q.industry}{q.legalStructure?' · Legal structure: '+q.legalStructure:''}</p>
    <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
     {!['held','disqualified'].includes(q.researchStatus)&&<ProgressChip progress={q.progress}/>}
     <span className="muted">{campaign?campaign.name:'No campaign'}{campaign&&isTestCampaign(campaign)?' (test)':''}</span>
     {pending&&recoveryBusinessId&&<span className="rounded-full border border-amber-700/60 px-2 text-amber-200">Import needs completion</span>}
     {matches.length>0&&!recoveryBusinessId&&<span className="rounded-full border border-amber-700/60 px-2 text-amber-200">Possible duplicate</span>}
     {q.researchStatus!=='review_needed'&&<span className="rounded-full border border-[#34505c] px-2 text-[#b8cbd3]">{researchStatusLabels[q.researchStatus]}</span>}
  </p>
  <p className="mt-2 text-xs"><strong className={q.targetFit==='likely_target'?'text-emerald-200':q.targetFit==='possible_out_of_scope'?'text-amber-200':'text-[#c4d2d8]'}>{q.targetFitLabel}:</strong> <span className="muted">{q.targetFitReason}</span></p>
   </div>
   <ScoreBadge q={q}/>
  </div>
  {auditMatchesSite&&localAudit&&<section className="mt-4 rounded-xl border border-cyan-800/50 bg-cyan-950/20 p-4" aria-label="Local Lighthouse report">
   <div className="flex flex-wrap items-start justify-between gap-3">
    <div><p className="kicker">Local mobile Lighthouse · {new Date(localAudit.assessed_at).toLocaleString('en-US')}</p>
     <h4 className="mt-1 font-semibold">{localAudit.status==='verified_gaps'?'Potential technical opportunities':localAudit.status==='no_gaps'?'No major technical gaps measured':'Inconclusive run'}</h4></div>
    <div className="flex gap-4 text-sm"><span>Performance <strong>{localAudit.findings.performance_score??'—'}/100</strong></span><span>SEO <strong>{localAudit.findings.seo_score??'—'}/100</strong></span></div>
   </div>
   {(()=>{const signals=localAudit.findings.technical_signals as TechnicalSignals|undefined;const metrics=signals?.metrics;const insights=signals?.insights||[];
    const ms=(n:number|null|undefined)=>n==null?'—':n>=1000?(Math.round(n/100)/10)+' s':Math.round(n)+' ms';
    return <>
     <p className="muted mt-2 text-xs">{localAudit.findings.note}</p>
     <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs"><span>Largest content paint: {ms(metrics?.lcp_ms)}</span><span>First content paint: {ms(metrics?.fcp_ms)}</span><span>Layout shift: {metrics?.layout_shift??'—'}</span><span>{localAudit.findings.measured_checks} checks measured · {localAudit.findings.flagged_checks} flagged</span></div>
     {insights.length>0&&<ul className="mt-3 grid gap-1 text-xs sm:grid-cols-2">{insights.slice(0,6).map(item=><li key={item.id} className="text-cyan-100">• {item.title}{item.type==='estimated_savings'?' · estimated opportunity':''}</li>)}</ul>}
     {localAudit.findings.report_warnings?.length? <p className="mt-3 text-xs text-amber-200">Caution: {localAudit.findings.report_warnings.join(' ')}</p>:null}
     <p className="muted mt-3 text-[11px]">One mobile lab run is a technical clue. It does not measure real visitor experience, Google rankings, owner interest, or guaranteed savings.</p>
    </>;
   })()}
  </section>}
  {localAudit&&!auditMatchesSite&&<p className="mt-3 rounded-lg border border-amber-700/50 p-3 text-xs text-amber-200">A saved Lighthouse report is for a different website. It is excluded from this prospect&apos;s score. Run a fresh check for the current website.</p>}
  <PublicPresenceEvidenceCard
   location={location}
   identity={m?.identity==='confirmed'?'manually matched':m?.identity==='unclear'?'unclear':m?.identity==='unknown'?'unknown':'not reviewed'}
   operation={m?.active==='confirmed'?'marked active in review':m?.active==='possibly_inactive'?'possibly inactive':'unknown'}
   locationType={m?.location_type&&m.location_type!=='unknown'?m.location_type:null}
   reviewNote={m?.note}
   websiteUrl={site}
   websiteCheckedAt={c?new Date(c.checked_at).toLocaleDateString('en-US'):null}
   websiteStatus={c?.status??null}
   websiteIssues={c?.issues.map(issue=>websiteIssueLabels[issue])??[]}
   mapsUrl={maps.url}
   mapsKind={maps.kind}
   mapsReviewState={m?.gbp?evidenceStateLabels[m.gbp]:'not reviewed'}
   mapsReviewedAt={m?.reviewed_at?.slice(0,10)}
   phone={m?.phone||row.phone}
   phoneConflict={Boolean(m?.phone&&row.phone&&m.phone!==row.phone)}
   email={m?.email||(typeof raw.email==='string'?raw.email:null)}
   sourceUrl={source}
   profileUrl={profile}
   profileLabel={profile&&classifyWebPresence(profile).kind==='ordering'?'Booking / order profile':'Business profile'}
   evidenceDate={m?.reviewed_at?.slice(0,10)||'not recorded'}
   observedNeed={m?.note}
  />
  <p className="mt-2"><Headline q={q}/></p>
  <p className="mt-1 text-sm leading-6 text-[#cfe0e6]">{q.summary}</p>
  <p className="mt-2 flex flex-wrap gap-1.5"><EvidenceChip label="Website" state={q.websiteState}/><EvidenceChip label="GBP" state={q.gbpState}/>
   <span className="text-[11px] text-[#9fb6c0]">Contact: {readinessLabels[q.contactReadiness]}</span></p>
  {phonesConflict(row.phone,m?.phone)&&<p role="note" className="mt-2 rounded-lg border border-amber-700/50 bg-amber-950/20 p-2 text-xs text-amber-100">Phone numbers conflict: the source lists <strong>{row.phone}</strong>, while the saved review lists <strong>{m?.phone}</strong>. Confirm the current number with the business before using it or importing the record. Neither number was changed.</p>}
  {!compact&&q.tasks.length>0&&<div className="mt-2 text-xs"><span className="muted">Still to verify: </span>{q.tasks.slice(0,4).join(' · ')}</div>}
  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
   {q.researchStatus==='held'||q.researchStatus==='disqualified'?
    <span className="mr-1"><span className="muted">Current status:</span> <strong>{researchStatusLabels[q.researchStatus]}</strong></span>:
    <span className="mr-1"><span className="muted">Next:</span> <strong>{nextActionLabels[q.nextAction]}</strong></span>}
   {pending&&!recoveryBusinessId&&site&&<form action={checkCandidateWebsite}>{hidden}<button className="btn !px-3 !py-1.5 text-xs" type="submit">{c?'Re-check website':'Check website (free)'}</button></form>}
   {pending&&!recoveryBusinessId&&site&&process.env.NODE_ENV==='development'&&<form action={runCandidateLocalLighthouse}>{hidden}
    <button className="btn !px-3 !py-1.5 text-xs" type="submit">{auditMatchesSite?'Re-run mobile Lighthouse':'Run mobile Lighthouse'}</button></form>}
   {pending&&!recoveryBusinessId&&q.researchStatus!=='shortlisted'&&q.researchStatus!=='disqualified'&&<form action={triageStagedRow}>{hidden}<button className="btn !px-3 !py-1.5 text-xs" name="triage" value="shortlist">Shortlist</button></form>}
   {pending&&!recoveryBusinessId&&q.researchStatus!=='review_needed'&&<form action={triageStagedRow}>{hidden}<button className="text-cyan-300 underline" name="triage" value="restore">Restore to review</button></form>}
   {pending&&!recoveryBusinessId&&q.researchStatus!=='held'&&q.researchStatus!=='disqualified'&&<form action={triageStagedRow}>{hidden}<button className="text-[#a8bfcb] underline" name="triage" value="hold">Hold</button></form>}
   {source&&<a className="text-cyan-300 underline" href={source} target="_blank" rel="noopener noreferrer">Source ↗</a>}
   {site&&<a className="text-cyan-300 underline" href={site} target="_blank" rel="noopener noreferrer">Website ↗</a>}
   {possibleWebsiteUrls.map(url=><a key={url} className="text-amber-200 underline" href={url} target="_blank" rel="noopener noreferrer">Check site match ↗</a>)}
   {profile&&<a className="text-amber-200 underline" href={profile} target="_blank" rel="noopener noreferrer">{classifyWebPresence(profile).kind==='ordering'?'Order page ↗':'Profile ↗'}</a>}
   {!pending&&<span className="muted">{row.review_status==='duplicate'?'Linked to an existing record':'Imported'}{recoveryBusinessId&&<> · <Link className="text-cyan-300 underline" href={'/app/leads/'+recoveryBusinessId}>CRM ↗</Link></>}</span>}
  </div>
  {pending&&site&&<p className="muted mt-2 text-[11px]">Mobile Lighthouse runs in Chrome on this Mac and saves its report to this staged lead. It can take up to two minutes.</p>}
  {pending&&recoveryBusinessId&&<div className="mt-4 rounded-lg border border-amber-700/50 bg-amber-950/20 p-3 text-sm">
   <p className="font-semibold text-amber-100">Incomplete CRM import linked to an existing business</p>
   <p className="mt-1 text-amber-100/90">The business was created, but source evidence or the queue update may not have finished. Resume to check missing evidence and complete the staging row. This will not intentionally create another business.</p>
   <div className="mt-3 flex flex-wrap items-center gap-4">
    <form action={approveImportedRow}>{hidden}<button className="btn text-xs" type="submit">Resume incomplete import</button></form>
    <Link className="text-cyan-300 underline" href={'/app/leads/'+recoveryBusinessId}>Inspect linked CRM record ↗</Link>
   </div>
  </div>}
  {pending&&!recoveryBusinessId&&<div className="mt-3 space-y-1">
   <Fold title="Record review evidence">
    <form action={saveCandidateReview} className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">{hidden}
     <label>Website<select name="website" className="mt-1 !py-1.5 text-xs" defaultValue={m?.website??''}><option value="">Not reviewed</option>{EVIDENCE_STATES.map(s=><option key={s} value={s}>{evidenceStateLabels[s]}</option>)}</select></label>
     <label>Official website found (optional)<input name="website_url" type="url" className="mt-1 !py-1.5 text-xs" defaultValue={m?.website_url??''} placeholder="https://"/></label>
     <fieldset className="rounded-lg border border-[#2b4350] p-2 sm:col-span-2 lg:col-span-3"><legend className="px-1 font-semibold">Government registry cross-check</legend>
      <p className="muted mb-2">Registration can support a name match. It does not prove that this storefront is open, that the address is customer-facing, or that the business needs marketing.</p>
      <div className="grid gap-2 sm:grid-cols-3">
       <label>Registry result<select name="registry_result" className="mt-1 !py-1.5 text-xs" defaultValue={m?.registry_result??''}><option value="">Not checked</option><option value="found_match">Matching entity found</option><option value="possible_match">Possible name match</option><option value="not_found">No match found</option></select></label>
       <label className="sm:col-span-2">Official record or search URL<input name="registry_url" type="url" className="mt-1 !py-1.5 text-xs" defaultValue={m?.registry_url??(typeof raw.registry_url==='string'?raw.registry_url:'')} placeholder="https://corp.sec.state.ma.us/…"/></label>
       <label className="sm:col-span-3">What matched / did not match<input name="registry_note" maxLength={300} className="mt-1 !py-1.5 text-xs" defaultValue={m?.registry_note??''} placeholder="Entity name and town matched; registered office only"/></label>
       <p className="sm:col-span-3"><a className="text-cyan-300 underline" href="https://corp.sec.state.ma.us/CorpWeb/CorpSearch/CorpSearch.aspx" target="_blank" rel="noreferrer">Search Massachusetts business entities ↗</a> · <a className="text-cyan-300 underline" href="https://www.mass.gov/info-details/business-certificates-dba-in-massachusetts" target="_blank" rel="noreferrer">How local DBA certificates work ↗</a></p>
      </div>
     </fieldset>
     <label>Google Business Profile<select name="gbp" className="mt-1 !py-1.5 text-xs" defaultValue={m?.gbp??''}><option value="">Not reviewed</option>{EVIDENCE_STATES.map(s=><option key={s} value={s}>{evidenceStateLabels[s]}</option>)}</select></label>
     <label>GBP link (if identified)<input name="gbp_url" type="url" className="mt-1 !py-1.5 text-xs" defaultValue={m?.gbp_url??''} placeholder="https://maps.google.com/?cid=…"/><span className="muted mt-1 block text-[10px]">A Maps search URL does not identify the exact listing. Confirm name, address and phone separately.</span></label>
     <label>Identity<select name="identity" className="mt-1 !py-1.5 text-xs" defaultValue={m?.identity??''}><option value="">Not reviewed</option><option value="confirmed">Confirmed match</option><option value="unclear">Unclear</option><option value="unknown">Unknown</option></select></label>
     <label>Currently operating<select name="active" className="mt-1 !py-1.5 text-xs" defaultValue={m?.active??''}><option value="">Not reviewed</option><option value="confirmed">Confirmed</option><option value="possibly_inactive">Possibly inactive</option><option value="unknown">Unknown</option></select></label>
     <label>Location type<select name="location_type" className="mt-1 !py-1.5 text-xs" defaultValue={m?.location_type??''}><option value="">Not reviewed</option><option value="storefront">Storefront</option><option value="office">Office</option><option value="home_based">Home-based (confirmed)</option><option value="service_area">Service-area business</option><option value="unknown">Unknown</option></select></label>
     <label>Service area (if published)<input name="service_area" className="mt-1 !py-1.5 text-xs" maxLength={200} defaultValue={m?.service_area??''}/></label>
     <label>Verified address (if missing)<input name="address" className="mt-1 !py-1.5 text-xs" maxLength={200} defaultValue={m?.address??''}/></label>
     <label>Business phone found<input name="phone" className="mt-1 !py-1.5 text-xs" maxLength={40} defaultValue={m?.phone??''}/></label>
     <label>Business email found<input name="email" type="email" className="mt-1 !py-1.5 text-xs" maxLength={160} defaultValue={m?.email??''}/></label>
     <label>Decision maker (if published)<input name="contact_name" className="mt-1 !py-1.5 text-xs" maxLength={120} defaultValue={m?.contact_name??''}/></label>
     <label className="sm:col-span-2 lg:col-span-1">Note (what you checked)<input name="note" className="mt-1 !py-1.5 text-xs" maxLength={600} defaultValue={m?.note??''}/></label>
     <div className="sm:col-span-2 lg:col-span-3"><button className="btn !px-3 !py-1.5 text-xs" type="submit">Save review</button>
      <span className="muted ml-2">Only record what you actually verified. Leave unknowns as Not reviewed.</span></div>
    </form>
   </Fold>
   <Fold title={'Score breakdown ('+q.score+'/100)'}><ScoreBreakdown q={q}/>
    {c&&<div className="mt-2 text-xs"><p className="muted">Website check {c.checked_at.slice(0,10)} · {c.status}{c.final_url?' · '+c.final_url:''}</p>
     {c.issues.length>0&&<ul className="mt-1 list-disc pl-5">{c.issues.map(i=><li key={i}>{websiteIssueLabels[i]}</li>)}</ul>}
     {c.title&&<p className="muted mt-1">Title: {c.title}</p>}</div>}
    {q.unmet.length>0&&<p className="mt-2 text-xs text-amber-200">Not yet qualified: {q.unmet.join('; ')}.</p>}
   </Fold>
   <Fold title="Import, duplicates and advanced controls">
    <div className="grid gap-4 text-xs lg:grid-cols-3">
     <form action={approveImportedRow} className="space-y-2">{hidden}
      {matches.length>0&&<label className="flex items-start gap-2 text-amber-100"><input type="checkbox" name="confirm_distinct" value="yes"/>I checked the possible matches; this is a separate business.</label>}
      <label className="flex items-center gap-2"><input type="checkbox" name="open_crm" value="yes"/>Open the CRM record after import</label>
      <button className="btn !px-3 !py-1.5 text-xs" type="submit">{matches.length?'Import as separate business':'Import to CRM'}</button>
      <p className="muted">Carries campaign, score summary, opportunity, confidence and next action. Never sets a priority score.</p>
      {matches.map(mm=><div key={mm.id} className="rounded-lg border border-amber-900/40 p-2">
       <Link className="text-cyan-300 underline" href={'/app/leads/'+mm.id} target="_blank">{mm.name} ↗</Link>
       <span className="muted block">{mm.city||'Location not recorded'} · {mm.reason}</span>
      </div>)}
     </form>
     <div className="space-y-3">
      {matches.map(mm=><form key={mm.id} action={linkImportedDuplicate}>{hidden}<input type="hidden" name="matched_business_id" value={mm.id}/>
       <label className="flex items-start gap-2 text-amber-100"><input type="checkbox" name="confirm_same" value="yes"/>Same business as {mm.name}</label>
       <button type="submit" className="mt-1 text-amber-200 underline">Link to the existing record</button></form>)}
      <form action={updateStagedQualification} className="grid gap-2">{hidden}
       <p className="font-semibold">Override qualification</p>
       <select aria-label="Primary opportunity override" name="primary_opportunity_override" className="!py-1.5 text-xs" defaultValue={row.primary_opportunity_override||''}><option value="">Opportunity: automatic (campaign lane)</option>{OPPORTUNITIES.map(o=><option key={o} value={o}>{opportunityLabels[o]}</option>)}</select>
       <select aria-label="Evidence confidence override" name="evidence_confidence_override" className="!py-1.5 text-xs" defaultValue={row.evidence_confidence_override||''}><option value="">Confidence: automatic</option>{CONFIDENCES.map(o=><option key={o} value={o}>{confidenceLabels[o]}</option>)}</select>
       <select aria-label="Next action override" name="next_action_override" className="!py-1.5 text-xs" defaultValue={row.next_action_override||''}><option value="">Next action: automatic</option>{NEXT_ACTIONS.map(o=><option key={o} value={o}>{nextActionLabels[o]}</option>)}</select>
       <button className="justify-self-start text-cyan-300 underline" type="submit">Save overrides</button>
      </form>
     </div>
     <div className="space-y-3">
      <form action={triageStagedRow} className="grid gap-2">{hidden}
       <p className="font-semibold">Disqualify with evidence</p>
       <textarea name="disqualification_reason" rows={2} maxLength={500} className="!py-1.5 text-xs" placeholder="e.g., City license shows closed; outside service area" defaultValue={row.disqualification_reason||''}/>
       <button className="justify-self-start text-amber-200 underline" name="triage" value="disqualify">Disqualify</button>
      </form>
      <form action={skipImportedRow}>{hidden}<button className="text-[#8fa9b5] underline" type="submit">Skip (remove from queue)</button></form>
     </div>
    </div>
   </Fold>
   <Fold title="Source record (raw evidence)">
    <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">{SOURCE_FIELDS.filter(k=>typeof raw[k]==='string'&&String(raw[k]).trim()).map(k=><div key={k} className="min-w-0">
     <dt className="muted inline">{k}: </dt><dd className="inline break-words">{String(raw[k]).slice(0,200)}</dd></div>)}</dl>
    <p className="muted mt-1 text-[11px]">Source category as recorded: {row.category||'none'}. Source type: {row.source_type||'unknown'}.</p>
   </Fold>
  </div>}
 </article>;
}

// Research triage. Qualification is deterministic and evidence-only; it does not certify businesses or estimate spend.
export default async function ImportPage({searchParams}:{searchParams:Promise<Params>}){
 const {supabase,organizationId}=await requireWorkspace();
 const p=await searchParams;
 const readRows=(columns:string)=>collectAllPages<StagedRow>(async (from,to)=>{
  const {data,error}=await supabase.from('lead_import_rows').select(columns)
   .eq('organization_id',organizationId).in('review_status',['pending','imported','duplicate'])
   .order('created_at',{ascending:false}).order('row_number',{ascending:true})
   .order('id',{ascending:true}).range(from,to);
  return {data:data as unknown as StagedRow[]|null,error};
 });
 let needsMigration=false;
 const [all,businesses,{campaigns},{data:demoRows}]=await Promise.all([
  readRows(BASE_COLUMNS+NEW_COLUMNS).catch(()=>{needsMigration=true;return readRows(BASE_COLUMNS);}),
  collectAllPages<BusinessIdentity>(async (from,to)=>{
   const {data,error}=await supabase.from('businesses')
    .select('id,name,city,street_address,postal_code,phone,website_url,contact_email')
    .eq('organization_id',organizationId).order('created_at',{ascending:true})
    .order('id',{ascending:true}).range(from,to);
   return {data,error};
  }),
  listCampaigns(supabase,organizationId),
  supabase.from('demo_sites').select('business_id').eq('organization_id',organizationId).limit(2000)
 ]);
 const withDemo=new Set((demoRows??[]).map(d=>d.business_id as string));
 const publicListKnown:KnownBusiness[]=[...getProspectKnownBusinesses(),
  ...all.filter(r=>r.name).map(r=>({name:r.name!,address:typeof r.raw_data?.address==='string'?r.raw_data.address:typeof r.raw_data?.street==='string'?r.raw_data.street:null,kind:'staged' as const})),
  ...businesses.filter(b=>b.name).map(b=>({name:b.name,address:b.street_address??null,kind:'crm' as const}))];
 const campaignById=new Map(campaigns.map(c=>[c.id,c]));
 const showTests=p.tests==='1';
 const one=<T extends string>(list:readonly T[],v:string|undefined)=>list.includes(v as T)?v as T:'';
 const f={
  query:(p.query||'').trim().slice(0,100),campaign:campaignById.has(p.campaign||'')?p.campaign!:p.campaign==='none'?'none':'',
  opportunity:one(OPPORTUNITIES,p.opportunity),strength:one(STRENGTHS,p.strength),confidence:one(CONFIDENCES,p.confidence),
  readiness:one(READINESS,p.readiness),status:p.status==='all'?'all':one(RESEARCH_STATUSES,p.status),
  area:(p.area||'').slice(0,80),industry:one(['medical','landscaping','universal','unknown'] as const,p.industry),
  website:one(['official_site_recorded','social_only','ordering_only','none_recorded'] as const,p.website),
  target_fit:one(['likely_target','review_fit','possible_out_of_scope'] as const,p.target_fit),
  sort:one(['need','score','distance','newest','oldest'] as const,p.sort)||'need',tests:showTests?'1':''
 };
 const areaOf=(r:StagedRow)=>{
  if(hasEntityRegistryContext(r.raw_data))return '';
  const neighborhood=typeof r.raw_data?.neighborhood==='string'?r.raw_data.neighborhood.trim():'';
  if(neighborhood)return neighborhood;
  const postcode=String(r.raw_data?.postcode||'').match(/\b\d{5}\b/)?.[0];
  const postalAreas=['allston','brighton','brookline'] as const;
  const postalMatches=postalAreas.filter(area=>{
   const codes=area==='allston'?['02134','02163']:area==='brighton'?['02135']:['02445','02446','02447'];
   return Boolean(postcode&&codes.includes(postcode));
  });
  if(postalMatches.length===1)return postalMatches[0][0].toUpperCase()+postalMatches[0].slice(1);
  return r.city||'';
 };
 const scored:Scored[]=all.map(row=>{
  // A preexisting CRM record with this staging UUID means an earlier request
  // may have inserted the business before it could stamp the recovery link.
  const linked=businesses.find(b=>b.id===row.id);
  const recoveryBusinessId=row.matched_business_id||
    (linked&&normalizeBusiness(linked.name)===normalizeBusiness(row.name||'')?linked.id:null);
  const email=typeof row.raw_data?.contactemail==='string'?row.raw_data.contactemail:typeof row.raw_data?.email==='string'?row.raw_data.email:null;
  const matches=row.review_status==='pending'&&!recoveryBusinessId?potentialMatches({...row,website_url:recordedWebsite(row.website_url,row.raw_data),contact_email:email},businesses):[];
  const campaign=row.campaign_id?campaignById.get(row.campaign_id)??null:null;
  const q=qualifyStagedRow(row,{targetService:campaign?.target_service??null,duplicateWarning:matches.length>0,
   targetArea:campaign?.target_area??null,hasDemo:Boolean(row.matched_business_id&&withDemo.has(row.matched_business_id))});
  const industryTemplate=q.industry==='Industry not yet verified'?'unknown':classifyIndustry(row.name||'',q.industry).template||'unknown';
  return {row,q,matches,campaign,area:areaOf(row),industryTemplate,recoveryBusinessId};
 });
 const isTestRow=(x:Scored)=>isTestCampaign(x.campaign);
 const visible=scored.filter(x=>showTests||!isTestRow(x));
 const pendingTotal=all.filter(x=>x.review_status==='pending').length;
 const pendingVisible=visible.filter(x=>x.row.review_status==='pending').length;
 const pendingTest=pendingTotal-pendingVisible;
 const byScore=(a:Scored,b:Scored)=>Number(b.q.researchStatus==='shortlisted')-Number(a.q.researchStatus==='shortlisted')||
  b.q.score-a.q.score||a.row.created_at.localeCompare(b.row.created_at);
 const fitOrder=(q:Qualification)=>q.targetFit==='likely_target'?0:q.targetFit==='review_fit'?1:2;
 const byNeed=(a:Scored,b:Scored)=>compareQualificationNeed(a.q,b.q)||fitOrder(a.q)-fitOrder(b.q)||
  Number(b.q.researchStatus==='shortlisted')-Number(a.q.researchStatus==='shortlisted')||a.row.created_at.localeCompare(b.row.created_at);
 const distanceOf=(x:Scored)=>{const n=Number(x.row.raw_data?.distance_miles);return Number.isFinite(n)&&n>=0?n:null;};
 const byDistance=(a:Scored,b:Scored)=>{
  const ad=distanceOf(a),bd=distanceOf(b);
  return (ad??Infinity)-(bd??Infinity)||(ad===null?byNeed(a,b):0);
 };
 // Campaign candidates rank by evidence-backed need first. The overall score remains secondary.
 const next10=visible.filter(x=>x.campaign&&!isTestRow(x)&&(!f.campaign||x.row.campaign_id===f.campaign)&&
  (x.q.researchStatus==='review_needed'||x.q.researchStatus==='shortlisted')).sort(byNeed).slice(0,10);
 const areas=[...new Set(visible.map(x=>x.area).filter(Boolean))].sort();
 const counts=Object.fromEntries(RESEARCH_STATUSES.map(s=>[s,visible.filter(x=>x.q.researchStatus===s).length])) as Record<typeof RESEARCH_STATUSES[number],number>;
 const normalized=f.query.toLocaleLowerCase();
 const filtered=visible.filter(x=>{
  const s=x.q.researchStatus;
  if(f.status===''&&!(s==='review_needed'||s==='shortlisted'))return false;
  if(f.status&&f.status!=='all'&&s!==f.status)return false;
  if(f.campaign==='none'?x.row.campaign_id:f.campaign&&x.row.campaign_id!==f.campaign)return false;
  if(f.opportunity&&x.q.primaryOpportunity!==f.opportunity)return false;
  if(f.strength&&x.q.opportunityStrength!==f.strength)return false;
  if(f.confidence&&x.q.evidenceConfidence!==f.confidence)return false;
  if(f.readiness&&x.q.contactReadiness!==f.readiness)return false;
  if(f.area&&x.area!==f.area)return false;
  if(f.industry&&x.industryTemplate!==f.industry)return false;
  if(f.website&&x.q.websitePresence!==f.website)return false;
  if(f.target_fit&&x.q.targetFit!==f.target_fit)return false;
  if(normalized&&![x.row.name,x.row.city,x.row.category,x.area].some(v=>(v||'').toLocaleLowerCase().includes(normalized)))return false;
  return true;
 }).sort((a,b)=>f.sort==='newest'?b.row.created_at.localeCompare(a.row.created_at):
  f.sort==='oldest'?a.row.created_at.localeCompare(b.row.created_at):f.sort==='score'?byScore(a,b):f.sort==='distance'?byDistance(a,b):byNeed(a,b));
 const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
 const requested=Number(p.page);
 const page=Number.isInteger(requested)?Math.max(1,Math.min(pages,requested)):1;
 const shown=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
 const query=(n:number|null,extra:Partial<Record<string,string>>={})=>{
  const q=new URLSearchParams();
  for(const [k,v] of Object.entries({...f,...extra}))if(v&&!(k==='sort'&&v==='need'))q.set(k,v);
  if(n&&n>1)q.set('page',String(n));
  return '/app/leads/import'+(q.size?'?'+q.toString():'');
 };
 const here=query(page);
 const err=p.err?p.err.slice(0,240):null;
 const errFor=(id:string)=>err&&p.row===id?err:null;
 const select=(name:string,label:string,value:string,options:[string,string][],all='All')=><label className="text-xs">{label}
  <select className="mt-1 !py-2 text-sm" name={name} defaultValue={value}><option value="">{all}</option>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>;
 const realCampaigns=campaigns.filter(c=>!isTestCampaign(c));
 const stage=(label:string,n:number|string,href?:string)=><li className="flex items-center gap-2">
  {href?<Link href={href} className="text-cyan-200 underline">{label}</Link>:<span>{label}</span>}<span className="muted tabular-nums">{n}</span></li>;
 const realPending=visible.filter(x=>x.campaign&&!isTestRow(x));
 return <main className="max-w-6xl">
  <Link href="/app/leads" className="muted text-sm">← Business CRM</Link>
  <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
   <div><p className="kicker">Daily prospect workflow</p><h1 className="mt-2 text-3xl font-semibold">Prospect Research Queue</h1>
   <p className="muted mt-2 max-w-3xl text-sm leading-6">Verified website, GBP or SEO gaps come first. Unknown means more research, not a sales opportunity.</p></div>
   <div className="flex flex-wrap gap-3"><Link className="btn" href="/app/discovery">New campaign</Link><Link className="btn" href="/app/opportunities">Opportunity Board →</Link></div>
  </div>
  <p className="muted mt-4 text-xs">Intake scope: {pendingTotal} pending rows across all campaigns; {pendingTest} are in hidden test campaigns. This view shows {pendingVisible} pending rows plus imported and duplicate records. Workflow counts below summarize real-campaign progress.</p>
  <ol aria-label="Real-campaign workflow counts" className="mt-3 flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-[#2b4350] p-3 text-xs">
   {stage('1 Campaign',realCampaigns.length,'/app/discovery')}
   {stage('2 Review',realPending.filter(x=>x.q.progress==='discovered'||x.q.progress==='needs_review').length)}
   {stage('3 Qualify',realPending.filter(x=>x.q.progress==='qualified').length)}
   {stage('4 Import',realPending.filter(x=>x.q.researchStatus==='imported').length)}
   {stage('5 Build demo',realPending.filter(x=>['demo_ready','pitch_ready','outreach_ready'].includes(x.q.progress)).length,'/app/demos')}
   {stage('6 Prepare pitch',realPending.filter(x=>['pitch_ready','outreach_ready'].includes(x.q.progress)).length,'/app/opportunities')}
  </ol>
  {needsMigration&&<p role="alert" className="panel mt-4 p-4 text-sm text-amber-200">Campaigns and triage need migration 0007. Actions will fail until it is applied.</p>}
  {err&&!scored.some(x=>x.row.id===p.row)&&<p role="alert" className="panel mt-4 border-rose-700/60 p-4 text-sm text-rose-100">{err}</p>}
  <section className="mt-6" aria-labelledby="next10">
   <div className="flex flex-wrap items-baseline justify-between gap-3">
    <div><h2 id="next10" className="text-xl font-semibold">Next {next10.length||10} to research</h2>
     <p className="muted mt-1 text-xs">Observed website, GBP or SEO gaps rank first. Fit is only a name/category clue; confirm ownership and activity yourself.</p></div>
    <span className="muted text-xs">{f.campaign&&campaignById.get(f.campaign)?'Campaign: '+campaignById.get(f.campaign)!.name:'All real campaigns'} · test records excluded</span>
   </div>
   {next10.length>0&&!next10.some(x=>x.q.isPriorityLead)&&<p className="panel border-amber-700/50 p-4 text-sm text-amber-100">No candidate in this campaign currently has an evidence-backed website, GBP or SEO gap. Treat these as research cases, not a pitch-ready shortlist.</p>}
   <div className="mt-3 space-y-3">{next10.map(x=><CandidateCard key={x.row.id} x={x} here={here} err={errFor(x.row.id)}/>)}</div>
   {!next10.length&&<p className="panel muted mt-3 p-6 text-sm">No real-campaign candidates are waiting. Start a campaign on Prospect Discovery.</p>}
  </section>
  <details className="panel mt-8 p-5" open={Boolean(f.status||f.opportunity||f.strength||f.confidence||f.readiness||f.area||f.industry||f.website||f.target_fit||f.query||p.page||showTests)}>
   <summary className="cursor-pointer text-sm font-semibold">Browse all candidates, filters and test records ({visible.length})</summary>
   <nav aria-label="Research status" className="mt-4 flex flex-wrap gap-2 text-sm">
    {([['','Active',counts.review_needed+counts.shortlisted],...RESEARCH_STATUSES.map(s=>[s,researchStatusLabels[s],counts[s]] as const),['all','All',visible.length]] as const).map(([v,l,n])=>
     <Link key={v||'active'} href={query(null,{status:v,page:''})} aria-current={f.status===v?'page':undefined}
      className={'rounded-full border px-3 py-1.5 '+(f.status===v?'border-cyan-400 bg-cyan-500/10 text-cyan-100':'border-[#2b4350] text-[#a8bfcb] hover:text-white')}>{l} <span className="muted">{n}</span></Link>)}
    <Link href={query(null,{tests:showTests?'':'1',page:''})} className="rounded-full border border-dashed border-[#3a5260] px-3 py-1.5 text-[#a8bfcb]">{showTests?'Hide test records':'Show test records'}</Link>
   </nav>
   <form method="get" action="/app/leads/import" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
    <input type="hidden" name="status" value={f.status}/>{showTests&&<input type="hidden" name="tests" value="1"/>}
    <label className="text-xs">Search<input className="mt-1 !py-2 text-sm" name="query" defaultValue={f.query} maxLength={100} placeholder="Name, category, area"/></label>
    {select('campaign','Campaign',f.campaign,[['none','No campaign'],...campaigns.filter(c=>showTests||!isTestCampaign(c)).map(c=>[c.id,c.name+(isTestCampaign(c)?' (test)':'')] as [string,string])])}
    {select('opportunity','Primary opportunity',f.opportunity,OPPORTUNITIES.map(x=>[x,opportunityLabels[x]]))}
    {select('strength','Opportunity strength',f.strength,STRENGTHS.map(x=>[x,strengthLabels[x]]))}
    {select('confidence','Evidence confidence',f.confidence,CONFIDENCES.map(x=>[x,confidenceLabels[x]]))}
    {select('readiness','Contact readiness',f.readiness,READINESS.map(x=>[x,readinessLabels[x]]))}
    {select('area','Area',f.area,areas.map(a=>[a,a]))}
    {select('industry','Industry',f.industry,[['medical','Medical / dental'],['landscaping','Home & field services'],['universal','Other verified industry'],['unknown','Industry not yet verified']])}
    {select('website','Website presence',f.website,[['official_site_recorded','Official site recorded'],['social_only','Social / directory only'],['ordering_only','Third-party ordering only'],['none_recorded','None recorded']])}
    {select('target_fit','Target fit clue',f.target_fit,[['likely_target','Likely local prospect'],['review_fit','Target fit unclear'],['possible_out_of_scope','Possible poor fit']])}
    <label className="text-xs">Sort<select className="mt-1 !py-2 text-sm" name="sort" defaultValue={f.sort}>
     <option value="need">Evidence-backed need first</option><option value="distance">Closest to Brighton Center</option><option value="score">Highest research score</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
    <div className="flex items-end gap-3 lg:col-span-5"><button type="submit" className="btn !py-2 text-sm">Apply filters</button><Link href="/app/leads/import" className="text-xs text-cyan-300 underline">Clear</Link>
     <span className="muted ml-auto text-xs">{filtered.length} matching · page {page}/{pages}</span></div>
   </form>
   <div className="mt-4 space-y-3">{shown.map(x=><CandidateCard key={x.row.id} x={x} here={here} err={errFor(x.row.id)} compact/>)}</div>
   {!shown.length&&<p className="muted mt-4 text-sm">No candidates match these filters.</p>}
   {pages>1&&<nav aria-label="Queue pages" className="mt-4 flex items-center justify-end gap-5 text-sm">
    {page>1&&<Link className="text-cyan-300 underline" href={query(page-1)}>← Previous</Link>}
    <span className="muted">{page} of {pages}</span>
    {page<pages&&<Link className="text-cyan-300 underline" href={query(page+1)}>Next →</Link>}
   </nav>}
  </details>
  <details id="public-list" className="panel mt-6 p-5" open={Boolean(p.public_staged||p.public_error)}>
   <summary className="cursor-pointer text-sm font-semibold">Stage a public business list (license or directory export)</summary>
   <p className="muted mt-2 text-xs">Discovery input only. Repeated license rows for one business are combined; different businesses at one address stay separate. Candidates already in the roster, screening ledger, this queue or the CRM are skipped. Every staged row needs current-operation, exact Maps identity, a website-or-Maps gap and a separate second need before it can count.</p>
   <PublicListImport known={publicListKnown} action={stagePublicBusinessList}/>
   {p.public_staged&&<p className="mt-3 text-sm text-cyan-200">{p.public_staged} new candidates staged for review from {p.public_rows} rows; {p.public_skipped} skipped as already known or out of scope.</p>}
   {p.public_error&&<p role="alert" className="mt-3 text-sm text-red-300">{p.public_error==='file'?'Select a CSV under 750 KB.':p.public_error==='headers'?'Use exactly these headers: business_name, address, category, source (1–1,000 rows).':'The CSV could not be parsed; check quoted cells.'}</p>}
  </details>
  <details className="panel mt-6 p-5">
   <summary className="cursor-pointer text-sm font-semibold">Stage a CSV file</summary>
   <p className="muted mt-2 text-xs">Up to 500 rows, 750 KB. Headers: business_name (or entity_name / legal_name), city or municipality, category, website, phone, source_url, source_type. Optional evidence: registered_address, postcode, entity_id, entity_type, google_business_url, service_area, locations, email, contact_name. Keep the original government record link and export date in the file.</p>
   <form action={stageCsv} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <label className="text-xs">CSV file (.csv)<input name="csv_file" type="file" accept=".csv,text/csv" className="mt-1" required /></label>
    <label className="text-xs">Existing campaign (optional)<select name="campaign_id" className="mt-1 !py-2 text-sm" defaultValue="">
     <option value="">None, or create one</option>{campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label className="text-xs">New campaign name (optional)<input name="campaign_name" className="mt-1 !py-2 text-sm" maxLength={120}/></label>
    <label className="text-xs">Target area<input name="target_area" className="mt-1 !py-2 text-sm" maxLength={120}/></label>
    <label className="text-xs">Target industry keyword<input name="target_industry" className="mt-1 !py-2 text-sm" maxLength={60}/></label>
    <label className="text-xs">Target service<select name="target_service" className="mt-1 !py-2 text-sm" defaultValue="website_design">
     {TARGET_SERVICES.map(x=><option key={x} value={x}>{targetServiceLabels[x]}</option>)}</select></label>
    <div><button className="btn !py-2 text-sm" type="submit">Stage for review</button></div>
   </form>
   {p.staged&&<p className="mt-3 text-sm text-cyan-200">{p.staged} rows staged.</p>}
   {p.error&&<p role="alert" className="mt-3 text-sm text-red-300">{p.error==='file'?'Select a CSV under 750 KB.':p.error==='length'?'Include a header and 1–500 records.':'The CSV could not be parsed; check quoted cells.'}</p>}
  </details>
  <p className="muted mt-4 text-xs">Internal triage, not a purchase prediction. Registration helps confirm a legal entity, not whether the public-facing business is active or needs your service. Verify identity before any outreach or demo sharing.</p>
 </main>;
}
