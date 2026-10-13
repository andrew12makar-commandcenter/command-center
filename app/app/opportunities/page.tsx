import Link from 'next/link';
import CardNavigationStatus from './card-navigation-status';
import {requireWorkspace} from '@/lib/workspace';
import {collectAllPages} from '@/lib/lead-identity';
import {independentWebsite} from '@/lib/web-presence';
import {scoreOpportunity,sortOpportunities,stageLabels,
 type OpportunityBusiness,type AuditRecord,type BoardStage} from '@/lib/opportunity-board';

import {qualifyCrmBusiness,type SourceRow} from '@/lib/business-qualification-server';
import {listCampaigns} from '@/lib/discovery-campaigns-server';
import {OPPORTUNITIES,opportunityLabels,strengthLabels,confidenceLabels,nextActionLabels,type Opportunity} from '@/lib/prospect-qualification';

type Params={stage?:string;q?:string;page?:string;opportunity?:string;campaign?:string};
type BoardBusiness=OpportunityBusiness&{
 campaign_id?:string|null;primary_opportunity?:string|null;evidence_confidence?:string|null;next_action?:string|null;
 qualification_rationale?:string|null;google_business_url?:string|null;street_address?:string|null;postal_code?:string|null;contact_name?:string|null;
};
const BOARD_COLUMNS='id,name,category,city,service_area,website_url,verification_status,operational_status,pipeline_status,priority_score,phone,contact_email';
const QUALIFICATION_COLUMNS=',campaign_id,primary_opportunity,evidence_confidence,next_action,qualification_rationale,google_business_url,street_address,postal_code,contact_name';
const PAGE_SIZE=40;
const stages=Object.keys(stageLabels) as BoardStage[];
export default async function OpportunitiesPage({searchParams}:{searchParams:Promise<Params>}){
 const {supabase,organizationId}=await requireWorkspace();
 const p=await searchParams;
 const readBusinesses=(columns:string)=>collectAllPages<BoardBusiness>(async(from,to)=>{
   const {data,error}=await supabase.from('businesses').select(columns)
    .eq('organization_id',organizationId).order('created_at',{ascending:false})
    .order('id',{ascending:true}).range(from,to);
   return {data:data as unknown as BoardBusiness[]|null,error};
  });
 const [businesses,audits,sources,{campaigns}]=await Promise.all([
  readBusinesses(BOARD_COLUMNS+QUALIFICATION_COLUMNS).catch(()=>readBusinesses(BOARD_COLUMNS)),
  collectAllPages<AuditRecord>(async(from,to)=>{
   const {data,error}=await supabase.from('website_assessments')
     .select('business_id,website_url,status,assessed_at,findings')
     .eq('organization_id',organizationId).order('assessed_at',{ascending:false})
     .order('id',{ascending:false}).range(from,to);
   return {data,error};
  }),
  collectAllPages<SourceRow>(async(from,to)=>{
   const {data,error}=await supabase.from('business_sources').select('business_id,source_url,source_type,confidence')
    .eq('organization_id',organizationId).order('recorded_at',{ascending:true}).order('id',{ascending:true}).range(from,to);
   return {data,error};
  }),
  listCampaigns(supabase,organizationId)
 ]);
 const campaignById=new Map(campaigns.map(c=>[c.id,c]));
 const sourcesById=new Map<string,SourceRow[]>();
 for(const src of sources){const l=sourcesById.get(src.business_id)||[];l.push(src);sourcesById.set(src.business_id,l);}
 const auditsById=new Map<string,AuditRecord[]>();
 for(const audit of audits){
  const list=auditsById.get(audit.business_id)||[];
  list.push(audit);
  auditsById.set(audit.business_id,list);
 }
 const all=sortOpportunities(businesses.map(b=>scoreOpportunity(b,auditsById.get(b.id)||[])));
 const qualification=new Map(businesses.map(b=>{
  const campaign=b.campaign_id?campaignById.get(b.campaign_id)??null:null;
  return [b.id,{campaign,q:qualifyCrmBusiness(b,auditsById.get(b.id)||[],sourcesById.get(b.id)||[],campaign).q}];
 }));
 const opportunity=OPPORTUNITIES.includes(p.opportunity as Opportunity)?p.opportunity as Opportunity:'';
 const campaignFilter=campaignById.has(p.campaign||'')?p.campaign!:'';
 const stage=stages.includes(p.stage as BoardStage)?p.stage as BoardStage|null:null;
 const q=(p.q||'').trim().slice(0,100);
 const searched=all.filter(x=>(!stage||x.stage===stage)&&
   (!opportunity||qualification.get(x.business.id)?.q.primaryOpportunity===opportunity)&&
   (!campaignFilter||qualification.get(x.business.id)?.campaign?.id===campaignFilter)&&(!q||
   [x.business.name,x.business.city,x.business.category,x.business.service_area]
     .some(v=>(v||'').toLocaleLowerCase().includes(q.toLocaleLowerCase()))));
 const pages=Math.max(1,Math.ceil(searched.length/PAGE_SIZE));
 const req=Number(p.page);
 const page=Number.isInteger(req)?Math.max(1,Math.min(pages,req)):1;
 const results=searched.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
 const counts=Object.fromEntries(stages.map(x=>[x,all.filter(y=>y.stage===x).length])) as Record<BoardStage,number>;
 const selectedLabel=stage?stageLabels[stage]:null;
 const tileHref=(selected:BoardStage)=>{
  const params=new URLSearchParams();
  if(q)params.set('q',q);
  if(opportunity)params.set('opportunity',opportunity);
  if(campaignFilter)params.set('campaign',campaignFilter);
  // Clicking an already-selected tile clears its category filter.
  if(stage!==selected)params.set('stage',selected);
  return '/app/opportunities'+(params.size?'?'+params.toString():'')+'#opportunity-results';
 };
 const href=(n:number)=>{
  const params=new URLSearchParams();
  if(q)params.set('q',q);
  if(stage)params.set('stage',stage);
  if(opportunity)params.set('opportunity',opportunity);
  if(campaignFilter)params.set('campaign',campaignFilter);
  params.set('page',String(n));
  return '/app/opportunities?'+params.toString();
 };
 return <main className="max-w-7xl">
  <div className="flex flex-wrap items-end justify-between gap-4">
   <div>
    <p className="kicker">Phase 6 / Revenue pipeline intelligence</p>
    <h1 className="mt-3 text-4xl font-semibold">Opportunity Board</h1>
    <p className="muted mt-3 max-w-4xl leading-7">Turn discovered business records into inspectable next actions. A technical website issue is not proof of budget, owner interest, or likely sales.</p>
   </div>
   <Link className="btn" href="/app/leads/import">Review pending discovery →</Link>
  </div>
  <section aria-label="Filter businesses by next action" className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
   {stages.map(s=><Link
    key={s} href={tileHref(s)} scroll={true}
    aria-current={stage===s?'true':undefined}
    aria-label={stage===s?`${stageLabels[s]}, ${counts[s]} businesses, selected. Activate to show all categories.`:
      `${stageLabels[s]}, ${counts[s]} businesses. Activate to view matching prospects.`}
    className="panel opportunity-filter-card relative block cursor-pointer p-5"
   >
    <div className="flex flex-wrap items-start justify-between gap-2">
     <p className="text-sm text-[#a9c4cf]">{stageLabels[s]}</p>
     {stage===s&&<span className="text-xs font-semibold text-cyan-100">Selected ✓</span>}
    </div>
    <p className="mt-3 text-3xl font-semibold">{counts[s]}</p>
    <CardNavigationStatus/>
   </Link>)}
  </section>
  <section className="panel mt-7 p-6">
   <form action="/app/opportunities#opportunity-results" method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_220px_200px_200px_auto]">
    <label className="text-sm">Search prospects<input name="q" maxLength={100} className="mt-2" defaultValue={q} placeholder="Business, industry, or area"/></label>
    <label className="text-sm">Next action<select name="stage" className="mt-2" defaultValue={stage||''}>
      <option value="">All opportunities</option>{stages.map(x=><option key={x} value={x}>{stageLabels[x]}</option>)}
    </select></label>
    <label className="text-sm">Primary opportunity<select name="opportunity" className="mt-2" defaultValue={opportunity}>
      <option value="">All</option>{OPPORTUNITIES.map(x=><option key={x} value={x}>{opportunityLabels[x]}</option>)}</select></label>
    <label className="text-sm">Campaign<select name="campaign" className="mt-2" defaultValue={campaignFilter}>
      <option value="">All campaigns</option>{campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <div className="flex items-end gap-4"><button className="btn" type="submit">Filter</button><Link href="/app/opportunities" className="text-sm text-cyan-300 underline">Clear</Link></div>
   </form>
   <p className="muted mt-4 text-xs">Sorted by actionability, recent measured technical improvement, then research priority. No invented revenue estimates or commercial scores. PageSpeed results older than 90 days or for a different website are not treated as current.</p>
  </section>
  <section id="opportunity-results" tabIndex={-1} aria-label="Filtered opportunity results" className="panel mt-7 scroll-mt-6 overflow-x-auto">
   <div className="flex flex-wrap items-center justify-between gap-3 p-6">
    <div>
     <p className="kicker">{selectedLabel?`Filtered: ${selectedLabel}`:'All categories'}</p>
     <h2 className="mt-2 text-xl font-semibold">{selectedLabel||'Research and outreach candidates'}</h2>
     <p role="status" className="mt-2 text-sm text-cyan-200">
      {searched.length} matching {searched.length===1?'business':'businesses'}
      {q?` for “${q}”`:''} · page {page} of {pages}
     </p>
    </div>
    {(stage||q||opportunity||campaignFilter)&&<Link className="text-sm text-cyan-300 underline" href="/app/opportunities#opportunity-results">Show all categories ↗</Link>}
   </div>
   <table><thead><tr><th>Business</th><th>Research status</th><th>Measured technical signal</th><th>What the evidence supports</th><th>Next step</th></tr></thead>
    <tbody>{results.map(x=><tr key={x.business.id}>
     <td>
      <Link className="font-semibold text-cyan-200 underline" href={'/app/leads/'+x.business.id}>{x.business.name} ↗</Link>
      <small className="muted mt-1 block">{x.business.city||'Location not verified'} · {x.business.category||'Industry unclassified'}</small>
     </td>
     <td><span className="text-sm">{stageLabels[x.stage]}</span><small className="muted mt-2 block">Source/operating verification: {x.verified?'Confirmed in CRM':'Not fully confirmed'}</small></td>
     <td>{x.technicalScore!==null?<strong className="text-xl">{x.technicalScore}/100</strong>:<span className="muted text-xs">No current comparable signal</span>}
      <small className="muted mt-1 block">{x.measuredAt?new Date(x.measuredAt).toLocaleDateString('en-US'):'Not measured'}</small></td>
     <td className="max-w-sm text-sm leading-6">{(()=>{const qq=qualification.get(x.business.id);return qq&&<p className="mb-2 text-xs">
       <strong className="text-cyan-100">{opportunityLabels[qq.q.primaryOpportunity]} · {strengthLabels[qq.q.opportunityStrength]}</strong>
       <span className="muted"> · {confidenceLabels[qq.q.evidenceConfidence]} confidence · Next: {nextActionLabels[qq.q.nextAction]}</span>
       {qq.campaign&&<span className="muted block">Campaign: {qq.campaign.name}</span>}
      </p>;})()}{x.reason}</td>
     <td><div className="flex flex-col gap-2 text-sm">
      <Link className="text-cyan-300 underline" href={'/app/leads/'+x.business.id}>Review company →</Link>
      <Link className="text-cyan-300 underline" href={'/app/leads/'+x.business.id+'/brief'}>Opportunity brief →</Link>
      <Link className="text-cyan-300 underline" href={'/app/leads/'+x.business.id+'/pitch'}>Pitch brief →</Link>
      <Link className="text-cyan-300 underline" href={'/app/leads/'+x.business.id+'#website-demo'}>Website demo →</Link>
      {independentWebsite(x.business.website_url)&&<Link className="text-cyan-300 underline" href={'/app/intelligence?business='+x.business.id}>Audit this website →</Link>}
     </div></td>
    </tr>)}</tbody></table>
   {!results.length&&<p role="status" className="muted p-8 text-sm">No CRM businesses match this selection. Clear the filter or import a discovered business through Lead Intake.</p>}
   {pages>1&&<nav className="flex items-center justify-end gap-5 border-t border-[#273b48] p-5 text-sm" aria-label="Opportunity pages">
    {page>1&&<Link className="text-cyan-300 underline" href={href(page-1)+"#opportunity-results"}>← Previous</Link>}
    <span className="muted">{page} / {pages}</span>
    {page<pages&&<Link className="text-cyan-300 underline" href={href(page+1)+"#opportunity-results"}>Next →</Link>}
   </nav>}
  </section>
  <p className="muted mt-5 text-xs">Internal triage only. A full commercial opportunity assessment still requires human research into the business, decision maker, actual marketing needs, and ability to invest.</p>
 </main>;
}
