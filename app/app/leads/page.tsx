import { createSupabaseServerClient } from '@/lib/supabase/server';

type BusinessRow = {
  id: string; name: string; city: string | null; category: string | null;
  verification_status: string; pipeline_status: string; priority_score: number | null; website_url: string | null;
};

export default async function LeadsPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('businesses')
    .select('id,name,city,category,verification_status,pipeline_status,priority_score,website_url')
    .order('priority_score', { ascending: false, nullsFirst: false }).limit(100);
  const businesses = (data ?? []) as BusinessRow[];
  return <main>
    <p className="kicker">Source-verified prospects</p>
    <h1 className="mt-3 text-4xl font-semibold">Business CRM</h1>
    <p className="muted mt-3">Records are visible only to authorized organization members. Verification is tracked independently from the sales score.</p>
    {error && <div className="panel mt-6 p-5 text-sm text-red-300">Database query unavailable: check migration and organization membership.</div>}
    <div className="panel mt-8 overflow-x-auto">
      <table><thead><tr><th>Business</th><th>City</th><th>Industry</th><th>Verification</th><th>Pipeline</th><th>Score</th></tr></thead>
      <tbody>{businesses.map((b) => <tr key={b.id}><td className="font-medium">{b.name}{b.website_url && <a className="ml-2 text-xs text-cyan-300" href={b.website_url} target="_blank" rel="noreferrer">Website ↗</a>}</td><td>{b.city || 'Unknown'}</td><td>{b.category || 'Unclassified'}</td><td>{b.verification_status}</td><td>{b.pipeline_status}</td><td>{b.priority_score ?? 'Not scored'}</td></tr>)}</tbody></table>
      {!businesses.length && !error && <p className="muted p-8 text-center text-sm">No businesses imported yet. Real records will appear here after source verification.</p>}
    </div>
  </main>;
}
