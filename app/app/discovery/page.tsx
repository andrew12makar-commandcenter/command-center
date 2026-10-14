import Link from 'next/link';
import {requireWorkspace} from '@/lib/workspace';
import {scanAndStage} from './actions';
import {MapPinned,Building2,ShieldAlert,FileCheck2,ExternalLink,ClipboardList} from 'lucide-react';
import {listCampaigns} from '@/lib/discovery-campaigns-server';
import {TARGET_SERVICES,targetServiceLabels,TARGET_INDUSTRIES,targetIndustryLabels,discoverySourceLabels} from '@/lib/discovery-campaigns';

export default async function Discovery({searchParams}:{searchParams:Promise<{added?:string;skipped?:string;source?:string;error?:string;campaign?:string}>}){
 const {supabase,organizationId}=await requireWorkspace();
 const p=await searchParams;
 const [{count:queue},{count:total},{data:recent,error},{campaigns,available}]=await Promise.all([
  supabase.from('lead_import_rows').select('id',{head:true,count:'exact'}).eq('organization_id',organizationId).eq('review_status','pending'),
  supabase.from('businesses').select('id',{head:true,count:'exact'}).eq('organization_id',organizationId),
  supabase.from('lead_import_rows').select('*')
   .eq('organization_id',organizationId).order('created_at',{ascending:false}).limit(12),
  listCampaigns(supabase,organizationId)
 ]);
 const lastCampaign=campaigns.find(c=>c.id===p.campaign);
 return <main className="max-w-7xl">
  <div className="flex flex-wrap items-end justify-between gap-5">
    <div><p className="kicker">Local-business intelligence / Phase 4</p><h1 className="mt-3 text-4xl font-semibold">Prospect Discovery</h1>
    <p className="muted mt-3 max-w-3xl leading-7">Collect evidence-backed business candidates from public directories and community mapping. Scan results enter a manual review queue, not a verified-client list.</p></div>
    <div className="flex flex-wrap gap-3"><Link className="btn" href="/app/leads/import">Review {queue??0} pending →</Link>
    <Link className="btn" href="/app/project-status"><ClipboardList size={16} className="mr-2"/>Project status</Link></div>
  </div>
  <div className="mt-8 grid gap-5 sm:grid-cols-3">
    {([
      ['CRM businesses',total??'—',Building2],
      ['Awaiting review',queue??'—',FileCheck2],
      ['Geographic pilot','Allston → Brighton → Brookline',MapPinned],
     ] as const).map(([label,value,Icon])=><section className="panel p-6" key={label}>
      <div className="flex items-center gap-3"><Icon size={19} className="text-cyan-300"/><span className="muted text-sm">{label}</span></div>
      <p className="mt-5 text-xl font-semibold">{value}</p>
    </section>)}
  </div>
  {(p.added!==undefined||p.error)&&<div role="status" className="panel mt-6 p-5">
    {p.error?<p className="text-amber-200"><ShieldAlert className="mr-2 inline" size={17}/>Scan did not complete: {p.error}</p>
      :<p className="text-cyan-100">Staged {p.added} new candidate{p.added==='1'?'':'s'} from {p.source}{lastCampaign?' into campaign “'+lastCampaign.name+'”':''}. {p.skipped} known or repeated candidates skipped. None were automatically verified.
        {lastCampaign&&<Link className="ml-2 underline" href={'/app/leads/import?campaign='+lastCampaign.id}>Review this campaign →</Link>}</p>}
  </div>}
  <div className="mt-7 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
   <section className="panel p-7"><p className="kicker">Run one controlled discovery pass</p><h2 className="mt-3 text-2xl font-semibold">Find local businesses</h2>
     <p className="muted mt-3 text-sm leading-6">No background scraping. A scan begins only when you click the button; public-source availability and rate limits can affect results.</p>
     {!available&&<p role="alert" className="mt-5 rounded-xl border border-amber-700/50 p-4 text-sm text-amber-200">Discovery campaigns need migration 0007_prospect_discovery.sql. Apply it in Supabase before scanning.</p>}
     <form action={scanAndStage} className="mt-7 grid gap-5">
       <fieldset className="grid gap-4 rounded-xl border border-[#2b4350] p-4 sm:grid-cols-2">
        <legend className="px-2 text-xs font-semibold uppercase tracking-[.14em] text-[#9fd8e0]">Campaign</legend>
        <label className="text-sm sm:col-span-2">Add to existing campaign<select name="campaign_id" className="mt-2" defaultValue="">
          <option value="">Create a new campaign (fill in below)</option>
          {campaigns.map(c=><option key={c.id} value={c.id}>{c.name} · {targetServiceLabels[c.target_service]} · {c.target_area||'Any area'}</option>)}
        </select></label>
        <label className="text-sm">New campaign name<input name="campaign_name" className="mt-2" maxLength={120} placeholder="e.g., Brighton dentists: website refresh"/></label>
        <label className="text-sm">Target service<select name="target_service" className="mt-2" defaultValue="website_design">
          {TARGET_SERVICES.map(x=><option key={x} value={x}>{targetServiceLabels[x]}</option>)}
        </select></label>
        <label className="text-sm">Target industry<select name="industry" className="mt-2" defaultValue="any">
          {TARGET_INDUSTRIES.map(x=><option key={x} value={x}>{targetIndustryLabels[x]}</option>)}
        </select></label>
        <label className="text-sm">Industry keyword (optional)<input name="keyword" className="mt-2" maxLength={60} placeholder="e.g., dentist, salon, landscap"/></label>
        <p className="muted text-xs sm:col-span-2">Industry and keyword filter candidates by their recorded category or name before staging. The target area is the scan area below. Industry and keyword apply to every scan, including ones added to an existing campaign.</p>
       </fieldset>
       <label className="text-sm">Business source<select name="source" className="mt-2" defaultValue="boston-certified">
          <option value="boston-certified">City of Boston certified-business directory (multiple industries)</option>
          <option value="boston-food">City of Boston food establishment licenses</option>
          <option value="osm">OpenStreetMap business places (all three areas)</option>
        </select></label>
       <label className="text-sm">Target area<select name="area" className="mt-2" defaultValue="brighton">
          <option value="brighton">Brighton, MA</option>
          <option value="allston">Allston, MA</option>
          <option value="brookline">Brookline, MA (OpenStreetMap source only)</option>
        </select></label>
       <label className="text-sm">Maximum new records this pass<select name="max" className="mt-2" defaultValue="50">
          <option value="25">25 prospects (quick pilot)</option>
          <option value="50">50 prospects</option>
          <option value="75">75 prospects</option>
        </select></label>
       <button className="btn" type="submit">Discover and stage for review →</button>
     </form>
   </section>
   <section className="panel p-7"><p className="kicker">Research quality control</p><h2 className="mt-3 text-xl font-semibold">What these scans mean</h2>
    <div className="mt-5 space-y-4 text-sm leading-6 text-[#bad0d8]">
      <p><strong className="text-white">City of Boston datasets:</strong> Source-backed records. Certified directories contain only certified vendors; food licenses cover only food establishments. Neither proves a firm currently operates or owns its online listing.</p>
      <p><strong className="text-white">OpenStreetMap:</strong> Broad storefronts, service businesses and mobile operators where mapped. It is crowd-sourced, sometimes incomplete or outdated, and does not certify a business.</p>
      <p><strong className="text-white">Review gate:</strong> Staged records require your approval. Website issues, ownership of a Google listing and operating status are not guessed.</p>
      <p><strong className="text-white">Coverage:</strong> The pilot is limited to targeted neighborhoods and bounded source requests. It is not yet a comprehensive Greater Boston registry or a daily scheduled discovery job.</p>
    </div>
    <a className="mt-6 inline-flex items-center gap-2 text-sm text-cyan-300 underline" target="_blank" rel="noreferrer" href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors · ODbL <ExternalLink size={15}/></a>
   </section>
  </div>
  {campaigns.length>0&&<section className="panel mt-7 p-6">
    <p className="kicker">Discovery campaigns</p><h2 className="mt-2 text-xl font-semibold">Review by campaign</h2>
    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{campaigns.slice(0,12).map(c=><Link key={c.id} href={'/app/leads/import?campaign='+c.id}
      className="rounded-xl border border-[#2b4350] p-4 text-sm hover:bg-[#122531]">
      <strong className="block">{c.name}</strong>
      <span className="muted mt-1 block text-xs">{targetServiceLabels[c.target_service]} · {c.target_area||'Any area'} · {c.target_industry||'Any industry'}</span>
      <span className="muted mt-1 block text-xs">{discoverySourceLabels[c.discovery_source]} · {new Date(c.created_at).toLocaleDateString('en-US')}</span>
    </Link>)}</div>
  </section>}
  <section className="panel mt-7 overflow-x-auto">
    <div className="flex flex-wrap items-center justify-between gap-4 p-6"><div><p className="kicker">Recent research</p><h2 className="mt-2 text-xl font-semibold">Latest source records</h2></div>
      <Link href="/app/leads/import" className="text-sm text-cyan-300 underline">Open review queue ↗</Link></div>
    {error&&<p className="p-5 text-red-300">Could not load discovered records.</p>}
    <table><thead><tr><th>Business</th><th>Area / city</th><th>Category</th><th>Origin</th><th>Campaign</th><th>Status</th></tr></thead>
    <tbody>{(recent??[]).map(x=><tr key={x.id}>
      <td className="font-medium">{x.name}</td><td>{x.city||'Exact city not provided'}</td>
      <td>{x.category||'Unclassified'}</td>
      <td>{x.source_url?<a target="_blank" rel="noreferrer" className="text-cyan-300 underline" href={x.source_url}>{x.source_type} ↗</a>:x.source_type||'Unspecified'}</td>
      <td className="text-xs">{campaigns.find(c=>c.id===(x as {campaign_id?:string|null}).campaign_id)?.name||<span className="muted">None</span>}</td>
      <td className="capitalize">{x.review_status}</td></tr>)}</tbody></table>
    {!recent?.length&&!error&&<p className="muted p-7 text-sm">No discovery records yet. Run a pilot scan above or import an official CSV manually.</p>}
  </section>
 </main>;
}
