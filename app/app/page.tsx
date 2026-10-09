import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function Dashboard() {
  const supabase = await createSupabaseServerClient();
  const [{ count: total }, { count: verified }, { count: won }] = await Promise.all([
    supabase.from('businesses').select('id', { count: 'exact', head: true }),
    supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('verification_status', 'verified'),
    supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('pipeline_status', 'won'),
  ]);
  return <main>
    <p className="kicker">Operations overview</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Mission Control</h1>
    <p className="muted mt-3">Live metrics from your organization's records. No invented businesses or simulated scan counts.</p>
    <div className="mt-8 grid gap-5 md:grid-cols-3">
      {[['Businesses', total], ['Verified', verified], ['Won clients', won]].map(([label, value]) => <section className="panel p-7" key={String(label)}><p className="muted text-sm">{label}</p><p className="mt-5 text-4xl font-semibold">{value ?? '—'}</p></section>)}
    </div>
    <section className="panel mt-8 p-8"><p className="kicker">Next operation</p><h2 className="mt-2 text-xl font-medium">Connect verified source data</h2><p className="muted mt-3 max-w-xl">The CRM schema stores public registry provenance, verification confidence and sales status. CSV import and automated collectors are the next deliverable.</p><Link href="/app/leads" className="btn mt-5">Open CRM →</Link></section>
  </main>;
}
