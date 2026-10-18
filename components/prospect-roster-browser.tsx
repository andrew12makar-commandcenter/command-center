'use client';

import { useMemo, useState } from 'react';
import { ArrowUpRight, MapPin, Search } from 'lucide-react';
import type { BrightonShortlistLead } from '@/lib/brighton-shortlist';

type SortMode = 'best-evidence' | 'nearest' | 'type' | 'name';

export function ProspectRosterBrowser({ leads }: { leads: BrightonShortlistLead[] }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All types');
  const [sort, setSort] = useState<SortMode>('best-evidence');

  const types = useMemo(() => ['All types', ...new Set(leads.map((lead) => lead.type).sort())], [leads]);
  const visibleLeads = useMemo(() => {
    const search = query.trim().toLowerCase();
    const filtered = leads.filter((lead) => {
      const matchesType = type === 'All types' || lead.type === type;
      const matchesSearch = !search || [lead.business, lead.distance, lead.publicContact, lead.secondNeedEvidence, lead.nextOffer, lead.type]
        .join(' ').toLowerCase().includes(search);
      return matchesType && matchesSearch;
    });

    const distance = (value: string) => Number(value.match(/[\d.]+/)?.[0] ?? 999);
    return filtered.sort((a, b) => {
      if (sort === 'nearest') return distance(a.distance) - distance(b.distance) || a.business.localeCompare(b.business);
      if (sort === 'type') return a.type.localeCompare(b.type) || distance(a.distance) - distance(b.distance);
      if (sort === 'name') return a.business.localeCompare(b.business);
      return a.evidenceGrade.localeCompare(b.evidenceGrade) || distance(a.distance) - distance(b.distance);
    });
  }, [leads, query, sort, type]);

  return <>
    <section aria-label="Sort and filter prospects" className="panel mt-6 grid gap-4 p-4 md:grid-cols-[minmax(220px,1fr)_minmax(180px,0.7fr)_minmax(180px,0.7fr)] md:items-end">
      <label className="block">
        <span className="kicker">Find a business or need</span>
        <span className="relative mt-2 block">
          <Search aria-hidden="true" size={16} className="muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, neighborhood, or opportunity" className="mt-2 w-full pl-9" aria-label="Search candidates" />
        </span>
      </label>
      <label className="block">
        <span className="kicker">Lead type</span>
        <select value={type} onChange={(event) => setType(event.target.value)} className="mt-2 w-full" aria-label="Filter by lead type">
          {types.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="kicker">Sort roster</span>
        <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="mt-2 w-full" aria-label="Sort candidates">
          <option value="best-evidence">Strongest second-need evidence</option>
          <option value="nearest">Closest to Brighton Center</option>
          <option value="type">Group by lead type</option>
          <option value="name">Business name A–Z</option>
        </select>
      </label>
      <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#263b46] pt-3">
        <div className="flex flex-wrap gap-2" aria-label="Quick lead type filters">
          {types.map((item) => {
            const count = item === 'All types' ? leads.length : leads.filter((lead) => lead.type === item).length;
            return <button key={item} type="button" onClick={() => setType(item)} aria-pressed={type === item} className={`rounded-full border px-3 py-1.5 text-xs transition ${type === item ? 'border-cyan-300 bg-cyan-950/70 text-cyan-100' : 'border-[#394d58] text-[#b9cbd1] hover:border-[#75d6e7]'}`}>
              {item} <span className="ml-1 opacity-70">{count}</span>
            </button>;
          })}
        </div>
        <p className="muted text-xs" aria-live="polite">Showing {visibleLeads.length} of {leads.length} candidates</p>
      </div>
    </section>

    <section aria-label="Two-need prospect candidates" className="mt-4 space-y-3">
      {visibleLeads.map((lead, index) => <details key={lead.rank} className="shortlist-row panel overflow-hidden">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-5 py-4 hover:bg-[#14242e]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#2b5360] bg-[#12303b] text-sm font-semibold text-cyan-100">{index + 1}</span>
          <span className="min-w-[220px] flex-1">
            <strong className="block text-sm">{lead.business}</strong>
            <span className="muted mt-1 flex items-center gap-1 text-xs"><MapPin size={12}/>{lead.distance}</span>
          </span>
          <span className="rounded-full border border-[#394d58] px-3 py-1 text-xs text-[#b9cbd1]">{lead.type}</span>
          <span className="muted text-xs">Need evidence {lead.evidenceGrade}</span>
          <span className="rounded-full border border-[#394d58] px-3 py-1 text-xs text-[#b9cbd1]">Research review</span>
          <span aria-hidden="true" className="shortlist-chevron px-1 text-[#88a7b2]">⌄</span>
        </summary>
        <div className="grid gap-5 border-t border-[#263b46] px-5 py-5 lg:grid-cols-2">
          <div className="space-y-4 text-sm leading-6">
            <div><h3 className="text-xs font-bold uppercase tracking-wider text-[#88dce7]">Website / Maps evidence</h3><p className="muted mt-1">{lead.websiteEvidence}</p></div>
            <div><h3 className="text-xs font-bold uppercase tracking-wider text-[#88dce7]">Second digital opportunity</h3><p className="muted mt-1">{lead.secondNeedEvidence}</p></div>
          </div>
          <div className="space-y-4 text-sm leading-6">
            <div><h3 className="text-xs font-bold uppercase tracking-wider text-[#88dce7]">Suggested confirmation question</h3><p className="muted mt-1">{lead.pitchQuestion}</p></div>
            <div><h3 className="text-xs font-bold uppercase tracking-wider text-[#88dce7]">Possible offer</h3><p className="muted mt-1">{lead.nextOffer}</p></div>
            <p className="text-xs text-[#91aab5]">Checked {lead.checked} · {lead.confidence}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {lead.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-cyan-300 underline">{source.label}<ArrowUpRight size={12}/></a>)}
            </div>
          </div>
        </div>
      </details>)}
      {visibleLeads.length === 0 && <div className="panel p-8 text-center"><p className="font-semibold">No candidates match that search.</p><p className="muted mt-2 text-sm">Try another business name, lead type, or customer need.</p></div>}
    </section>
  </>;
}
