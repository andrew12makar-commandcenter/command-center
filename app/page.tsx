import Link from 'next/link';
export default function PublicHome() {
  return <main className="shell flex items-center justify-center px-6 py-20">
    <section className="panel max-w-2xl p-10 sm:p-14">
      <div className="kicker">Command Center · Early development</div>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">Better systems.<br/>Better business.</h1>
      <p className="muted mt-6 max-w-xl leading-7">Private sales intelligence, verified local-business research, and client demo workflows. Public services branding is coming later.</p>
      <Link className="btn mt-8" href="/login">Private workspace →</Link>
    </section>
  </main>;
}
