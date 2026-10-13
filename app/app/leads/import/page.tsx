import Link from 'next/link';
import {requireWorkspace} from '@/lib/workspace';
import {approveImportedRow,linkImportedDuplicate,skipImportedRow,stageCsv,triageStagedRow,updateStagedQualification} from '../actions';
import {collectAllPages,potentialMatches,type BusinessIdentity} from '@/lib/lead-identity';
import {classifyIndustry,industryLabel,researchPriority} from '@/lib/business-classification';
import {independentWebsite,discoveredProfile} from '@/lib/web-presence';
import {listCampaigns} from '@/lib/discovery-campaigns-server';
import {TARGET_SERVICES,targetServiceLabels} from '@/lib/discovery-campaigns';
import {qualifyStagedRow,OPPORTUNITIES,STRENGTHS,CONFIDENCES,READINESS,NEXT_ACTIONS,RESEARCH_STATUSES,
 opportunityLabels,strengthLabels,confidenceLabels,readinessLabels,nextActionLabels,researchStatusLabels,websitePresenceLabels,
 type Qualification} from '@/lib/prospect-qualification';

function safeExternalUrl(value:string|null|undefined):string|null{
 if(!value)return null;
 try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.toString():null;}
 catch{return null;}
}
type FilterKey='query'|'campaign'|'opportunity'|'strength'|'confidence'|'readiness'|'status'|'area'|'industry'|'website'|'sort'|'page';
type Params=Partial<Record<FilterKey|'staged'|'error',string>>;
type StagedRow={
 id:string;name:string|null;city:string|null;category:string|null;source_url:string|null;source_type:string|null;
 website_url:string|null;phone:string|null;review_status:string;matched_business_id:string|null;row_number:number;
 created_at:string;raw_data:Record<string,unknown>|null;campaign_id?:string|null;triage_status?:string|null;
 primary_opportunity_override?:string|null;evidence_confidence_override?:string|null;next_action_override?:string|null;
 disqualification_reason?:string|null;
};
const BASE_COLUMNS='id,name,city,category,source_url,source_type,website_url,phone,review_status,matched_business_id,row_number,created_at,raw_data';
const NEW_COLUMNS=',campaign_id,triage_status,primary_opportunity_override,evidence_confidence_override,next_action_override,disqualification_reason';
const PAGE_SIZE=30;
const strengthRank={strong:3,moderate:2,weak:1,unknown:0} as const;
const confidenceRank={high:3,medium:2,low:1,unknown:0} as const;
const chip=(tone:'good'|'warn'|'mute'|'info')=>'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold '+
 (tone==='good'?'border-emerald-700/60 text-emerald-200':tone==='warn'?'border-amber-700/60 text-amber-200':tone==='info'?'border-cyan-700/60 text-cyan-200':'border-[#34505c] text-[#9fb6c0]');
