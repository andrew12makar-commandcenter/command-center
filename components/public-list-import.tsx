'use client';

import { useMemo, useState } from 'react';
import { candidateStatusLabels, parsePublicBusinessList, previewPublicBusinessList, PUBLIC_LIST_HEADERS, type CandidateStatus, type KnownBusiness, type PublicListPreview } from '@/lib/public-business-import';

const STATUS_ORDER: CandidateStatus[] = ['new', 'in_roster', 'in_ledger', 'already_staged', 'in_crm', 'out_of_scope'];

// Browser-side preview only. The server action re-parses and re-matches the
// file before staging, so this preview never decides what gets saved.
export function PublicListImport({ known, action }: { known: KnownBusiness[]; action: (form: FormData) => Promise<void> }) {
  const [preview, setPreview] = useState<PublicListPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<CandidateStatus | 'all'>('new');

  async function onFile(file: File | undefined) {
    setPreview(null); setError(null);
    if (!file) return;
    if (file.size > 750_000) { setError('Select a CSV under 750 KB.'); return; }
    try {
      setPreview(previewPublicBusinessList(parsePublicBusinessList(await file.text()), known));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'The CSV could not be read.');
    }
  }

  const shown = useMemo(() => (preview?.candidates ?? []).filter((c) => filter === 'all' || c.status === filter), [preview, filter]);

  return <form action={action} className="mt-4 space-y-4">
    <label className="block text-xs">Public business list (.csv)
      <input name="public_list_file" type="file" accept=".csv,text/csv" className="mt-1" required onChange={(event) => onFile(event.target.files?.[0])} />
    </label>
    <p className="muted text-xs">Required headers, exactly: {PUBLIC_LIST_HEADERS.join(', ')}. Up to 1,000 rows. No contact fields.</p>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {preview && <div className="space-y-3">
      <p className="text-sm">{preview.rowCount} rows → <strong>{preview.candidates.length} unique businesses</strong> ({preview.duplicateRows} repeated license or alias rows combined). {preview.sameNameOtherAddress > 0 && <span className="muted">{preview.sameNameOtherAddress} share a name with a listing at another address and were kept separate.</span>}</p>
      <div className="flex flex-wrap gap-2" aria-label="Preview groups">
        {(['all', ...STATUS_ORDER] as const).map((status) => <button key={status} type="button" onClick={() => setFilter(status)} aria-pressed={filter === status}
          className={`rounded-full border px-3 py-1 text-xs ${filter === status ? 'border-cyan-300 bg-cyan-950/70 text-cyan-100' : 'border-[#394d58] text-[#b9cbd1]'}`}>
          {status === 'all' ? 'All' : candidateStatusLabels[status]} · {status === 'all' ? preview.candidates.length : preview.counts[status]}
        </button>)}
      </div>
      <p className="muted text-xs">Every location is <strong>unresolved</strong>: this file has addresses but no reliable coordinates, so no distance or map pin is shown. Staged rows go to the review queue as “review needed” — never qualified, never added to the CRM.</p>
      <div className="max-h-96 overflow-auto rounded-xl border border-[#263b46]">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="sticky top-0 bg-[#0d1922] uppercase tracking-wider text-[#88dce7]"><tr><th className="px-3 py-2">Business</th><th className="px-3 py-2">Address · location</th><th className="px-3 py-2">Sources</th><th className="px-3 py-2">Status</th></tr></thead>
          <tbody>{shown.map((c) => <tr key={c.key + c.address} className="border-t border-[#23343d] align-top">
            <td className="px-3 py-2"><strong>{c.name}</strong>{c.aliases.length > 0 && <span className="muted block">Also listed as {c.aliases.join('; ')}</span>}</td>
            <td className="px-3 py-2">{c.address}{c.addressVariants.length > 0 && <span className="muted block">Also {c.addressVariants.join('; ')}</span>}<span className="block text-amber-200">Location unresolved</span></td>
            <td className="muted px-3 py-2">{c.sources.join(' · ')} ({c.rows.length} row{c.rows.length === 1 ? '' : 's'}){c.flags.includes('same_name_other_address') && <span className="block text-amber-200">Same name at another address</span>}</td>
            <td className="px-3 py-2">{candidateStatusLabels[c.status]}<span className="muted block">{c.statusReason}</span></td>
          </tr>)}</tbody>
        </table>
      </div>
      <button type="submit" className="btn !py-2 text-sm" disabled={!preview.counts.new}>Stage {preview.counts.new} new candidates for review</button>
    </div>}
  </form>;
}
