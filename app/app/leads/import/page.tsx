import Link from 'next/link';
import { requireWorkspace } from '@/lib/workspace';
import { approveImportedRow,skipImportedRow,stageCsv } from '../actions';

export default async function ImportPage({searchParams}:{searchParams:Promise<{staged?:string;error?:string}>}){
  const {supabase,organizationId}=await requireWorkspace();
  const {staged,error}=await searchParams;
  const {data, count, error:loadError}=await supabase.from('lead_import_rows')
    .select('id,name,city,category,source_url,website_url,review_status,matched_business_id,row_number,created_at',{count:'exact'})
    .eq('organization_id',organizationId)
    .order('created_at',{ascending:false}).order('row_number',{ascending:true}).limit(150);
  const rows=data??[];
  return <main>
    <Link href="/app/leads" className="muted text-sm">← Business CRM</Link>
    <p className="kicker mt-7">Evidence-first import</p><h1 className="mt-2 text-4xl font-semibold">Research intake</h1>
    <p className="muted mt-3 max-w-3xl">CSV records are staged for review, not automatically treated as verified operating businesses. Source and website fields remain distinct.</p>
    <section className="panel mt-8 max-w-4xl p-7">
      <h2 className="text-xl font-semibold">Stage a CSV file</h2>
      <p className="muted mt-3 text-sm">Up to 500 business rows, 750 KB per upload. Headers supported: business_name, city, category, website, phone, source_url, source_type. Extra columns are preserved as raw source data.</p>
      <form action={stageCsv} className="mt-5 flex flex-wrap items-end gap-4">
        <label className="text-sm">CSV file (.csv)<input name="csv_file" type="file" accept=".csv,text/csv" className="mt-2" required /></label>
        <button className="btn" type="submit">Stage for review</button>
      </form>
      {staged && <p className="mt-3 text-sm text-cyan-200">{staged} rows staged. Review them below.</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error==='file'?'Select a CSV under 750 KB.':error==='length'?'Include a header and 1–500 records.':'The CSV could not be parsed; check quoted cells.'}</p>}
    </section>
    <section className="panel mt-8 overflow-x-auto">
      <div className="flex items-center justify-between p-6"><h2 className="text-xl font-semibold">Review queue</h2><p className="muted text-xs">{count??0} staged rows · 150 most recent shown</p></div>
      {loadError&&<p className="p-5 text-red-300">Cannot read staged records. Apply migration 0002 first.</p>}
      <table><thead><tr><th>Row</th><th>Business</th><th>Location</th><th>Source</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>{rows.map(r=><tr key={r.id}>
        <td className="muted">{r.row_number}</td>
        <td className="font-medium">{r.name||'Missing name'}{r.category&&<span className="muted block text-xs">{r.category}</span>}</td>
        <td>{r.city||'Unknown'}</td>
        <td>{r.source_url?<a className="break-all text-xs text-cyan-300 underline" href={r.source_url} target="_blank" rel="noreferrer">Original evidence ↗</a>:<span className="muted text-xs">No source supplied</span>}</td>
        <td className="capitalize">{r.review_status}</td>
        <td>{r.review_status==='pending'?<div className="flex gap-2">
          <form action={approveImportedRow}><input type="hidden" name="row_id" value={r.id}/><button className="btn text-xs" type="submit">Import</button></form>
          <form action={skipImportedRow}><input type="hidden" name="row_id" value={r.id}/><button className="text-xs text-slate-400 underline" type="submit">Skip</button></form>
        </div>:r.matched_business_id?<Link className="text-xs text-cyan-300 underline" href={'/app/leads/'+r.matched_business_id}>View CRM record ↗</Link>:<span className="muted">Review CSV</span>}</td>
      </tr>)}</tbody></table>
      {!rows.length&&!loadError&&<p className="muted p-8 text-sm">No staged records yet.</p>}
    </section>
    <p className="muted mt-4 text-xs">Duplicate detection currently checks normalized name + city among the first 1,000 CRM records. It flags exact local matches, but is not a full entity-resolution engine. Review possible franchise or branch duplicates manually.</p>
  </main>;
}
