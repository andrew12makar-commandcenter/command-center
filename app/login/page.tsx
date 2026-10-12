import Link from 'next/link';
import { signIn } from './actions';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="shell flex min-h-screen items-center justify-center p-6">
    <section className="panel w-full max-w-md p-8">
      <p className="kicker">Authorized access only</p>
      <h1 className="mt-4 text-3xl font-semibold">Command Center</h1>
      {!hasSupabaseConfig() ? <p className="muted mt-5">Supabase credentials have not been configured. See README.md for setup instructions.</p> :
      <form action={signIn} className="mt-8 space-y-4">
        <label className="block text-sm">Email<input className="mt-2" name="email" type="email" autoComplete="email" required/></label>
        <label className="block text-sm">Password<input className="mt-2" name="password" type="password" autoComplete="current-password" required/></label>
        {error && <p role="alert" className="text-sm text-red-300">Login failed. Check your email and password.</p>}
        <button className="btn w-full" type="submit">Sign in</button>
      </form>}
      <Link href="/" className="muted mt-6 inline-block text-sm">← Back to website</Link>
    </section>
  </main>;
}
