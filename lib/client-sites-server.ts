import 'server-only';
import { parseStatusMarkdown, type ClientSite, type StatusSection } from '@/lib/client-sites';

// Read-only GitHub lookups for client site repositories. Server-side only.
// Uses GITHUB_READONLY_TOKEN when set (fine-grained, read-only); otherwise the
// unauthenticated public API, which works for public repos (60 requests/hour per IP).
// Responses are cached for 5 minutes to stay well under that limit.

const REVALIDATE_SECONDS = 300;

export type BranchCommit = { sha: string; message: string; author: string; date: string; url: string };
export type OpenPull = { number: number; title: string; url: string; author: string; head: string; base: string; draft: boolean; updatedAt: string };
export type BranchActivity = { branch: string; commit: BranchCommit | null; pulls: OpenPull[]; error?: string };
export type SiteActivity = { branches: BranchActivity[]; lastUpdated: string | null; error?: string };

function headers(): HeadersInit {
  const h: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'command-center-client-sites' };
  const token = process.env.GITHUB_READONLY_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function github<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, { headers: headers(), next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) {
    const limited = res.status === 403 || res.status === 429;
    throw new Error(limited ? 'GitHub rate limit reached; try again shortly.' : `GitHub returned ${res.status}.`);
  }
  return res.json() as Promise<T>;
}

type GhCommit = { sha: string; html_url: string; commit: { message: string; author: { name: string; date: string } | null; committer: { date: string } | null }; author: { login: string } | null };
type GhPull = { number: number; title: string; html_url: string; draft: boolean; updated_at: string; user: { login: string } | null; head: { ref: string }; base: { ref: string } };

export async function getSiteActivity(site: ClientSite): Promise<SiteActivity> {
  const { owner, name } = site.repo;
  let pulls: GhPull[] = [];
  let pullError: string | undefined;
  try {
    pulls = await github<GhPull[]>(`/repos/${owner}/${name}/pulls?state=open&per_page=100`);
  } catch (e) {
    pullError = e instanceof Error ? e.message : 'Could not load pull requests.';
  }
  const branches = await Promise.all(site.branches.map(async (b): Promise<BranchActivity> => {
    const related = pulls.filter((p) => p.head.ref === b.name || p.base.ref === b.name).map((p) => ({
      number: p.number, title: p.title, url: p.html_url, author: p.user?.login ?? 'unknown',
      head: p.head.ref, base: p.base.ref, draft: p.draft, updatedAt: p.updated_at,
    }));
    try {
      const c = await github<GhCommit>(`/repos/${owner}/${name}/commits/${encodeURIComponent(b.name)}`);
      return {
        branch: b.name, pulls: related, error: pullError,
        commit: {
          sha: c.sha, url: c.html_url,
          message: c.commit.message.split('\n')[0],
          author: c.author?.login ?? c.commit.author?.name ?? 'unknown',
          date: c.commit.committer?.date ?? c.commit.author?.date ?? '',
        },
      };
    } catch (e) {
      return { branch: b.name, commit: null, pulls: related, error: e instanceof Error ? e.message : 'Could not load branch.' };
    }
  }));
  const dates = branches.map((b) => b.commit?.date).filter((d): d is string => Boolean(d)).sort();
  const failed = branches.every((b) => !b.commit);
  return { branches, lastUpdated: dates.at(-1) ?? null, error: failed ? branches[0]?.error : undefined };
}

export async function getSiteStatus(site: ClientSite): Promise<{ title: string; sections: StatusSection[]; sourceUrl: string } | { error: string; sourceUrl: string } | null> {
  if (!site.statusDoc) return null;
  const { owner, name, defaultBranch } = site.repo;
  const sourceUrl = `https://github.com/${owner}/${name}/blob/${defaultBranch}/${site.statusDoc}`;
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${owner}/${name}/${defaultBranch}/${site.statusDoc}`, {
      headers: process.env.GITHUB_READONLY_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_READONLY_TOKEN}` } : undefined,
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return { error: `Status file returned ${res.status}.`, sourceUrl };
    return { ...parseStatusMarkdown(await res.text()), sourceUrl };
  } catch {
    return { error: 'Could not load the status file.', sourceUrl };
  }
}
