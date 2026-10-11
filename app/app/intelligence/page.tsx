import Link from 'next/link';
import {requireWorkspace,validUuid} from '@/lib/workspace';
import {auditBusiness,importLighthouseReport} from './actions';
import type {AuditFindings,AuditEvidence} from '@/lib/website-intelligence';
import {classifyWebPresence} from '@/lib/web-presence';
import {Activity,ArrowUpRight,Globe2,ShieldAlert,ScanSearch} from 'lucide-react';

const errors:Record<string,string>={
 'no-website':'No website URL is recorded for that business. Research and add the correct public website before auditing. An empty field does not mean it has no website.',
 'invalid-website':'The business website must be a public HTTP/HTTPS domain. Check the CRM entry.',
 cooldown:'That business was checked within the past 20 minutes. Recent results are saved below; wait before rerunning.',
 'profile-not-site':'The recorded URL is a social account or directory listing, not an independent business website. Open the CRM record and move it to research evidence before attempting an audit.',
 'upload-size':'Select a Chrome Lighthouse JSON report smaller than 8 MB.',
 'upload-json':'This is not a complete native Lighthouse JSON report. Export as JSON from Chrome DevTools Lighthouse, not HTML.',
 'upload-stale':'The Lighthouse report is outdated or future-dated. Run a fresh report and export JSON from Chrome.',
 'upload-mismatch':'The Lighthouse report URL does not match the selected CRM business website. Verify both homepage addresses before importing.'
};
const percent=(n:number|null)=>n===null?'Not measured':n+'/100';
const short=(s:string|null|undefined)=>s?.slice(0,140)||'';
export default async function WebsiteIntelligence({
 searchParams
}:{searchParams:Promise<{error?:string;audited?:string;imported?:string;business?:string}>}){
 const {supabase,organizationId}=await requireWorkspace();
 const p=await searchParams;
 const selectedId=p.business&&validUuid(p.business)?p.business:null;
 let businessQuery=supabase.from('businesses').select('id,name,city,category,website_url,verification_status')
   .eq('organization_id',organizationId).order('created_at',{ascending:false});
 if(selectedId)businessQuery=businessQuery.eq('id',selectedId);
 const [{data:businesses,error:bError},{data:assessments,error:aError},{count:pending}]=await Promise.all([
  businessQuery.limit(100),
  supabase.from('website_assessments').select('id,business_id,website_url,status,findings,evidence,assessed_at')
    .eq('organization_id',organizationId).order('assessed_at',{ascending:false}).limit(20),
  supabase.from('lead_import_rows').select('id',{head:true,count:'exact'})
    .eq('organization_id',organizationId).eq('review_status','pending')
 ]);
 const nameById=new Map((businesses??[]).map(b=>[b.id,b.name]));
 const auditable=(businesses??[]).filter(b=>classifyWebPresence(b.website_url).kind==='website');
 const hasApiKey=Boolean(process.env.PAGESPEED_API_KEY?.trim());
 return <main className="max-w-7xl">
   <div className="flex flex-wrap items-end justify-between gap-4">
    <div><p className="kicker">Phase 5 / Evidence-first technical audits</p><h1 className="mt-3 text-4xl font-semibold">Website Intelligence</h1>
    <p className="muted mt-3 max-w-3xl leading-7">Check real mobile performance and technical SEO using Google PageSpeed Insights. Every assessment keeps its timestamp and evidence. Unknown data stays unknown.</p></div>
    <Link className="btn" href="/app/leads/import">Review {pending??0} pending leads <ArrowUpRight size={16}/></Link>
   </div>
   {selectedId&&<div className="mt-5"><Link href="/app/intelligence" className="text-sm text-cyan-300 underline">← Show full Website Intelligence list</Link>
      <p className="muted mt-2 text-sm">Showing the requested CRM business, even if it is not among the 100 newest records.</p></div>}
   {p.error&&<div className="mt-7 rounded-xl border border-amber-700/40 bg-amber-950/15 p-5 text-amber-200" role="alert">
      <ShieldAlert className="mr-2 inline" size={18}/>{errors[p.error]||'Website audit was not completed.'}</div>}
   {p.audited&&<div className="panel mt-7 border-[#29615f] p-5 text-cyan-100" role="status">
      The test result was saved. Review its measured findings below. A partial or failed Google request is recorded as inconclusive, not a bad website.</div>}
   {p.imported&&<p className="mt-7 rounded-xl border border-cyan-700/50 bg-cyan-950/20 p-5 text-sm text-cyan-100" role="status">Local Lighthouse report saved as operator-imported evidence. Review its findings and provenance below.</p>}
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
        <tbody>{(businesses??[]).map(b=>{const presence=classifyWebPresence(b.website_url);return <tr key={b.id}>
          <td><Link className="font-semibold text-cyan-200 underline" href={'/app/leads/'+b.id}>{b.name}</Link><small className="muted mt-1 block">{b.category||'Category unknown'}</small></td>
          <td>{b.city||'Unspecified'}</td>
          <td>{presence.url?<><a href={presence.url} className="break-all text-sm text-cyan-300 underline" target="_blank" rel="noopener noreferrer">{presence.url}</a>
            {presence.kind!=='website'&&<span className="mt-2 block text-xs text-amber-200">{presence.provider} profile / listing, not independent website</span>}</>:
            <span className="muted text-xs">{presence.kind==='invalid'?'Invalid URL: review CRM':'Not recorded (not proof of absence)'}</span>}</td>
          <td>{presence.kind==='website'?<form action={auditBusiness}><input type="hidden" name="business_id" value={b.id}/>
            <button className="btn text-xs" type="submit">Run mobile audit →</button></form>:
            <Link href={'/app/leads/'+b.id} className="text-xs text-cyan-300 underline">{presence.kind==='social'||presence.kind==='listing'?'Move profile to research evidence':'Check business details'} →</Link>}</td>
        </tr>})}</tbody></table>
      {!businesses?.length&&!bError&&<p className="muted p-8 text-sm">The CRM has no approved prospects yet. Review your discovered candidates in Lead Intake first.</p>}
   </section>
   {process.env.NODE_ENV==='development'&&
   <section id="local-lighthouse-queue" className="panel mt-7 p-6">
     <p className="kicker">Zero paid API credits · pilot</p>
     <h2 className="mt-2 text-xl font-semibold">Local Lighthouse audit queue</h2>
     <p className="muted mt-3 max-w-4xl text-sm leading-6">
       Choose up to 10 CRM businesses below. Download the approved queue and run it in your Mac terminal with
       <code> npm run audit:local -- ~/Downloads/command-center-audit-queue.json</code>.
       Chrome audits sites one at a time and saves JSON reports on your computer. No Google Cloud account, PageSpeed credits,
       unattended scraping, or public auditing endpoint. You must approve the queue again in Terminal.
     </p>
     <p className="mt-3 text-sm text-amber-200">This pilot does not automatically upload the files. Import each completed JSON through the existing authenticated form below. Failed or incomplete runs remain inconclusive.</p>
     {auditable.length>0?
       <form method="get" action="/api/local-audits/manifest" className="mt-5">
         <div className="grid gap-3 sm:grid-cols-2">
           {auditable.slice(0,10).map(b=><label key={b.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#2e424c] px-4 py-3 text-sm">
             <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" name="business_id" value={b.id}
               defaultChecked={selectedId===b.id}/>
             <span><strong className="block">{b.name}</strong>
               <small className="muted mt-1 block break-all">{b.website_url}</small></span>
           </label>)}
         </div>
         {auditable.length>10&&<p className="muted mt-3 text-xs">Showing the first 10 eligible sites from this CRM view. Select a specific business in Website Intelligence to export it individually.</p>}
         <label className="mt-5 flex items-start gap-3 text-sm">
           <input type="checkbox" className="mt-1 h-4 w-4" name="confirm" value="yes" required/>
           I reviewed these exact URLs and approve the selected public websites for a one-time local test.
         </label>
         <button type="submit" className="btn mt-4">Download approved audit queue →</button>
       </form>:
       <p className="muted mt-4 text-sm">No CRM records with independently identified company websites are available for this view.</p>}
     <p className="muted mt-4 text-xs">Chrome Lighthouse is open-source. First run downloads Lighthouse from npm into the local npm cache; it may take a minute. Scans can fail on protective websites, including sites that load normally in Chrome. No outcome is considered a business defect without valid measured evidence.</p>
   </section>}
   <section id="lighthouse-fallback" className="panel mt-7 scroll-mt-6 p-6">
     <p className="kicker">Lighthouse integration readiness</p>
     <h2 className="mt-2 text-xl font-semibold">Optional PageSpeed API and manual report import</h2>
     <p className="mt-3 text-sm font-semibold text-cyan-200">Server API key: {hasApiKey?'Configured':'Not configured'}</p>
     <p className="muted mt-2 max-w-4xl text-sm leading-6">
       {hasApiKey?'API requests will use the configured Google project key. Rate limits, quotas and access restrictions can still cause HTTP 429 or 403.':
        'Requests currently use unauthenticated PageSpeed access. Google recommends a project API key for frequent calls; an API key may improve quota reliability but does not guarantee an audit will run.'}
       {' '}To configure it, enable the PageSpeed Insights API in your own Google Cloud project, create an API-restricted key, add <code>PAGESPEED_API_KEY</code> to the private <code>.env.local</code> file, then restart Next.js. Never paste the key into this page, ChatGPT, GitHub, or a screenshot.
     </p>
     <a href="https://developers.google.com/speed/docs/insights/v5/get-started" className="mt-2 inline-block text-sm text-cyan-300 underline" target="_blank" rel="noopener noreferrer">Official Google PageSpeed API setup ↗</a>
     <div className="mt-5 border-t border-[#2b4350] pt-5">
       <h3 className="font-semibold">Import a Chrome Lighthouse report instead</h3>
       <p className="muted mt-2 max-w-4xl text-sm leading-6">In Chrome, open the company's actual homepage, then DevTools → Lighthouse → Mobile → Analyze page load. Export the resulting report as <strong>JSON</strong> (not HTML). Import it below. Only a matching report from the last 7 days is accepted. This is locally produced, operator-supplied evidence, not an independently authenticated PageSpeed API response.</p>
       {auditable.length>0?<form action={importLighthouseReport} className="mt-4 grid gap-3 sm:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto] sm:items-end">
         <label className="text-sm">Business<select name="business_id" defaultValue={selectedId&&auditable.some(b=>b.id===selectedId)?selectedId:auditable[0].id} className="mt-2" required>
           {auditable.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
         </select></label>
         <label className="text-sm">Chrome Lighthouse JSON (up to 8 MB)<input type="file" name="lighthouse_json" accept=".json,application/json" required className="mt-2"/></label>
         <button className="btn" type="submit">Import verified-format report →</button>
       </form>:<p className="muted mt-3 text-sm">No business with an independent website is selected or available. Link and review an official website in the CRM first.</p>}
     </div>
   </section>
   <section id="latest-audits" className="mt-7 scroll-mt-7 grid gap-5">
    <div className="flex items-end justify-between gap-4"><div><p className="kicker">Measured evidence</p><h2 className="mt-2 text-2xl font-semibold">Latest audits</h2></div>
    <span className="muted text-xs">Latest 20 · newest first</span></div>
    {aError&&<p className="text-red-300">Unable to retrieve saved audits.</p>}
    {(assessments??[]).map(a=>{
      const f=a.findings as AuditFindings;
      const evidence=(Array.isArray(a.evidence)?a.evidence:[]) as AuditEvidence[];
      const hasScore=typeof f?.technical_opportunity_score==='number';
      const reportWarnings=Array.isArray(f?.report_warnings)?f.report_warnings:[];
      return <article className="panel p-6" key={a.id}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="kicker">{a.status==='verified_gaps'?'Issues observed':a.status==='no_gaps'?'No issues in checked tests':'Inconclusive measurement'}</p>
          <h3 className="mt-3 text-xl font-semibold">{nameById.get(a.business_id)||'CRM business'}</h3>
          <p className="muted mt-1 text-sm">{a.website_url} · {new Date(a.assessed_at).toLocaleString('en-US')}</p>
          <p className="mt-2 text-xs text-cyan-300">{f?.source_method==='local_lighthouse_upload'?'Operator-uploaded local Lighthouse report (not independently authenticated)':'Google PageSpeed API response'}</p></div>
          <Link className="text-sm text-cyan-300 underline" href={'/app/leads/'+a.business_id}>CRM record ↗</Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[#29404a] p-4"><p className="muted text-xs">{a.status==='inconclusive'&&typeof f?.performance_score==='number'?'Provisional mobile performance':'Mobile performance'}</p><strong className="mt-2 block text-2xl">{percent(f?.performance_score??null)}</strong></div>
          <div className="rounded-xl border border-[#29404a] p-4"><p className="muted text-xs">Technical SEO</p><strong className="mt-2 block text-2xl">{percent(f?.seo_score??null)}</strong></div>
          <div className="rounded-xl border border-[#29404a] p-4"><p className="muted text-xs">Technical improvement signal</p><strong className="mt-2 block text-2xl">{hasScore?String(f.technical_opportunity_score)+'/100':'Not scored'}</strong></div>
        </div>
        <p className="muted mt-5 text-sm">{f?.note||'No analysis details available.'}{f?.error?' '+f.error:''}</p>
        {reportWarnings.length>0&&<div role="status" className="mt-4 rounded-xl border border-amber-700/60 bg-amber-950/20 p-4">
          <p className="font-semibold text-sm text-amber-100">Lighthouse confidence warnings · do not use for automated prospect ranking</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-200">{reportWarnings.map((w,i)=><li key={i}>{short(w)}</li>)}</ul>
        </div>}
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
