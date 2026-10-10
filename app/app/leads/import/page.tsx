import Link from 'next/link';
import {requireWorkspace} from '@/lib/workspace';
import {approveImportedRow,skipImportedRow,stageCsv} from '../actions';
import {classifyIndustry,industryLabel,researchPriority} from '@/lib/business-classification';

function safeExternalUrl(value:string|null|undefined):string|null{
 if(!value)return null;
 try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.toString():null;}
 catch{return null;}
}
type Params={staged?:string;error?:string;query?:string;industry?:string;website?:string;sort?:string;page?:string};
type StagedRow={
 id:string;name:string|null;city:string|null;category:string|null;
 source_url:string|null;website_url:string|null;review_status:string;
 matched_business_id:string|null;row_number:number;created_at:string
};
const PAGE_SIZE=40;
// This queue is research triage. It does not certify businesses or estimate revenue.
export default async function ImportPage({searchParams}:{searchParams:Promise<Params>}){
 const {supabase,organizationId}=await requireWorkspace();
 const p=await searchParams;
 const [{data,count,error:loadError}]=await Promise.all([
   supabase.from('lead_import_rows')
    .select('id,name,city,category,source_url,website_url,review_status,matched_business_id,row_number,created_at',{count:'exact'})
    .eq('organization_id',organizationId).eq('review_status','pending')
    .order('created_at',{ascending:false}).order('row_number',{ascending:true}).limit(1000)
 ]);
 const all=(data??[]) as StagedRow[];
 const industry=['medical','landscaping','universal','unknown'].includes(p.industry||'')?p.industry||'':'';
 const website=['yes','no'].includes(p.website||'')?p.website||'':'';
 const sort=['newest','oldest'].includes(p.sort||'')?p.sort!:'priority';
 const query=(p.query||'').trim().slice(0,100);
 const normalized=query.toLocaleLowerCase();
 const scored=all.map(row=>{
   const decision=classifyIndustry(row.name||'',row.category);
   return {row,decision,priority:researchPriority(row.name||'',row.category,row.website_url,row.source_url,row.city)};
 });
 const filtered=scored.filter(x=>{
   const row=x.row;
   if(industry&&(x.decision.template||'unknown')!==industry)return false;
   if(website==='yes'&&!row.website_url)return false;
   if(website==='no'&&row.website_url)return false;
   if(normalized&&![row.name,row.city,row.category].some(v=>(v||'').toLocaleLowerCase().includes(normalized)))return false;
   return true;
 }).sort((a,b)=>sort==='newest'?
   b.row.created_at.localeCompare(a.row.created_at):
   sort==='oldest'?a.row.created_at.localeCompare(b.row.created_at):
   b.priority-a.priority||a.row.created_at.localeCompare(b.row.created_at));
 const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
 const requestedPage=Number(p.page);
 const page=Number.isInteger(requestedPage)?Math.max(1,Math.min(pages,requestedPage)):1;
 const shown=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
 const pageHref=(n:number)=>{
   const q=new URLSearchParams();
   if(query)q.set('query',query);
   if(industry)q.set('industry',industry);
   if(website)q.set('website',website);
   if(sort!=='priority')q.set('sort',sort);
   q.set('page',String(n));
   return '/app/leads/import?'+q.toString();
 };
 return <main className="max-w-7xl">
   <Link href="/app/leads" className="muted text-sm">← Business CRM</Link>
   <p className="kicker mt-7">Evidence-first import</p><h1 className="mt-2 text-4xl font-semibold">Prospect Research Queue</h1>
   <p className="muted mt-3 max-w-4xl">Sort discovered candidates by recorded industry and available research links before importing. Industry hints are not verified facts. Every company still needs independent identity and operating-status review.</p>
   <section className="panel mt-8 p-7">
     <h2 className="text-xl font-semibold">Stage a CSV file</h2>
     <p className="muted mt-3 text-sm">Up to 500 business rows, 750 KB per upload. Headers: business_name, city, category, website, phone, source_url, source_type. Extra columns remain in source data.</p>
     <form action={stageCsv} className="mt-5 flex flex-wrap items-end gap-4">
       <label className="text-sm">CSV file (.csv)<input name="csv_file" type="file" accept=".csv,text/csv" className="mt-2" required /></label>
       <button className="btn" type="submit">Stage for review</button>
     </form>
     {p.staged&&<p className="mt-3 text-sm text-cyan-200">{p.staged} rows staged. Review them below.</p>}
     {p.error&&<p role="alert" className="mt-3 text-sm text-red-300">{p.error==='file'?'Select a CSV under 750 KB.':p.error==='length'?'Include a header and 1–500 records.':'The CSV could not be parsed; check quoted cells.'}</p>}
   </section>
   <section className="panel mt-7 p-6">
     <div className="flex flex-wrap items-baseline justify-between gap-3">
       <div><p className="kicker">Research triage</p><h2 className="mt-2 text-xl font-semibold">Filter discovered businesses</h2></div>
       <span className="muted text-xs">{count??0} pending total · reviewing up to 1,000 newest</span>
     </div>
     <form method="get" action="/app/leads/import" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
       <label className="text-sm">Search name / area<input className="mt-2" name="query" defaultValue={query} maxLength={100} placeholder="e.g., dentist, Brookline"/></label>
       <label className="text-sm">Industry hint<select className="mt-2" name="industry" defaultValue={industry}>
         <option value="">All industries</option><option value="medical">Medical / dental</option>
         <option value="landscaping">Home & field services</option><option value="universal">Other business</option>
         <option value="unknown">Needs classification</option></select></label>
       <label className="text-sm">Recorded website<select className="mt-2" name="website" defaultValue={website}>
         <option value="">All websites</option><option value="yes">Website link recorded</option><option value="no">No website link recorded</option></select></label>
       <label className="text-sm">Sort<select className="mt-2" name="sort" defaultValue={sort}>
         <option value="priority">Research first: high-value sector + evidence</option><option value="oldest">Oldest first</option><option value="newest">Newest first</option></select></label>
       <div className="flex items-end gap-3"><button type="submit" className="btn">Apply filters</button><Link href="/app/leads/import" className="text-xs text-cyan-300 underline">Clear</Link></div>
     </form>
     <p className="muted mt-4 text-xs">Research order favors medical/home services and complete source links. It is not an automated sales opportunity score, proof of missing websites, or a prediction of customer spend.</p>
   </section>
   <section className="panel mt-7 overflow-x-auto">
     <div className="flex flex-wrap items-center justify-between gap-4 p-6">
       <h2 className="text-xl font-semibold">Review queue</h2>
       <p className="muted text-xs">{filtered.length} matching in fetched records · page {page}/{pages} · {PAGE_SIZE} per page</p>
     </div>
     {loadError&&<p className="p-5 text-red-300">Cannot read staged leads. Check database connectivity and organization access.</p>}
     {(count??0)>1000&&<p className="mx-6 mb-3 text-sm text-amber-300">More than 1,000 records are pending. The research filters currently cover the newest 1,000; older rows require an expanded server-side queue.</p>}
     <table><thead><tr><th>Business</th><th>Location</th><th>Industry hint</th><th>Source</th><th>Website</th><th>Action</th></tr></thead>
     <tbody>{shown.map(({row,decision})=><tr key={row.id}>
       <td className="font-medium">{row.name||'Missing name'}<small className="muted mt-1 block">{row.category||'No source category'}</small></td>
       <td>{row.city||'Unknown'}</td>
       <td><span className="text-xs">{industryLabel(decision)}</span><small className="muted block">{decision.confidence==='unknown'?'Review required':decision.confidence==='name_hint'?'Name hint · verify':'From category · verify'}</small></td>
       <td>{safeExternalUrl(row.source_url)?<a className="break-all text-xs text-cyan-300 underline" href={safeExternalUrl(row.source_url)!} target="_blank" rel="noopener noreferrer">Original evidence ↗</a>:<span className="muted text-xs">{row.source_url?'Invalid URL':'No source recorded'}</span>}</td>
       <td>{safeExternalUrl(row.website_url)?<a className="break-all text-xs text-cyan-300 underline" href={safeExternalUrl(row.website_url)!} target="_blank" rel="noopener noreferrer">Inspect site ↗</a>:<span className="muted text-xs">{row.website_url?'Invalid URL':'Not recorded'}</span>}</td>
       <td><div className="flex flex-wrap gap-2">
         <form action={approveImportedRow}><input type="hidden" name="row_id" value={row.id}/><button className="btn text-xs" type="submit">Import to CRM</button></form>
         <form action={skipImportedRow}><input type="hidden" name="row_id" value={row.id}/><button className="text-xs text-slate-400 underline" type="submit">Skip</button></form>
       </div></td>
     </tr>)}</tbody></table>
     {!shown.length&&!loadError&&<p className="muted p-8 text-sm">No pending candidates match these filters.</p>}
     {pages>1&&<nav aria-label="Queue pages" className="flex items-center justify-end gap-5 border-t border-[#273b48] p-5 text-sm">
       {page>1&&<Link className="text-cyan-300 underline" href={pageHref(page-1)}>← Previous</Link>}
       <span className="muted">{page} of {pages}</span>
       {page<pages&&<Link className="text-cyan-300 underline" href={pageHref(page+1)}>Next →</Link>}
     </nav>}
   </section>
   <p className="muted mt-4 text-xs">Duplicate detection uses normalized name and city among existing CRM records. Source category and industry hints are not verified. Do not send generated sales demos before confirming each business's details.</p>
 </main>;
}
