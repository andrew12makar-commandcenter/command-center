import Link from 'next/link';
import { ArrowUpRight, Target } from 'lucide-react';
import { getBrightonShortlist, getScreeningLedger, TWO_NEED_PROSPECT_TARGET } from '@/lib/brighton-shortlist';
import { summarizeScreening } from '@/lib/screening-ledger';
import { ProspectRosterBrowser } from '@/components/prospect-roster-browser';

export default function TwoNeedProspectShortlist() {
  const leads = getBrightonShortlist();
  const screened = getScreeningLedger(leads);
  const screening = summarizeScreening(screened);
  const coreCount = leads.filter((lead) => lead.rosterStage === 'Core shortlist').length;
  const carryForwardCount = leads.filter((lead) => lead.rosterStage === 'Carry-forward · recheck').length;
  const newCount = leads.filter((lead) => lead.rosterStage === 'New addition').length;
  const qualifiedCoreCount = leads.filter((lead) => lead.rosterStage === 'Core shortlist' && lead.qualified).length;
  const heldCoreCount = coreCount - qualifiedCoreCount;
  const qualifiedCount = leads.filter((lead) => lead.qualified).length;
  return <main>
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="kicker">Lead Engine · Brighton, Allston and nearby towns</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Two-need prospect roster</h1>
        <p className="muted mt-3 max-w-3xl leading-6">Each candidate has a documented website or Google Maps customer-path issue plus a second digital opportunity. A live site can still need a focused fix. Search and sort by business type, distance, or evidence; research strength is not buying intent.</p>
      </div>
      <Link href="/app/discovery" className="btn">Open market map <ArrowUpRight size={16} className="ml-2"/></Link>
    </div>

    <section className="panel mt-7 grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <p className="kicker">Research-backed local prospects</p>
        <h2 className="mt-2 text-2xl font-semibold">{qualifiedCount} qualified research candidates toward {TWO_NEED_PROSPECT_TARGET}</h2>
        <p className="muted mt-2 text-sm leading-6">{qualifiedCoreCount} of the {coreCount} Core shortlist rows qualify{heldCoreCount ? ` (${heldCoreCount} held pending a verified second need)` : ''}, plus {newCount} sourced additions. {carryForwardCount} carried-forward rows stay visible for recheck and do not count toward the target until requalified. Use the lead-pool selector to view all {leads.length}; this research does not confirm buyers or import CRM records.</p>
      </div>
      <div className="rounded-2xl border border-[#2a4955] bg-[#122630] px-5 py-4 text-center">
        <Target className="mx-auto text-[#75d6e7]" size={20}/>
        <p className="mt-2 text-3xl font-semibold">{TWO_NEED_PROSPECT_TARGET}</p>
        <p className="muted mt-1 text-xs">two-need target</p>
      </div>
    </section>

    <ProspectRosterBrowser leads={leads} />

    <details className="panel mt-6 overflow-hidden">
      <summary className="cursor-pointer list-none px-6 py-5 hover:bg-[#14242e]">
        <p className="kicker">Screening ledger</p>
        <h2 className="mt-2 text-xl font-semibold">{screening.total} screened businesses not counted</h2>
        <p className="muted mt-2 text-sm leading-6">{screening.excluded} excluded and {screening.held} held, each with its discovery source, check date and reason. Directory and license records are discovery sources only; nothing here is counted toward the target.</p>
        <p className="mt-3 flex flex-wrap gap-2 text-xs">{screening.byReason.map(([label, count]) => <span key={label} className="rounded-full border border-[#394d58] px-3 py-1 text-[#b9cbd1]">{label} · {count}</span>)}</p>
      </summary>
      <div className="overflow-x-auto border-t border-[#263b46]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-[#88dce7]"><tr><th className="px-6 py-3">Business</th><th className="px-3 py-3">Decision</th><th className="px-3 py-3">Reason</th><th className="px-3 py-3">Source · checked</th></tr></thead>
          <tbody>{screened.map((entry) => <tr key={entry.business} className="border-t border-[#23343d] align-top">
            <td className="px-6 py-3"><strong>{entry.business}</strong><span className="muted block text-xs">{entry.address}</span></td>
            <td className="px-3 py-3 capitalize">{entry.decision}</td>
            <td className="px-3 py-3"><span className="block">{entry.reasonLabel}</span><span className="muted block text-xs">{entry.reason}</span>{entry.evidenceUrl && <a href={entry.evidenceUrl} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 underline">Evidence</a>}</td>
            <td className="muted px-3 py-3 text-xs">{entry.discoverySource} · {entry.checked}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </details>
  </main>;
}
