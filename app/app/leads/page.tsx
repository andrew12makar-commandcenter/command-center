import Link from 'next/link';
import {requireWorkspace} from '@/lib/workspace';

type Row={id:string;name:string;city:string|null;category:string|null;verification_status:string;pipeline_status:string;priority_score:number|null;website_url:string|null;next_follow_up_on:string|null};
type Params={q?:string;stage?:string;verified?:string;page?:string;sort?:string};
const stages=['not_contacted','contacted','visited','proposal_sent','won','lost'];
const label=(x:string)=>x.replaceAll('_',' ');
const PAGE_SIZE=40;
export default async function LeadsPage({searchParams}:{searchParams:Promise<Params>}){
 const {supabase,organizationId}=await requireWorkspace();
 const p=await searchParams;
 const q=(p.q||'').trim().slice(0,80);
 // Allow Unicode names, but not raw PostgREST filter punctuation in .or(...).
 const safeTerm=q.replace(/[^\p{L}\p{N}\s-]/gu,' ').trim().replace(/\s+/g,' ');
 const stage=stages.includes(p.stage||'')?p.stage||'':'';
 const verified=['unverified','pending','verified'].includes(p.verified||'')?p.verified||'':'';
 const sort=['priority','followup'].includes(p.sort||'')?p.sort!:'newest';
 const page=Math.max(1,Math.min(500,Number.isInteger(Number(p.page))?Number(p.page):1));
 let query=supabase.from('businesses')
  .select('id,name,city,category,verification_status,pipeline_status,priority_score,website_url,next_follow_up_on',{count:'exact'})
  .eq('organization_id',organizationId);
 if(stage)query=query.eq('pipeline_status',stage);
 if(verified)query=query.eq('verification_status',verified);
 if(safeTerm)query=query.or('name.ilike.%'+safeTerm+'%,city.ilike.%'+safeTerm+'%,category.ilike.%'+safeTerm+'%');
 if(sort==='priority')query=query.order('priority_score',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false});
 else if(sort==='followup')query=query.order('next_follow_up_on',{ascending:true,nullsFirst:false}).order('created_at',{ascending:false});
 else query=query.order('created_at',{ascending:false});
 const {data,error,count}=await query.order('id',{ascending:true})
   .range((page-1)*PAGE_SIZE,page*PAGE_SIZE-1);
 const leads=(data??[]) as Row[];
 const pages=Math.max(1,Math.ceil((count??0)/PAGE_SIZE));
 const href=(n:number)=>{
  const params=new URLSearchParams();
  if(q)params.set('q',q);
  if(stage)params.set('stage',stage);
  if(verified)params.set('verified',verified);
  if(sort!=='newest')params.set('sort',sort);
  params.set('page',String(n));
  return '/app/leads?'+params.toString();
 };
 return <main className="max-w-7xl">
  <div className="flex flex-wrap items-end justify-between gap-5">
   <div><p className="kicker">Source-aware prospect intelligence</p><h1 className="mt-3 text-4xl font-semibold">Business CRM</h1>
    <p className="muted mt-3">Every company can be searched across the full database, not merely the latest loaded records.</p></div>
   <div className="flex flex-wrap gap-3"><Link className="btn" href="/app/leads/import">Import / review</Link><Link className="btn" href="/app/leads/new">+ Add business</Link></div>
  </div>
  <section className="panel mt-8 p-5">
   <form method="get" action="/app/leads" className="grid gap-3 md:grid-cols-[1fr_170px_170px_150px_auto]">
    <input type="search" name="q" maxLength={80} defaultValue={q} placeholder="Search all businesses…" aria-label="Search businesses"/>
    <select name="stage" defaultValue={stage} aria-label="Pipeline stage"><option value="">All stages</option>{stages.map(x=><option value={x} key={x}>{label(x)}</option>)}</select>
    <select name="verified" defaultValue={verified} aria-label="Verification status"><option value="">All verification</option>{['unverified','pending','verified'].map(x=><option key={x} value={x}>{x}</option>)}</select>
    <select name="sort" defaultValue={sort} aria-label="Sort CRM prospects"><option value="newest">Newest first</option><option value="priority">Highest manual priority</option><option value="followup">Upcoming follow-up</option></select>
    <button className="btn" type="submit">Find prospects</button>
   </form>
   <p className="muted mt-3 text-xs">{count??0} matching database records · page {page}/{pages} · {PAGE_SIZE} per page. Manual sales priority is distinct from automated research triage.</p>
  </section>
  {error&&<div role="alert" className="panel mt-5 p-5 text-red-300">CRM search failed. Check organization access or try a shorter search term.</div>}
  <section className="panel mt-6 overflow-x-auto">
   <table><thead><tr><th>Business</th><th>Location</th><th>Industry</th><th>Evidence</th><th>Pipeline</th><th>Manual priority</th><th>Follow-up</th></tr></thead>
    <tbody>{leads.map(b=><tr key={b.id}>
     <td><Link href={'/app/leads/'+b.id} className="font-semibold text-cyan-100 hover:underline">{b.name} ↗</Link></td>
     <td>{b.city||'Unspecified'}</td><td>{b.category||'Unclassified'}</td>
     <td><span className={'status-pill '+(b.verification_status==='verified'?'status-ok':'')}>{b.verification_status}</span></td>
     <td className="capitalize">{label(b.pipeline_status)}</td>
     <td>{b.priority_score??'Unscored'}</td><td>{b.next_follow_up_on||'Not set'}</td>
    </tr>)}</tbody></table>
   {!leads.length&&!error&&<p className="muted p-10 text-center">No matching businesses. Adjust filters, import a discovered record, or add a prospect.</p>}
   {pages>1&&<nav className="flex items-center justify-end gap-5 border-t border-[#273b48] p-5 text-sm" aria-label="CRM pages">
    {page>1&&<Link className="text-cyan-300 underline" href={href(page-1)}>← Previous</Link>}
    <span className="muted">{page} of {pages}</span>
    {page<pages&&<Link className="text-cyan-300 underline" href={href(page+1)}>Next →</Link>}
   </nav>}
  </section>
 </main>;
}
