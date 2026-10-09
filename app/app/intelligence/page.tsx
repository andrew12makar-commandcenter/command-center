import Link from 'next/link';
import {requireWorkspace} from '@/lib/workspace';
import {auditBusiness} from './actions';
import type {AuditFindings,AuditEvidence} from '@/lib/website-intelligence';
import {Activity,ArrowUpRight,Globe2,ShieldAlert,ScanSearch} from 'lucide-react';

const errors:Record<string,string>={
 'no-website':'No website URL is recorded for that business. Research and add the correct public website before auditing. An empty field does not mean it has no website.',
 'invalid-website':'The business website must be a public HTTP/HTTPS domain. Check the CRM entry.',
 cooldown:'That business was checked within the past 20 minutes. Recent results are saved below; wait before rerunning.'
};
const percent=(n:number|null)=>n===null?'Not measured':n+'/100';
const short=(s:string|null|undefined)=>s?.slice(0,140)||'';
export default async function WebsiteIntelligence({
 searchParams
}:{searchParams:Promise<{error?:string;audited?:string}>}){
 const {supabase,organizationId}=await requireWorkspace();
 const p=await searchParams;
 const [{data:businesses,error:bError},{data:assessments,error:aError},{count:pending}]=await Promise.all([
  supabase.from('businesses').select('id,name,city,category,website_url,verification_status')
    .eq('organization_id',organizationId).order('created_at',{ascending:false}).limit(100),
  supabase.from('website_assessments').select('id,business_id,website_url,status,findings,evidence,assessed_at')
    .eq('organization_id',organizationId).order('assessed_at',{ascending:false}).limit(20),
  supabase.from('lead_import_rows').select('id',{head:true,count:'exact'})
    .eq('organization_id',organizationId).eq('review_status','pending')
 ]);
 const nameById=new Map((businesses??[]).map(b=>[b.id,b.name]));
 return <main className="max-w-7xl">
   <div className="flex flex-wrap items-end justify-between gap-4">
    <div><p className="kicker">Phase 5 / Evidence-first technical audits</p><h1 className="mt-3 text-4xl font-semibold">Website Intelligence</h1>
    <p className="muted mt-3 max-w-3xl leading-7">Check real mobile performance and technical SEO using Google PageSpeed Insights. Every assessment keeps its timestamp and evidence. Unknown data stays unknown.</p></div>
    <Link className="btn" href="/app/leads/import">Review {pending??0} pending leads <ArrowUpRight size={16}/></Link>
   </div>
   {p.error&&<div className="mt-7 rounded-xl border border-amber-700/40 bg-amber-950/15 p-5 text-amber-200" role="alert">
      <ShieldAlert className="mr-2 inline" size={18}/>{errors[p.error]||'Website audit was not completed.'}</div>}
   {p.audited&&<div className="panel mt-7 border-[#29615f] p-5 text-cyan-100" role="status">
      The test result was saved. Review its measured findings below. A partial or failed Google request is recorded as inconclusive, not a bad website.</div>}
   <div className="mt-8 grid gap-5 sm:grid-cols-3">
    {([
     ['CRM businesses',businesses?.length??0,Globe2],
     ['Awaiting lead review',pending??0,ScanSearch],
     ['Recorded assessments',assessments?.length??0,Activity]
    ] as const).map(([label,value,Icon])=><section key={label} className="panel p-6">
      <div className="flex items-center gap-3"><Icon size={18} className="text-cyan-300"/><span className="muted text-sm">{label}</span></div>
      <p className="mt-5 text-3xl font-semibold">{value}</p>
    </section>)}
   </div>
   <section className="panel mt-7 overflow-x-auto">
      <div className="flex flex-wrap justify-between gap-4 p-6">
       <div><p className="kicker">One prospect at a time</p><h2 className="mt-2 text-xl font-semibold">Select a website to assess</h2></div>
       <p className="muted max-w-md text-sm">Scans may take 20–45 seconds. Google quotas or unavailable websites can return an inconclusive result.</p>
      </div>
      {bError&&<p className="p-5 text-red-300">Unable to read the CRM businesses.</p>}
      <table><thead><tr><th>Company</th><th>Area</th><th>Recorded website</th><th>Action</th></tr></thead>
        <tbody>{(businesses??[]).map(b=><tr key={b.id}>
          <td><Link className="font-semibold text-cyan-200 underline" href={'/app/leads/'+b.id}>{b.name}</Link><small className="muted mt-1 block">{b.category||'Category unknown'}</small></td>
          <td>{b.city||'Unspecified'}</td>
          <td>{b.website_url?<a href={b.website_url} className="break-all text-sm text-cyan-300 underline" target="_blank" rel="noreferrer">{b.website_url}</a>:
            <span className="muted text-xs">Not recorded (not proof of absence)</span>}</td>
          <td>{b.website_url?<form action={auditBusiness}><input type="hidden" name="business_id" value={b.id}/>
            <button className="btn text-xs" type="submit">Run mobile audit →</button></form>:
            <Link href={'/app/leads/'+b.id} className="text-xs text-cyan-300 underline">Check business details</Link>}</td>
        </tr>)}</tbody></table>
      {!businesses?.length&&!bError&&<p className="muted p-8 text-sm">The CRM has no approved prospects yet. Review your discovered candidates in Lead Intake first.</p>}
   </section>
   <section className="mt-7 grid gap-5">
    <div className="flex items-end justify-between gap-4"><div><p className="kicker">Measured evidence</p><h2 className="mt-2 text-2xl font-semibold">Latest audits</h2></div>
    <span className="muted text-xs">Latest 20 · newest first</span></div>
    {aError&&<p className="text-red-300">Unable to retrieve saved audits.</p>}
    {(assessments??[]).map(a=>{
      const f=a.findings as AuditFindings;
      const evidence=(Array.isArray(a.evidence)?a.evidence:[]) as AuditEvidence[];
      const hasScore=typeof f?.technical_opportunity_score==='number';
      return <article className="panel p-6" key={a.id}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="kicker">{a.status==='verified_gaps'?'Issues observed':a.status==='no_gaps'?'No issues in checked tests':'Inconclusive measurement'}</p>
          <h3 className="mt-3 text-xl font-semibold">{nameById.get(a.business_id)||'CRM business'}</h3>
          <p className="muted mt-1 text-sm">{a.website_url} · {new Date(a.assessed_at).toLocaleString('en-US')}</p></div>
          <Link className="text-sm text-cyan-300 underline" href={'/app/leads/'+a.business_id}>CRM record ↗</Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[#29404a] p-4"><p className="muted text-xs">Mobile performance</p><strong className="mt-2 block text-2xl">{percent(f?.performance_score??null)}</strong></div>
          <div className="rounded-xl border border-[#29404a] p-4"><p className="muted text-xs">Technical SEO</p><strong className="mt-2 block text-2xl">{percent(f?.seo_score??null)}</strong></div>
          <div className="rounded-xl border border-[#29404a] p-4"><p className="muted text-xs">Technical improvement signal</p><strong className="mt-2 block text-2xl">{hasScore?String(f.technical_opportunity_score)+'/100':'Not scored'}</strong></div>
        </div>
        <p className="muted mt-5 text-sm">{f?.note||'No analysis details available.'}{f?.error?' '+f.error:''}</p>
        {evidence.length>0&&<div className="mt-5 grid gap-2 md:grid-cols-2">{evidence.map(e=><div key={e.id} className="rounded-xl border border-[#273d47] p-4">
           <p className="text-sm font-semibold">{e.title}<span className={'ml-2 text-xs '+(e.result==='failed'?'text-amber-300':'text-[#99b5bf]')}>· {e.result}</span></p>
           <p className="muted mt-2 text-xs">{short(e.detail)||'No additional measured details provided.'}</p></div>)}</div>}
        <div className="mt-5 flex flex-wrap gap-4 text-xs"><a className="text-cyan-300 underline" href={'https://pagespeed.web.dev/analysis?url='+encodeURIComponent(a.website_url||'')}
          target="_blank" rel="noreferrer">Review using PageSpeed Insights ↗</a>
          <span className="muted">Provider: Google Lighthouse · Mobile lab audit</span></div>
      </article>;
    })}
    {!assessments?.length&&!aError&&<p className="panel muted p-8 text-sm">No website audits yet. Select one approved company with a recorded public website above.</p>}
   </section>
   <p className="muted mt-6 text-sm">Scores reflect one technical website test, not verified business status, advertising budgets, Google profile ownership or predicted customer spend. Your CRM sales priority score is not modified automatically.</p>
 </main>;
}