const strengthTone=(s:Qualification['opportunityStrength'])=>s==='strong'?'good':s==='moderate'?'info':s==='weak'?'mute':'mute';

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
 const [all,businesses,{campaigns}]=await Promise.all([
  readRows(BASE_COLUMNS+NEW_COLUMNS).catch(()=>{needsMigration=true;return readRows(BASE_COLUMNS);}),
  collectAllPages<BusinessIdentity>(async (from,to)=>{
   const {data,error}=await supabase.from('businesses')
    .select('id,name,city,street_address,postal_code,phone,website_url')
    .eq('organization_id',organizationId).order('created_at',{ascending:true})
    .order('id',{ascending:true}).range(from,to);
   return {data,error};
  }),
  listCampaigns(supabase,organizationId)
 ]);
 const campaignById=new Map(campaigns.map(c=>[c.id,c]));
 const one=<T extends string>(list:readonly T[],v:string|undefined)=>list.includes(v as T)?v as T:'';
 const f={
  query:(p.query||'').trim().slice(0,100),campaign:campaignById.has(p.campaign||'')?p.campaign!:p.campaign==='none'?'none':'',
  opportunity:one(OPPORTUNITIES,p.opportunity),strength:one(STRENGTHS,p.strength),confidence:one(CONFIDENCES,p.confidence),
  readiness:one(READINESS,p.readiness),status:p.status==='all'?'all':one(RESEARCH_STATUSES,p.status),
  area:(p.area||'').slice(0,80),industry:one(['medical','landscaping','universal','unknown'] as const,p.industry),
  website:one(['official_site_recorded','social_only','none_recorded'] as const,p.website),
  sort:one(['newest','oldest'] as const,p.sort)||'qualification'
 };
 const areaOf=(r:StagedRow)=>(typeof r.raw_data?.search_area==='string'&&r.raw_data.search_area)||r.city||'';
 const scored=all.map(row=>{
  const matches=row.review_status==='pending'?potentialMatches(row,businesses):[];
  const campaign=row.campaign_id?campaignById.get(row.campaign_id)??null:null;
  const q=qualifyStagedRow(row,{targetService:campaign?.target_service??null,duplicateWarning:matches.length>0});
  const decision=classifyIndustry(row.name||'',row.category);
  return {row,q,matches,campaign,decision,area:areaOf(row),
   research:researchPriority(row.name||'',row.category,independentWebsite(row.website_url),row.source_url,row.city)};
 });
 const areas=[...new Set(scored.map(x=>x.area).filter(Boolean))].sort();
 const counts=Object.fromEntries(RESEARCH_STATUSES.map(s=>[s,scored.filter(x=>x.q.researchStatus===s).length])) as Record<typeof RESEARCH_STATUSES[number],number>;
 const normalized=f.query.toLocaleLowerCase();
 const filtered=scored.filter(x=>{
  const s=x.q.researchStatus;
  if(f.status===''&&!(s==='review_needed'||s==='shortlisted'))return false;
  if(f.status&&f.status!=='all'&&s!==f.status)return false;
  if(f.campaign==='none'?x.row.campaign_id:f.campaign&&x.row.campaign_id!==f.campaign)return false;
  if(f.opportunity&&x.q.primaryOpportunity!==f.opportunity)return false;
  if(f.strength&&x.q.opportunityStrength!==f.strength)return false;
  if(f.confidence&&x.q.evidenceConfidence!==f.confidence)return false;
  if(f.readiness&&x.q.contactReadiness!==f.readiness)return false;
  if(f.area&&x.area!==f.area)return false;
  if(f.industry&&(x.decision.template||'unknown')!==f.industry)return false;
  if(f.website&&x.q.websitePresence!==f.website)return false;
  if(normalized&&![x.row.name,x.row.city,x.row.category,x.area].some(v=>(v||'').toLocaleLowerCase().includes(normalized)))return false;
  return true;
 }).sort((a,b)=>f.sort==='newest'?b.row.created_at.localeCompare(a.row.created_at):
  f.sort==='oldest'?a.row.created_at.localeCompare(b.row.created_at):
  Number(b.q.researchStatus==='shortlisted')-Number(a.q.researchStatus==='shortlisted')||
  Number(b.q.isPriorityLead)-Number(a.q.isPriorityLead)||
  strengthRank[b.q.opportunityStrength]-strengthRank[a.q.opportunityStrength]||
  confidenceRank[b.q.evidenceConfidence]-confidenceRank[a.q.evidenceConfidence]||
  b.research-a.research||a.row.created_at.localeCompare(b.row.created_at));
 const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
 const requested=Number(p.page);
 const page=Number.isInteger(requested)?Math.max(1,Math.min(pages,requested)):1;
 const shown=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
 const query=(n:number|null,extra:Partial<Record<string,string>>={})=>{
  const q=new URLSearchParams();
  for(const [k,v] of Object.entries({...f,...extra}))if(v&&!(k==='sort'&&v==='qualification'))q.set(k,v);
  if(n&&n>1)q.set('page',String(n));
  return '/app/leads/import'+(q.size?'?'+q.toString():'');
 };
 const here=query(page);
 const select=(name:string,label:string,value:string,options:[string,string][],all='All')=><label className="text-xs">{label}
  <select className="mt-1 !py-2 text-sm" name={name} defaultValue={value}><option value="">{all}</option>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>;
 return <main className="max-w-7xl">
  <Link href="/app/leads" className="muted text-sm">← Business CRM</Link>
  <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
   <div><p className="kicker">Evidence-first triage</p><h1 className="mt-2 text-4xl font-semibold">Prospect Research Queue</h1>
   <p className="muted mt-3 max-w-4xl text-sm leading-6">Deterministic qualification from recorded evidence only. A missing website or GBP link means &ldquo;find or confirm&rdquo;, never &ldquo;they don&apos;t have one&rdquo;. Shortlist the strongest candidates, then import them to the CRM.</p></div>
   <div className="flex flex-wrap gap-3"><Link className="btn" href="/app/discovery">New discovery campaign</Link><Link className="btn" href="/app/opportunities">Opportunity Board →</Link></div>
  </div>
  {needsMigration&&<p role="alert" className="panel mt-6 p-4 text-sm text-amber-200">Campaigns, triage and qualification overrides need migration 0007_prospect_discovery.sql. Qualification below is computed but triage actions will fail until it is applied.</p>}
  <nav aria-label="Research status" className="mt-6 flex flex-wrap gap-2 text-sm">
   {([['','Active (review + shortlisted)',counts.review_needed+counts.shortlisted],...RESEARCH_STATUSES.map(s=>[s,researchStatusLabels[s],counts[s]] as const),['all','All',scored.length]] as const).map(([v,l,n])=>
    <Link key={v||'active'} href={query(null,{status:v,page:''})} aria-current={f.status===v?'page':undefined}
     className={'rounded-full border px-3 py-1.5 '+(f.status===v?'border-cyan-400 bg-cyan-500/10 text-cyan-100':'border-[#2b4350] text-[#a8bfcb] hover:text-white')}>{l} <span className="muted">{n}</span></Link>)}
  </nav>
  <section className="panel mt-4 p-5">
   <form method="get" action="/app/leads/import" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
    <input type="hidden" name="status" value={f.status}/>
    <label className="text-xs">Search<input className="mt-1 !py-2 text-sm" name="query" defaultValue={f.query} maxLength={100} placeholder="Name, category, area"/></label>
    {select('campaign','Campaign',f.campaign,[['none','No campaign'],...campaigns.map(c=>[c.id,c.name] as [string,string])])}
    {select('opportunity','Primary opportunity',f.opportunity,OPPORTUNITIES.map(x=>[x,opportunityLabels[x]]))}
    {select('strength','Opportunity strength',f.strength,STRENGTHS.map(x=>[x,strengthLabels[x]]))}
    {select('confidence','Evidence confidence',f.confidence,CONFIDENCES.map(x=>[x,confidenceLabels[x]]))}
    {select('readiness','Contact readiness',f.readiness,READINESS.map(x=>[x,readinessLabels[x]]))}
    {select('area','Area',f.area,areas.map(a=>[a,a]))}
    {select('industry','Industry hint',f.industry,[['medical','Medical / dental'],['landscaping','Home & field services'],['universal','Other business'],['unknown','Needs classification']])}
    {select('website','Website presence',f.website,[['official_site_recorded','Official site recorded'],['social_only','Social / directory only'],['none_recorded','None recorded']])}
    <label className="text-xs">Sort<select className="mt-1 !py-2 text-sm" name="sort" defaultValue={f.sort}>
     <option value="qualification">Strongest qualification first</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
    <div className="flex items-end gap-3 lg:col-span-5"><button type="submit" className="btn !py-2 text-sm">Apply filters</button><Link href="/app/leads/import" className="text-xs text-cyan-300 underline">Clear</Link>
     <span className="muted ml-auto text-xs">{filtered.length} matching · page {page}/{pages}</span></div>
   </form>
  </section>
  <section className="mt-5 space-y-3" aria-label="Candidates">
   {shown.map(({row,q,matches,campaign,decision,area})=>{
    const site=independentWebsite(row.website_url),profile=discoveredProfile(row.raw_data,row.website_url),source=safeExternalUrl(row.source_url);
    const pending=row.review_status==='pending';
    return <article key={row.id} className="panel p-4">
     <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto]">
      <div className="min-w-0">
       <h2 className="truncate text-base font-semibold">{row.name||'Missing name'}</h2>
       <p className="muted mt-0.5 truncate text-xs">{row.category||'No source category'} · {industryLabel(decision)}</p>
       <p className="muted truncate text-xs">{area||'Area unknown'}{row.city&&row.city!==area?' · '+row.city:''}</p>
       <p className="mt-1.5 flex flex-wrap gap-1.5">
        <span className={chip('mute')} title={campaign?targetServiceLabels[campaign.target_service]:''}>{campaign?campaign.name:'No campaign'}</span>
        <span className={chip(q.researchStatus==='shortlisted'?'info':q.researchStatus==='disqualified'?'warn':'mute')}>{researchStatusLabels[q.researchStatus]}</span>
        {matches.length>0&&<span className={chip('warn')}>Possible duplicate ({matches.length})</span>}
       </p>
      </div>
      <div className="text-xs leading-5">
       <p><span className={chip(strengthTone(q.opportunityStrength))}>{opportunityLabels[q.primaryOpportunity]} · {strengthLabels[q.opportunityStrength]}</span></p>
       <p className="mt-1.5"><span className="muted">Confidence</span> {confidenceLabels[q.evidenceConfidence]} · <span className="muted">Contact</span> {readinessLabels[q.contactReadiness]}</p>
       <p><span className="muted">Website</span> {websitePresenceLabels[q.websitePresence]} · <span className="muted">GBP</span> {q.gbpStatus==='recorded'?'Recorded':'Not confirmed'}</p>
       <p className="mt-1 flex flex-wrap gap-x-3">
        {source&&<a className="text-cyan-300 underline" href={source} target="_blank" rel="noopener noreferrer">Source ↗</a>}
        {site&&<a className="text-cyan-300 underline" href={site} target="_blank" rel="noopener noreferrer">Site ↗</a>}
        {profile&&<a className="text-amber-200 underline" href={profile} target="_blank" rel="noopener noreferrer">Profile ↗</a>}
       </p>
      </div>
      <div className="min-w-0 text-xs leading-5">
       <p><span className="muted">Next:</span> <strong>{nextActionLabels[q.nextAction]}</strong></p>
       <p className="mt-1 text-[#c4d6dd]">{q.rationale}</p>
       {q.reasons.length>1&&<p className="muted mt-1">{q.reasons.slice(1).join(' ')}</p>}
      </div>
      <div className="flex flex-col items-start gap-2 lg:items-end">
       {pending?<>
        {q.researchStatus!=='shortlisted'&&q.researchStatus!=='disqualified'&&<form action={triageStagedRow}><input type="hidden" name="row_id" value={row.id}/><input type="hidden" name="return_to" value={here}/><button className="btn !px-3 !py-1.5 text-xs" name="triage" value="shortlist">Shortlist</button></form>}
        {q.researchStatus!=='review_needed'&&<form action={triageStagedRow}><input type="hidden" name="row_id" value={row.id}/><input type="hidden" name="return_to" value={here}/><button className="text-xs text-cyan-300 underline" name="triage" value="restore">Restore to review</button></form>}
        {q.researchStatus!=='held'&&q.researchStatus!=='disqualified'&&<form action={triageStagedRow}><input type="hidden" name="row_id" value={row.id}/><input type="hidden" name="return_to" value={here}/><button className="text-xs text-[#a8bfcb] underline" name="triage" value="hold">Hold</button></form>}
       </>:<span className="muted text-xs">{row.review_status==='duplicate'?'Linked to existing record':'Imported'}{row.matched_business_id&&<> · <Link className="text-cyan-300 underline" href={'/app/leads/'+row.matched_business_id}>CRM ↗</Link></>}</span>}
      </div>
     </div>
     {pending&&<details className="mt-3 border-t border-[#243745] pt-3">
      <summary className="cursor-pointer text-xs font-semibold text-cyan-200">Qualify, import or disqualify</summary>
      <div className="mt-3 grid gap-4 lg:grid-cols-3">
       <form action={updateStagedQualification} className="grid gap-2 text-xs">
        <input type="hidden" name="row_id" value={row.id}/><input type="hidden" name="return_to" value={here}/>
        <p className="font-semibold">Adjust qualification</p>
        <label>Primary opportunity<select className="mt-1 !py-1.5 text-xs" name="primary_opportunity_override" defaultValue={row.primary_opportunity_override||''}>
         <option value="">Automatic (from evidence)</option>{OPPORTUNITIES.map(x=><option key={x} value={x}>{opportunityLabels[x]}</option>)}</select></label>
        <label>Evidence confidence<select className="mt-1 !py-1.5 text-xs" name="evidence_confidence_override" defaultValue={row.evidence_confidence_override||''}>
         <option value="">Automatic</option>{CONFIDENCES.map(x=><option key={x} value={x}>{confidenceLabels[x]}</option>)}</select></label>
        <label>Next action<select className="mt-1 !py-1.5 text-xs" name="next_action_override" defaultValue={row.next_action_override||''}>
         <option value="">Automatic</option>{NEXT_ACTIONS.map(x=><option key={x} value={x}>{nextActionLabels[x]}</option>)}</select></label>
        <button className="btn justify-self-start !px-3 !py-1.5 text-xs" type="submit">Save qualification</button>
       </form>
       <div className="grid content-start gap-3 text-xs">
        <p className="font-semibold">Import to CRM</p>
        <form action={approveImportedRow} className="space-y-2">
         <input type="hidden" name="row_id" value={row.id}/><input type="hidden" name="return_to" value={here}/>
         {matches.length>0&&<label className="flex items-start gap-2 text-amber-100"><input type="checkbox" name="confirm_distinct" value="yes" required/>I checked the possible matches; this is a separate business.</label>}
         <button className="btn !px-3 !py-1.5 text-xs" type="submit">{matches.length?'Import as separate business':'Import to CRM'}</button>
         <p className="muted">Carries campaign, opportunity, rationale, confidence and next action. Never sets a priority score.</p>
        </form>
        {matches.map(m=><form key={m.id} action={linkImportedDuplicate} className="rounded-lg border border-amber-900/40 p-2">
         <input type="hidden" name="row_id" value={row.id}/><input type="hidden" name="matched_business_id" value={m.id}/>
         <Link className="text-cyan-300 underline" href={'/app/leads/'+m.id} target="_blank">{m.name} ↗</Link>
         <span className="muted block">{m.city||'Location not recorded'} · {m.reason}</span>
         <label className="mt-1 flex items-start gap-2 text-amber-100"><input type="checkbox" name="confirm_same" value="yes" required/>Same business</label>
         <button type="submit" className="mt-1 text-amber-200 underline">Link to this existing record</button>
        </form>)}
       </div>
       <div className="grid content-start gap-3 text-xs">
        <form action={triageStagedRow} className="grid gap-2">
         <input type="hidden" name="row_id" value={row.id}/><input type="hidden" name="return_to" value={here}/>
         <p className="font-semibold">Disqualify with evidence</p>
         <textarea name="disqualification_reason" rows={2} minLength={8} maxLength={500} required className="!py-1.5 text-xs" placeholder="e.g., City license shows closed in 2025; existing client; outside service area" defaultValue={row.disqualification_reason||''}/>
         <button className="justify-self-start text-amber-200 underline" name="triage" value="disqualify">Disqualify</button>
        </form>
        <form action={skipImportedRow}><input type="hidden" name="row_id" value={row.id}/><button className="text-[#8fa9b5] underline" type="submit">Skip (remove from queue)</button></form>
       </div>
      </div>
     </details>}
    </article>;})}
   {!shown.length&&<p className="panel muted p-8 text-sm">No candidates match these filters.</p>}
  </section>
  {pages>1&&<nav aria-label="Queue pages" className="mt-4 flex items-center justify-end gap-5 text-sm">
   {page>1&&<Link className="text-cyan-300 underline" href={query(page-1)}>← Previous</Link>}
   <span className="muted">{page} of {pages}</span>
   {page<pages&&<Link className="text-cyan-300 underline" href={query(page+1)}>Next →</Link>}
  </nav>}
  <section className="panel mt-8 p-6">
   <h2 className="text-lg font-semibold">Stage a CSV file</h2>
   <p className="muted mt-2 text-xs">Up to 500 rows, 750 KB. Headers: business_name, city, category, website, phone, source_url, source_type. Optional evidence columns: street, postcode, google_business_url, service_area, locations, email, contact_name. Extra columns stay in the source data.</p>
   <form action={stageCsv} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <label className="text-xs">CSV file (.csv)<input name="csv_file" type="file" accept=".csv,text/csv" className="mt-1" required /></label>
    <label className="text-xs">Existing campaign (optional)<select name="campaign_id" className="mt-1 !py-2 text-sm" defaultValue="">
     <option value="">None, or create one</option>{campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label className="text-xs">New campaign name (optional)<input name="campaign_name" className="mt-1 !py-2 text-sm" maxLength={120} placeholder="e.g., Newton contractors CSV"/></label>
    <label className="text-xs">Target area<input name="target_area" className="mt-1 !py-2 text-sm" maxLength={120}/></label>
    <label className="text-xs">Target industry keyword<input name="target_industry" className="mt-1 !py-2 text-sm" maxLength={60}/></label>
    <label className="text-xs">Target service<select name="target_service" className="mt-1 !py-2 text-sm" defaultValue="website_design">
     {TARGET_SERVICES.map(x=><option key={x} value={x}>{targetServiceLabels[x]}</option>)}</select></label>
    <div><button className="btn !py-2 text-sm" type="submit">Stage for review</button></div>
   </form>
   {p.staged&&<p className="mt-3 text-sm text-cyan-200">{p.staged} rows staged.</p>}
   {p.error&&<p role="alert" className="mt-3 text-sm text-red-300">{p.error==='file'?'Select a CSV under 750 KB.':p.error==='length'?'Include a header and 1–500 records.':'The CSV could not be parsed; check quoted cells.'}</p>}
  </section>
  <p className="muted mt-4 text-xs">Qualification is internal triage, not a purchase prediction. Duplicate warnings are name-based, not automatic merges. Verify identity before any outreach or demo sharing.</p>
 </main>;
}
