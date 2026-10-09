import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { signOut } from '@/app/login/actions';

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseConfig()) return <main className="shell flex items-center justify-center p-6"><div className="panel max-w-lg p-8"><p className="kicker">Setup required</p><h1 className="mt-3 text-2xl">Connect Supabase</h1><p className="muted mt-3">Set environment variables and run the database migration before the private app can be used. See README.md.</p></div></main>;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  // Authenticated users still need organization membership for CRM queries (enforced in database RLS).
  return <div className="shell lg:flex">
    <aside className="w-full border-b border-[#243745] bg-[#0d151d] p-6 lg:min-h-screen lg:w-60 lg:border-b-0 lg:border-r">
      <Link href="/app" className="font-semibold tracking-wide">◉ COMMAND CENTER</Link>
      <p className="kicker mt-3">Business operations</p>
      <nav className="mt-10 flex gap-4 text-sm lg:flex-col">
        <Link href="/app" className="muted hover:text-white">Overview</Link>
        <Link href="/app/leads" className="muted hover:text-white">Business CRM</Link>
      </nav>
      <form action={signOut} className="mt-8"><button className="muted cursor-pointer text-xs" type="submit">Sign out</button></form>
    </aside>
    <div className="min-w-0 flex-1 px-6 py-10 lg:px-12">{children}</div>
  </div>;
}
