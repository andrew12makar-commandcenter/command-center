import Link from 'next/link';
import {requireWorkspace} from '@/lib/workspace';
import {scanAndStage} from './actions';
import {MapPinned,Building2,ShieldAlert,FileCheck2,ExternalLink} from 'lucide-react';

export default async function Discovery({searchParams}:{searchParams:Promise<{added?:string;skipped?:string;source?:string;error?:string}>}){
 const {supabase,organizationId}=await requireWorkspace();
 const p=await searchParams;
 const [{count:queue},{count:total},{data:recent,error}]=await Promise.all([
  supabase.from('lead_import_rows').select('id',{head:true,count:'exact'}).eq('organization_id',organizationId).eq('review_status','pending'),
  supabase.from('businesses').select('id',{head:true,count:'exact'}).eq('organization_id',organizationId),
  supabase.from('lead_import_rows').select('id,name,city,category,source_url,source_type,review_status,created_at')
   .eq('organization_id',organizationId).order('created_at',{ascending:false}).limit(12)
 ]);
 return <main className="max-w-7xl">
  <div className="flex flex-wrap items-end justify-between gap-5">
    <div><p className="kicker">Local-business intelligence / Phase 4</p><h1 className="mt-3 text-4xl font-semibold">Prospect Discovery</h1>
    <p className="muted mt-3 max-w-3xl leading-7">Collect evidence-backed business candidates from public directories and community mapping. Scan results enter a manual review queue, not a verified-client list.</p></div>
    <Link className="btn" href="/app/leads/import">Review {queue??0} pending →</Link>
  </div>
  <div className="mt-8 grid gap-5 sm:grid-cols-3">
    {[
      ['CRM businesses',total??'—',Building2],
      ['Awaiting review',queue??'—',FileCheck2],
      ['Geographic pilot','Allston → Brighton → Brookline',MapPinned],
    ].map(([label,value,Icon])=><section className="panel p-6" key={String(label)}>
      <div className="flex items-center gap-3"><Icon size={19} className="text-cyan-300"/><span className="muted text-sm">{label as string}</span></div>
      <p className="mt-5 text-xl font-semibold">{value as string|number}</p>
    </section>)}
  </div>
  {(p.added!==undefined||p.error)&&<div role="status" className="panel mt-6 p-5">
    {p.error?<p className="text-amber-200"><ShieldAlert className="mr-2 inline" size={17}/>Scan did not complete: {p.error}</p>
      :<p className="text-cyan-100">Staged {p.added} new candidate{p.added==='1'?'':'s'} from {p.source}. {p.skipped} known or repeated candidates skipped. None were automatically verified.</p>}
  </div>}
  <div className="mt-7 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
   <section className="panel p-7"><p className="kicker">Run one controlled discovery pass</p><h2 className="mt-3 text-2xl font-semibold">Find local businesses</h2>
     <p className="muted mt-3 text-sm leading-6">No background scraping. A scan begins only when you click the button; public-source availability and rate limits can affect results.</p>
     <form action={scanAndStage} className="mt-7 grid gap-5">
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
  <section className="panel mt-7 overflow-x-auto">
    <div className="flex flex-wrap items-center justify-between gap-4 p-6"><div><p className="kicker">Recent research</p><h2 className="mt-2 text-xl font-semibold">Latest source records</h2></div>
      <Link href="/app/leads/import" className="text-sm text-cyan-300 underline">Open review queue ↗</Link></div>
    {error&&<p className="p-5 text-red-300">Could not load discovered records.</p>}
    <table><thead><tr><th>Business</th><th>Area / city</th><th>Category</th><th>Origin</th><th>Status</th></tr></thead>
    <tbody>{(recent??[]).map(x=><tr key={x.id}>
      <td className="font-medium">{x.name}</td><td>{x.city||'Exact city not provided'}</td>
      <td>{x.category||'Unclassified'}</td>
      <td>{x.source_url?<a target="_blank" rel="noreferrer" className="text-cyan-300 underline" href={x.source_url}>{x.source_type} ↗</a>:x.source_type||'Unspecified'}</td>
      <td className="capitalize">{x.review_status}</td></tr>)}</tbody></table>
    {!recent?.length&&!error&&<p className="muted p-7 text-sm">No discovery records yet. Run a pilot scan above or import an official CSV manually.</p>}
  </section>
 </main>;
}
