import Link from 'next/link';
import { MapPinned, ArrowLeft, Download } from 'lucide-react';
import { requireWorkspace } from '@/lib/workspace';
import { readGovernmentLocationReviews, readLatestGovernmentSnapshot } from './records';
import GovernmentMap from './view';
import CsvDownload from './csv-download';
import { serializeGovernmentCandidatesCsv } from '@/lib/government-discovery-export';
import { governmentLocationKey } from '@/lib/government-location-review';

export default async function GovernmentMapPage({ searchParams }: { searchParams: Promise<{ selected?: string; error?: string; saved?: string }> }) {
  await requireWorkspace();
  const [snapshot, reviews, params] = await Promise.all([readLatestGovernmentSnapshot(), readGovernmentLocationReviews(), searchParams]);
  const coveredLocations = new Set((snapshot?.candidates||[]).map((row)=>{const key=governmentLocationKey(row.name,row.address,row.zip);return key&&reviews[key]?.status==='covered'?key:null;}).filter((x):x is string=>Boolean(x)));
  return <main className="max-w-7xl">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="kicker">Local records · no paid APIs</p><h1 className="mt-3 text-4xl font-semibold">Brighton business map</h1>
        <p className="muted mt-3 max-w-3xl leading-7">Official city license records filtered to ZIP 02135 and ordered by approximate straight-line distance from Brighton Center. These are source records for review, not verified leads.</p></div>
      <Link className="btn" href="/app/discovery"><ArrowLeft size={16} className="mr-2"/>Discovery plan</Link>
    </div>
    {!snapshot ? <section className="panel mt-7 p-8"><p>No local government snapshot is available in this checkout yet.</p><p className="muted mt-2 text-sm">Download the three free Boston datasets and save a sanitized local snapshot, then reload this page.</p></section>
      : <>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ['ZIP 02135 source rows', snapshot.candidates.length],
            ['With mapped coordinates', snapshot.counts.mapped],
            ['Need location matching', snapshot.counts.needs_location_match],
            ['Exact duplicate flags', snapshot.counts.exact_duplicate_rows],
            ['X · covered locations removed from leads', coveredLocations.size],
          ].map(([label, count]) => <section className="panel p-5" key={label}><p className="muted text-sm">{label}</p><p className="mt-3 text-3xl font-semibold">{count}</p></section>)}
        </div>
        <section className="panel mt-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><MapPinned size={18} className="text-cyan-300"/><h2 className="text-xl font-semibold">Mapped city records</h2></div><p className="muted mt-2 text-sm">Center point: Brighton Center (approximate) · downloaded {new Date(snapshot.created_at).toLocaleString('en-US')}</p></div>
            <div className="flex flex-wrap gap-4 text-sm"><CsvDownload csv={serializeGovernmentCandidatesCsv(snapshot.candidates)} filename="brighton-government-records-zip-02135.csv"/><a className="text-cyan-300 underline" href="/app/discovery">Source and coverage details ↗</a></div></div>
          <div className="mt-4 rounded-xl border border-[#29434e] bg-[#0a151d] p-2 sm:p-4"><GovernmentMap candidates={snapshot.candidates} origin={snapshot.origin} reviews={reviews} selectedId={params.selected} error={params.error} saved={params.saved}/></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {snapshot.sources.map((source) => <a key={source.id} className="rounded-lg border border-[#29434e] p-3 text-sm hover:bg-[#11242d]" href={source.url} target="_blank" rel="noreferrer"><strong className="block">{source.title}</strong><span className="muted mt-1 block">{source.brighton_rows} filtered records · {source.source_rows.toLocaleString()} citywide rows</span><span className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-300">Official source <Download size={12}/></span></a>)}
          </div>
          <p className="muted mt-4 text-xs leading-5">{snapshot.coverage} Distance is straight-line, not driving distance. Multiple permits at one business and duplicate spellings can appear as separate source rows. Exact duplicate flags are for review and records are not merged. X reviews are saved locally in this checkout. Exact matches are hidden from the default Overture list and skipped before future discovery scans stage them; all city records remain visible on this map. It never changes shared CRM records. <Link className="text-cyan-300 underline" href="/app/discovery/overture">Open the screened prospect list ↗</Link></p>
        </section>
        <section className="panel mt-5 p-5 sm:p-6">
          <p className="kicker">Official source, manual lookup</p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <h2 className="text-lg font-semibold">Check Boston trade-name certificates</h2>
              <p className="muted mt-2 text-sm leading-6">The City Clerk’s searchable DBA database can look up a business name, address, neighborhood, ZIP code, business type and filing status. It is not part of this downloaded map, so use it to verify an individual candidate. A certificate records a name and address; it does not confirm the storefront is open or that it needs marketing help. Keep owner names and home addresses out of prospect notes.</p>
            </div>
            <a className="btn" href="https://www.cityofboston.gov/cityclerk/dbasearch/" target="_blank" rel="noreferrer">Open official DBA search ↗</a>
          </div>
        </section>
      </>}
  </main>;
}
