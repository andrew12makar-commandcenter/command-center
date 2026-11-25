import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Globe } from 'lucide-react';
import { requireWorkspace } from '@/lib/workspace';
import { CLIENT_SITES, COLLECTION_LABELS, sitesInCollection, type ClientSite, type ClientSiteCollection } from '@/lib/client-sites';
import { getSiteActivity, type SiteActivity } from '@/lib/client-sites-server';
import { formatWhen, StageBadge } from './ui';

export const dynamic = 'force-dynamic';

function primaryLabel(site: ClientSite) {
  return site.collection === 'demo' ? 'Preview' : 'Live';
}

function SiteCard({ site, activity }: { site: ClientSite; activity: SiteActivity }) {
  return <article className="panel flex flex-col p-6">
    {site.thumbnail && <Link href={`/app/client-sites/${site.slug}`} className="mb-5 block overflow-hidden rounded-lg border border-[#243b47]"><Image src={site.thumbnail.src} alt={site.thumbnail.alt} width={site.thumbnail.width} height={site.thumbnail.height} className="h-auto w-full" sizes="(min-width: 768px) 560px, 100vw" /></Link>}
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3"><Globe size={18} className="text-[#75d6e7]" /><h3 className="text-xl font-semibold">{site.name}</h3></div>
      <StageBadge stage={site.stage} />
    </div>
    <p className="muted mt-3 text-sm leading-6">{site.summary}</p>
    {site.saleNote && <p className="mt-3 text-sm text-emerald-100">{site.saleNote}</p>}
    <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="muted text-xs leading-5">{primaryLabel(site)}</dt>
      <dd className="min-w-0 break-all"><a className="text-cyan-200 underline" href={site.liveUrl} target="_blank" rel="noopener noreferrer">{site.liveUrl.replace(/^https:\/\//, '')} ↗</a></dd>
      {site.pinnedUrl && <>
        <dt className="muted text-xs leading-5">Pinned</dt>
        <dd className="min-w-0 break-all"><a className="text-cyan-200 underline" href={site.pinnedUrl} target="_blank" rel="noopener noreferrer">{site.pinnedUrl.replace(/^https:\/\//, '')} ↗</a></dd>
      </>}
      <dt className="muted text-xs leading-5">Last updated</dt>
      <dd>{activity.lastUpdated ? formatWhen(activity.lastUpdated) : <span className="muted">{activity.error ?? 'Unknown'}</span>}</dd>
      <dt className="muted text-xs leading-5">Hosting</dt>
      <dd>{site.hosting}</dd>
    </dl>
    <Link href={`/app/client-sites/${site.slug}`} className="btn mt-6 self-start">Open site dashboard <ArrowUpRight size={15} className="ml-2" /></Link>
  </article>;
}

export default async function ClientSitesPage() {
  await requireWorkspace();
  const sites = await Promise.all(CLIENT_SITES.map(async (site) => ({ site, activity: await getSiteActivity(site) })));
  const bySlug = new Map(sites.map((row) => [row.site.slug, row]));
  const collections: ClientSiteCollection[] = ['build', 'demo'];
  return <main className="max-w-6xl">
    <p className="kicker">Client Delivery · read-only</p>
    <h1 className="mt-3 text-4xl font-semibold tracking-tight">Client Builds &amp; Demos</h1>
    <p className="muted mt-3 max-w-3xl text-sm leading-6">Client Builds are sold or live sites on a domain. Client Demos are preview-only work that is not on a custom domain. Each site lives in its own repository and hosting account. This page links to them, embeds their preview and records public release metadata. Nothing here changes a site.</p>
    {collections.map((collection) => {
      const rows = sitesInCollection(collection).map((site) => bySlug.get(site.slug)!);
      return <section key={collection} id={collection === 'build' ? 'builds' : 'demos'} className="mt-10">
        <h2 className="text-2xl font-semibold tracking-tight">{COLLECTION_LABELS[collection]}</h2>
        {rows.length
          ? <div className="mt-5 grid gap-5 md:grid-cols-2">{rows.map(({ site, activity }) => <SiteCard key={site.slug} site={site} activity={activity} />)}</div>
          : <p className="muted mt-4 text-sm">No {COLLECTION_LABELS[collection].toLowerCase()} are registered yet.</p>}
      </section>;
    })}
    <p className="muted mt-6 text-xs">To add a client site, add one entry to <code>lib/client-sites.ts</code> and set <code>collection</code> to <code>build</code> or <code>demo</code>.</p>
  </main>;
}
