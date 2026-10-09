import Link from 'next/link';
import { requireWorkspace } from '@/lib/workspace';

type Row = {id:string;name:string;city:string|null;category:string|null;verification_status:string;pipeline_status:string;priority_score:number|null;website_url:string|null;next_follow_up_on:string|null;};
const stages=['not_contacted','contacted','visited','proposal_sent','won','lost'];
const label=(x:string)=>x.replaceAll('_',' ');

export default async function LeadsPage({searchParams}:{searchParams:Promise<{q?:string;stage?:string;verified?:string}>}) {
  const {supabase,organizationId}=await requireWorkspace();
  const {q='',stage='',verified=''}=await searchParams;
  let query=supabase.from('businesses')
    .select('id,name,city,category,verification_status,pipeline_status,priority_score,website_url,next_follow_up_on',{count:'exact'})
    .eq('organization_id',organizationId);
  if(stages.includes(stage)) query=query.eq('pipeline_status',stage);
  if(['unverified','pending','verified'].includes(verified)) query=query.eq('verification_status',verified);
  const {data,error,count}=await query.order('created_at',{ascending:false}).limit(200);
  const search=q.trim().toLowerCase();
  const leads=((data??[]) as Row[]).filter(x=>!search || [x.name,x.city??'',x.category??''].some(y=>y.toLowerCase().includes(search)));
  return <main>
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div><p className="kicker">Source-aware prospect intelligence</p><h1 className="mt-3 text-4xl font-semibold">Business CRM</h1><p className="muted mt-3">Prospects, outreach and source verification in one workspace.</p></div>
      <div className="flex gap-3"><Link className="btn" href="/app/leads/import">Import / review</Link><Link className="btn" href="/app/leads/new">+ Add business</Link></div>
    </div>
    <section className="panel mt-8 p-5">
      <form method="get" className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
        <input type="search" name="q" defaultValue={q} placeholder="Search visible businesses…" aria-label="Search businesses"/>
        <select name="stage" defaultValue={stage} aria-label="Pipeline stage"><option value="">All stages</option>{stages.map(s=><option value={s} key={s}>{label(s)}</option>)}</select>
        <select name="verified" defaultValue={verified} aria-label="Verification status"><option value="">All verification</option>{['unverified','pending','verified'].map(s=><option key={s}>{s}</option>)}</select>
        <button className="btn" type="submit">Filter</button>
      </form>
      <p className="muted mt-3 text-xs">Showing {leads.length} of {count??0} matching database records (maximum 200 loaded). Search applies to loaded results.</p>
    </section>
    {error && <div className="panel mt-5 p-5 text-red-300">The CRM query failed. Check whether migration 0002 has been applied.</div>}
    <section className="panel mt-6 overflow-x-auto">
      <table><thead><tr><th>Business</th><th>Location</th><th>Industry</th><th>Evidence</th><th>Pipeline</th><th>Priority</th><th>Follow-up</th></tr></thead>
      <tbody>{leads.map(b=><tr key={b.id}>
        <td><Link href={'/app/leads/'+b.id} className="font-semibold text-cyan-100 hover:underline">{b.name} ↗</Link></td>
        <td>{b.city||'Unspecified'}</td><td>{b.category||'Unclassified'}</td>
        <td><span className={'status-pill '+(b.verification_status==='verified'?'status-ok':'')}>{b.verification_status}</span></td>
        <td className="capitalize">{label(b.pipeline_status)}</td><td>{b.priority_score??'Unscored'}</td><td>{b.next_follow_up_on||'Not set'}</td>
      </tr>)}</tbody></table>
      {!leads.length && !error && <p className="muted p-10 text-center">No matching businesses. Add a real prospect or import a research CSV.</p>}
    </section>
  </main>;
}
