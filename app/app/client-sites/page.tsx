import Link from 'next/link';
import { ArrowUpRight, Globe } from 'lucide-react';
import { requireWorkspace } from '@/lib/workspace';
import { CLIENT_SITES } from '@/lib/client-sites';
import { getSiteActivity } from '@/lib/client-sites-server';
import { formatWhen, StageBadge } from './ui';

export const dynamic = 'force-dynamic';

export default async function ClientSitesPage() {
  await requireWorkspace();
  const sites = await Promise.all(CLIENT_SITES.map(async (site) => ({ site, activity: await getSiteActivity(site) })));
  return <main className="max-w-6xl">
    <p className="kicker">Client Delivery · read-only</p>
    <h1 className="mt-3 text-4xl font-semibold tracking-tight">Client Sites</h1>
    <p className="muted mt-3 max-w-3xl text-sm leading-6">Each client site lives in its own repository and hosting account. This page links to them, embeds their live preview and reads public commit and pull request data from GitHub. Nothing here changes a site.</p>
    <section className="mt-7 grid gap-5 md:grid-cols-2">
      {sites.map(({ site, activity }) => <article key={site.slug} className="panel flex flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3"><Globe size={18} className="text-[#75d6e7]" /><h2 className="text-xl font-semibold">{site.name}</h2></div>
          <StageBadge stage={site.stage} />
        </div>
        <p className="muted mt-3 text-sm leading-6">{site.summary}</p>
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="muted text-xs leading-5">Live</dt>
          <dd className="min-w-0 break-all"><a className="text-cyan-200 underline" href={site.liveUrl} target="_blank" rel="noopener noreferrer">{site.liveUrl.replace(/^https:\/\//, '')} ↗</a></dd>
          <dt className="muted text-xs leading-5">Last updated</dt>
          <dd>{activity.lastUpdated ? formatWhen(activity.lastUpdated) : <span className="muted">{activity.error ?? 'Unknown'}</span>}</dd>
          <dt className="muted text-xs leading-5">Hosting</dt>
          <dd>{site.hosting}</dd>
        </dl>
        <Link href={`/app/client-sites/${site.slug}`} className="btn mt-6 self-start">Open site dashboard <ArrowUpRight size={15} className="ml-2" /></Link>
      </article>)}
    </section>
    <p className="muted mt-6 text-xs">To add a client site, add one entry to <code>lib/client-sites.ts</code>.</p>
  </main>;
}
