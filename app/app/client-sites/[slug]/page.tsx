import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, GitBranch, GitPullRequest } from 'lucide-react';
import { requireWorkspace } from '@/lib/workspace';
import { branchUrl, getClientSite, hasHostedPreview, openItems, repoHost, repoUrl } from '@/lib/client-sites';
import { getSiteActivity, getSiteStatus } from '@/lib/client-sites-server';
import { formatWhen, StageBadge } from '../ui';

export const dynamic = 'force-dynamic';

export default async function ClientSitePage({ params }: { params: Promise<{ slug: string }> }) {
  await requireWorkspace();
  const { slug } = await params;
  const site = getClientSite(slug);
  if (!site) notFound();
  const [activity, status] = await Promise.all([getSiteActivity(site), getSiteStatus(site)]);
  const byBranch = new Map(activity.branches.map((b) => [b.branch, b]));
  const open = status && 'sections' in status ? openItems(status.sections) : [];
  const primaryLabel = site.collection === 'demo' ? 'Open preview' : 'Open live site';
  const previewHeading = site.collection === 'demo' ? 'Preview' : 'Live site';
  const githubHosted = repoHost(site) === 'github';
  const hosted = hasHostedPreview(site);

  return <main className="max-w-6xl">
    <p className="kicker"><Link href="/app/client-sites" className="hover:underline">Client Builds &amp; Demos</Link> · {site.client}</p>
    <div className="mt-3 flex flex-wrap items-center gap-4">
      <h1 className="text-4xl font-semibold tracking-tight">{site.name}</h1>
      <StageBadge stage={site.stage} />
    </div>
    <p className="muted mt-3 max-w-3xl text-sm leading-6">{site.summary}</p>
    {site.saleNote && <p className="mt-3 text-sm text-emerald-100">{site.saleNote}</p>}
    <div className="mt-5 flex flex-wrap gap-3">
      {hosted && <a className="btn" href={site.liveUrl} target="_blank" rel="noopener noreferrer">{primaryLabel} <ExternalLink size={15} className="ml-2" /></a>}
      {site.pinnedUrl && <a className="btn" href={site.pinnedUrl} target="_blank" rel="noopener noreferrer">Pinned URL <ExternalLink size={15} className="ml-2" /></a>}
      <a className="btn" href={repoUrl(site)} target="_blank" rel="noopener noreferrer">Repository <ExternalLink size={15} className="ml-2" /></a>
    </div>

    {hosted ? (
      <section className="panel mt-7 overflow-hidden" aria-labelledby="preview-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div><p id="preview-heading" className="kicker">{previewHeading}</p><p className="muted mt-1 break-all text-xs">{site.liveUrl} · {site.hosting}</p></div>
          <a className="text-sm font-semibold text-cyan-200 underline" href={site.liveUrl} target="_blank" rel="noopener noreferrer">Open in new tab ↗</a>
        </div>
        <div className="relative aspect-[4/5] w-full border-t border-[#243b47] bg-black sm:aspect-video">
          <iframe
            src={site.liveUrl}
            title={`${site.name} ${site.collection === 'demo' ? 'preview' : 'live site'}`}
            className="absolute inset-0 h-full w-full"
            loading="lazy"
            referrerPolicy="no-referrer"
            allow="fullscreen; gyroscope; accelerometer; autoplay"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
        <p className="muted border-t border-[#243b47] px-5 py-3 text-xs">If the preview stays blank, the site may block embedding. Use “Open in new tab”.</p>
      </section>
    ) : (
      <section className="panel mt-7 p-6" aria-labelledby="preview-heading">
        <p id="preview-heading" className="kicker">{previewHeading}</p>
        <p className="mt-2 text-lg font-semibold">Not deployed yet</p>
        <p className="muted mt-2 max-w-2xl text-sm leading-6">This site has no hosted preview, so there is nothing to show here. {site.hosting}</p>
      </section>
    )}

    <section className="panel mt-6 p-6" aria-labelledby="branches-heading">
      <p id="branches-heading" className="kicker">Releases · previews · owners</p>
      {activity.error && <p className="mt-3 text-sm text-amber-200">{githubHosted ? 'GitHub data unavailable: ' : ''}{activity.error}</p>}
      <div className="mt-4 space-y-3">
        {site.branches.map((b) => {
          const a = byBranch.get(b.name);
          return <article key={b.name} className="rounded-2xl border border-[#243b47] bg-[#0d1922] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <a href={branchUrl(site, b.name)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-mono text-sm font-semibold text-[#d3e3e8] hover:underline"><GitBranch size={15} className="text-[#75d6e7]" />{b.name}</a>
              <span className="text-xs text-[#a8bfcb]">Owner: <strong className="text-white">{b.owner}</strong></span>
            </div>
            {b.previewUrl && <a href={b.previewUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block break-all text-xs text-cyan-200 underline">{b.previewUrl.replace(/^https:\/\//, '')} ↗</a>}
            {b.note && <p className="muted mt-1 text-xs">{b.note}</p>}
            <div className="mt-3 text-xs leading-5">
              {a?.commit
                ? <p><span className="muted">Last commit </span>{a.commit.sha ? <a className="font-mono text-cyan-200 underline" href={a.commit.url} target="_blank" rel="noopener noreferrer">{a.commit.sha.slice(0, 7)}</a> : <span className="muted">not recorded</span>} {a.commit.message && <span className="text-[#d3e3e8]">{a.commit.message}</span>} <span className="muted">{a.commit.date ? `· ${a.commit.author} · ${formatWhen(a.commit.date)}` : ''}</span></p>
                : <p className="text-amber-200">{a?.error ?? 'No commit data.'}</p>}
              {a && a.pulls.length > 0
                ? <ul className="mt-2 space-y-1">{a.pulls.map((p) => <li key={p.number} className="flex items-start gap-2"><GitPullRequest size={14} className="mt-0.5 shrink-0 text-violet-200" /><a className="text-violet-100 underline" href={p.url} target="_blank" rel="noopener noreferrer">#{p.number} {p.title}</a><span className="muted">{p.head} → {p.base}{p.draft ? ' · draft' : ''}</span></li>)}</ul>
                : githubHosted ? <p className="muted mt-1">No open pull requests.</p> : null}
            </div>
          </article>;
        })}
      </div>
    </section>

    {status && <section className="panel mt-6 p-6" aria-labelledby="status-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p id="status-heading" className="kicker">Status and open items</p>
        <a className="text-xs text-cyan-200 underline" href={status.sourceUrl} target="_blank" rel="noopener noreferrer">From {site.statusDoc} on {site.repo.defaultBranch} ↗</a>
      </div>
      {'error' in status ? <p className="mt-3 text-sm text-amber-200">{status.error}</p> : <>
        {status.title && <p className="mt-2 text-sm font-semibold">{status.title}</p>}
        <div className="mt-4 rounded-2xl border border-amber-700/50 bg-amber-950/20 p-4">
          <p className="text-sm font-semibold text-amber-100">Open items ({open.length})</p>
          {open.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">{open.map((o, i) => <li key={i}><strong>{o.item}</strong> <span className="muted">— {o.state}</span></li>)}</ul> : <p className="muted mt-2 text-sm">None flagged.</p>}
        </div>
        {status.sections.map((section, si) => <details key={si} className="mt-4" open={si === 0}>
          <summary className="cursor-pointer text-sm font-semibold">{section.heading}</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr>{section.columns.map((c) => <th key={c} className="border-b border-[#243b47] px-2 py-2">{c}</th>)}</tr></thead>
              <tbody>{section.rows.map((r, ri) => <tr key={ri} className={r.open ? 'text-amber-100' : ''}>{r.cells.map((c, ci) => <td key={ci} className="border-b border-[#1a2c37] px-2 py-2 align-top leading-5">{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </details>)}
      </>}
    </section>}
  </main>;
}
