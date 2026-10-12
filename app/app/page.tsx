import Link from 'next/link';
import { requireWorkspace } from '@/lib/workspace';
import { ArrowUpRight, Database, Clock3, ShieldCheck, PanelsTopLeft } from 'lucide-react';

export default async function Dashboard(){
  const {supabase,organizationId}=await requireWorkspace();
  const today=new Date().toISOString().slice(0,10);
  const [{count:total},{count:verified},{count:won},{count:staged},{count:followups},{count:demos},recent] = await Promise.all([
    supabase.from('businesses').select('id',{count:'exact',head:true}).eq('organization_id',organizationId),
    supabase.from('businesses').select('id',{count:'exact',head:true}).eq('organization_id',organizationId).eq('verification_status','verified'),
    supabase.from('businesses').select('id',{count:'exact',head:true}).eq('organization_id',organizationId).eq('pipeline_status','won'),
    supabase.from('lead_import_rows').select('id',{count:'exact',head:true}).eq('organization_id',organizationId).eq('review_status','pending'),
    supabase.from('businesses').select('id',{count:'exact',head:true}).eq('organization_id',organizationId).lte('next_follow_up_on',today).not('next_follow_up_on','is',null),
    supabase.from('demo_sites').select('id',{count:'exact',head:true}).eq('organization_id',organizationId),
    supabase.from('businesses').select('id,name,city,pipeline_status,verification_status').eq('organization_id',organizationId).order('created_at',{ascending:false}).limit(5),
  ]);
  const metrics=[
    ['Business records',total,Database],['Verified evidence',verified,ShieldCheck],
    ['Pending intake',staged,Database],['Follow-ups due',followups,Clock3],
    ['Demo drafts',demos,PanelsTopLeft],['Won clients',won,ArrowUpRight],
  ] as const;
  return <main>
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div><p className="kicker">Operations overview · Connected data</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Mission Control</h1><p className="muted mt-3">Your actual prospect and sales activity. No simulated scans, fabricated scores or invented sales.</p></div>
      <Link href="/app/leads/new" className="btn">+ New prospect</Link>
    </div>
    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {metrics.map(([label,value,Icon])=><section key={label} className="panel relative overflow-hidden p-6">
        <div className="flex items-center justify-between"><span className="muted text-sm">{label}</span><Icon size={18} className="text-[#75d6e7]"/></div>
        <p className="mt-6 text-4xl font-semibold">{value??'—'}</p>
      </section>)}
    </div>
    <div className="mt-7 grid gap-6 xl:grid-cols-[1.25fr_1fr]">
      <section className="panel p-7"><div className="flex items-center justify-between"><div><p className="kicker">Working pipeline</p><h2 className="mt-3 text-xl font-semibold">Latest businesses</h2></div><Link href="/app/leads" className="text-sm text-cyan-300 underline">View CRM</Link></div>
        <div className="mt-5 space-y-1">{(recent.data??[]).map(b=><Link key={b.id} href={'/app/leads/'+b.id} className="flex items-center justify-between gap-3 rounded-xl border-b border-[#23343d] p-3 hover:bg-[#14242e]">
          <span><strong className="text-sm">{b.name}</strong><small className="muted mt-1 block">{b.city||'Location pending'} · {b.verification_status}</small></span><span className="muted text-xs capitalize">{b.pipeline_status.replaceAll('_',' ')}</span></Link>)}
          {!recent.data?.length&&<p className="muted py-8 text-sm">Your CRM is empty. Create your first real prospect or stage research data.</p>}</div>
      </section>
      <section className="panel p-7"><p className="kicker">Action queue</p><h2 className="mt-3 text-xl font-semibold">What to do next</h2>
        <div className="mt-6 space-y-4 text-sm">
          <Link className="flex justify-between rounded-xl border border-[#253c47] p-4 hover:bg-[#122531]" href="/app/leads/import"><span>Review imported businesses</span><ArrowUpRight size={16}/></Link>
          <Link className="flex justify-between rounded-xl border border-[#253c47] p-4 hover:bg-[#122531]" href="/app/leads"><span>Log outreach and follow-ups</span><ArrowUpRight size={16}/></Link>
          <Link className="flex justify-between rounded-xl border border-[#253c47] p-4 hover:bg-[#122531]" href="/app/demos"><span>Create client demo drafts</span><ArrowUpRight size={16}/></Link>
        </div><p className="muted mt-5 text-xs">Automated registry collectors and external demo sharing are upcoming development milestones, not live background tasks.</p>
      </section>
    </div>
  </main>;
}
