import Link from 'next/link';
import { ArrowUpRight, Target } from 'lucide-react';
import { getBrightonShortlist, TWO_NEED_PROSPECT_TARGET } from '@/lib/brighton-shortlist';
import { ProspectRosterBrowser } from '@/components/prospect-roster-browser';

export default function TwoNeedProspectShortlist() {
  const leads = getBrightonShortlist();
  const coreCount = leads.filter((lead) => lead.rosterStage === 'Core shortlist').length;
  const carryForwardCount = leads.filter((lead) => lead.rosterStage === 'Carry-forward · recheck').length;
  const newCount = leads.filter((lead) => lead.rosterStage === 'New addition').length;
  const qualifiedCount = coreCount + newCount;
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
        <p className="muted mt-2 text-sm leading-6">The Core shortlist has {coreCount} current two-need prospects, with {newCount} sourced additions. {carryForwardCount} carried-forward rows stay visible for recheck and do not count toward the target until requalified. Use the lead-pool selector to view all {leads.length}; this research does not confirm buyers or import CRM records.</p>
      </div>
      <div className="rounded-2xl border border-[#2a4955] bg-[#122630] px-5 py-4 text-center">
        <Target className="mx-auto text-[#75d6e7]" size={20}/>
        <p className="mt-2 text-3xl font-semibold">{TWO_NEED_PROSPECT_TARGET}</p>
        <p className="muted mt-1 text-xs">two-need target</p>
      </div>
    </section>

    <ProspectRosterBrowser leads={leads} />
  </main>;
}
