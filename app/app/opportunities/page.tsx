import Link from 'next/link';
import {requireWorkspace} from '@/lib/workspace';
import {collectAllPages} from '@/lib/lead-identity';
import {scoreOpportunity,sortOpportunities,stageLabels,
 type OpportunityBusiness,type AuditRecord,type BoardStage} from '@/lib/opportunity-board';

type Params={stage?:string;q?:string;page?:string};
const PAGE_SIZE=40;
const stages=Object.keys(stageLabels) as BoardStage[];
export default async function OpportunitiesPage({searchParams}:{searchParams:Promise<Params>}){
 const {supabase,organizationId}=await requireWorkspace();
 const p=await searchParams;
 const [businesses,audits]=await Promise.all([
  collectAllPages<OpportunityBusiness>(async(from,to)=>{
   const {data,error}=await supabase.from('businesses').select(
    'id,name,category,city,service_area,website_url,verification_status,operational_status,priority_score,phone,contact_email')
    .eq('organization_id',organizationId).order('created_at',{ascending:false})
    .order('id',{ascending:true}).range(from,to);
   return {data,error};
  }),
  collectAllPages<AuditRecord>(async(from,to)=>{
   const {data,error}=await supabase.from('website_assessments')
     .select('business_id,website_url,status,assessed_at,findings')
     .eq('organization_id',organizationId).order('assessed_at',{ascending:false})
     .order('id',{ascending:false}).range(from,to);
   return {data,error};
  })
 ]);
 const auditsById=new Map<string,AuditRecord[]>();
 for(const audit of audits){
  const list=auditsById.get(audit.business_id)||[];
  list.push(audit);
  auditsById.set(audit.business_id,list);
 }
 const all=sortOpportunities(businesses.map(b=>scoreOpportunity(b,auditsById.get(b.id)||[])));
 const stage=stages.includes(p.stage as BoardStage)?p.stage as BoardStage|null:null;
 const q=(p.q||'').trim().slice(0,100);
 const searched=all.filter(x=>(!stage||x.stage===stage)&&(!q||
   [x.business.name,x.business.city,x.business.category,x.business.service_area]
     .some(v=>(v||'').toLocaleLowerCase().includes(q.toLocaleLowerCase()))));
 const pages=Math.max(1,Math.ceil(searched.length/PAGE_SIZE));
 const req=Number(p.page);
 const page=Number.isInteger(req)?Math.max(1,Math.min(pages,req)):1;
 const results=searched.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
 const counts=Object.fromEntries(stages.map(x=>[x,all.filter(y=>y.stage===x).length])) as Record<BoardStage,number>;
 const href=(n:number)=>{
  const params=new URLSearchParams();
  if(q)params.set('q',q);
  if(stage)params.set('stage',stage);
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
  <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
   {stages.map(s=><Link href={'/app/opportunities?stage='+s} className="panel p-5 hover:border-cyan-700/50" key={s}>
    <p className="muted text-sm">{stageLabels[s]}</p><p className="mt-3 text-3xl font-semibold">{counts[s]}</p>
   </Link>)}
  </section>
  <section className="panel mt-7 p-6">
   <form action="/app/opportunities" method="get" className="grid gap-4 sm:grid-cols-[1fr_260px_auto]">
    <label className="text-sm">Search prospects<input name="q" maxLength={100} className="mt-2" defaultValue={q} placeholder="Business, industry, or area"/></label>
    <label className="text-sm">Next action<select name="stage" className="mt-2" defaultValue={stage||''}>
      <option value="">All opportunities</option>{stages.map(x=><option key={x} value={x}>{stageLabels[x]}</option>)}
    </select></label>
    <div className="flex items-end gap-4"><button className="btn" type="submit">Filter</button><Link href="/app/opportunities" className="text-sm text-cyan-300 underline">Clear</Link></div>
   </form>
   <p className="muted mt-4 text-xs">Sorted by actionability, recent measured technical improvement, then research priority. No invented revenue estimates or commercial scores. PageSpeed results older than 90 days or for a different website are not treated as current.</p>
  </section>
  <section className="panel mt-7 overflow-x-auto">
   <div className="flex flex-wrap items-center justify-between gap-3 p-6"><h2 className="text-xl font-semibold">Research and outreach candidates</h2>
    <span className="muted text-xs">{searched.length} matching CRM businesses · page {page}/{pages}</span></div>
   <table><thead><tr><th>Business</th><th>Research status</th><th>Measured technical signal</th><th>What the evidence supports</th><th>Next step</th></tr></thead>
    <tbody>{results.map(x=><tr key={x.business.id}>
     <td>
      <Link className="font-semibold text-cyan-200 underline" href={'/app/leads/'+x.business.id}>{x.business.name} ↗</Link>
      <small className="muted mt-1 block">{x.business.city||'Location not verified'} · {x.business.category||'Industry unclassified'}</small>
     </td>
     <td><span className="text-sm">{stageLabels[x.stage]}</span><small className="muted mt-2 block">Source/operating verification: {x.verified?'Confirmed in CRM':'Not fully confirmed'}</small></td>
     <td>{x.technicalScore!==null?<strong className="text-xl">{x.technicalScore}/100</strong>:<span className="muted text-xs">No current comparable signal</span>}
      <small className="muted mt-1 block">{x.measuredAt?new Date(x.measuredAt).toLocaleDateString('en-US'):'Not measured'}</small></td>
     <td className="max-w-sm text-sm leading-6">{x.reason}</td>
     <td><div className="flex flex-col gap-2 text-sm">
      <Link className="text-cyan-300 underline" href={'/app/leads/'+x.business.id}>Review company →</Link>
      {x.business.website_url&&<Link className="text-cyan-300 underline" href={'/app/intelligence?business='+x.business.id}>Audit this website →</Link>}
     </div></td>
    </tr>)}</tbody></table>
   {!results.length&&<p className="muted p-8 text-sm">No CRM businesses match these filters. Discovered businesses enter this board after manual intake approval.</p>}
   {pages>1&&<nav className="flex items-center justify-end gap-5 border-t border-[#273b48] p-5 text-sm" aria-label="Opportunity pages">
    {page>1&&<Link className="text-cyan-300 underline" href={href(page-1)}>← Previous</Link>}
    <span className="muted">{page} / {pages}</span>
    {page<pages&&<Link className="text-cyan-300 underline" href={href(page+1)}>Next →</Link>}
   </nav>}
  </section>
  <p className="muted mt-5 text-xs">Internal triage only. A full commercial opportunity assessment still requires human research into the business, decision maker, actual marketing needs, and ability to invest.</p>
 </main>;
}
