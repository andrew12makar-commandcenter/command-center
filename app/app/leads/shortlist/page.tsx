import Link from 'next/link';
import { ArrowUpRight, MapPin, Target } from 'lucide-react';
import { getBrightonShortlist, TWO_NEED_PROSPECT_TARGET } from '@/lib/brighton-shortlist';

export default function TwoNeedProspectShortlist() {
  const leads = getBrightonShortlist();
  return <main>
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="kicker">Lead Engine · Brighton, Allston and nearby towns</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Two-need prospect roster</h1>
        <p className="muted mt-3 max-w-3xl leading-6">Each candidate needs a missing or unusable first-party website plus a separate, useful customer-path or public-information improvement. These are researched candidates, not verified buyers or imported CRM records.</p>
      </div>
      <Link href="/app/discovery" className="btn">Open market map <ArrowUpRight size={16} className="ml-2"/></Link>
    </div>

    <section className="panel mt-7 grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <p className="kicker">Target raised after the four-section navigation consolidation</p>
        <h2 className="mt-2 text-2xl font-semibold">{leads.length} researched candidates toward {TWO_NEED_PROSPECT_TARGET}</h2>
        <p className="muted mt-2 text-sm leading-6">The list is evidence-backed research. Before outreach or CRM qualification, confirm current operation, exact listing identity, operator control and the service need with each business.</p>
      </div>
      <div className="rounded-2xl border border-[#2a4955] bg-[#122630] px-5 py-4 text-center">
        <Target className="mx-auto text-[#75d6e7]" size={20}/>
        <p className="mt-2 text-3xl font-semibold">{TWO_NEED_PROSPECT_TARGET}</p>
        <p className="muted mt-1 text-xs">two-need target</p>
      </div>
    </section>

    <section aria-label="Two-need prospect candidates" className="mt-6 space-y-3">
      {leads.map((lead) => <details key={lead.rank} className="shortlist-row panel overflow-hidden">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-5 py-4 hover:bg-[#14242e]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#2b5360] bg-[#12303b] text-sm font-semibold text-cyan-100">{lead.rank}</span>
          <span className="min-w-[220px] flex-1">
            <strong className="block text-sm">{lead.business}</strong>
            <span className="muted mt-1 flex items-center gap-1 text-xs"><MapPin size={12}/>{lead.distance}</span>
          </span>
          <span className="muted text-xs">Grade {lead.evidenceGrade}</span>
          <span className="rounded-full border border-[#394d58] px-3 py-1 text-xs text-[#b9cbd1]">Research review</span>
          <span aria-hidden="true" className="shortlist-chevron px-1 text-[#88a7b2]">⌄</span>
        </summary>
        <div className="grid gap-5 border-t border-[#263b46] px-5 py-5 lg:grid-cols-2">
          <div className="space-y-4 text-sm leading-6">
            <div><h3 className="text-xs font-bold uppercase tracking-wider text-[#88dce7]">Website baseline</h3><p className="muted mt-1">{lead.websiteEvidence}</p></div>
            <div><h3 className="text-xs font-bold uppercase tracking-wider text-[#88dce7]">Separate second need</h3><p className="muted mt-1">{lead.secondNeedEvidence}</p></div>
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
    </section>
  </main>;
}
