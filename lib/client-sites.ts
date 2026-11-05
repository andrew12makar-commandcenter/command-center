// Client site registry for the Command Center "Client Sites" area.
// Each client site lives in its own repository and hosting account. The Command
// Center only links to, embeds and reads public metadata about it.
// To add the next client site, append one entry to CLIENT_SITES.

export type ClientSiteBranch = {
  name: string;
  owner: string;
  /** Branch preview URL, if the host builds one. */
  previewUrl?: string;
  note?: string;
};

export type ClientSite = {
  slug: string;
  name: string;
  client: string;
  summary: string;
  /** Lifecycle label shown on the card. */
  stage: 'In build' | 'In review' | 'Live' | 'Paused';
  liveUrl: string;
  hosting: string;
  repo: { owner: string; name: string; defaultBranch: string };
  branches: ClientSiteBranch[];
  /** Repo path of a markdown status file with tables (Area | State | Evidence). */
  statusDoc?: string;
  /** Optional authoritative WIP checkpoint on a feature branch. */
  checkpoint?: { branch: string; path: string; note: string };
};

export const CLIENT_SITES: ClientSite[] = [
  {
    slug: 'circle-tavern',
    name: 'Circle Tavern',
    client: 'Circle Tavern · Andrew + Ryan',
    summary: 'Approved Circle HD immersive venue film: storefront, main bar, real staircase, speakeasy, party scene and fundraiser event poster. The accepted design is frozen at commit 1264f55; this entry tracks that deployment without copying or changing website code.',
    stage: 'In review',
    // Exact successful deployment URL is immutable. Keep old Pages production/main untouched.
    liveUrl: 'https://61c7713a.venu-e60.pages.dev/immersive/',
    hosting: 'Cloudflare Pages · venu · Andrew personal account (website independent of Command Center)',
    repo: { owner: 'andrew12makar-commandcenter', name: 'venu', defaultBranch: 'main' },
    branches: [
      {
        name: 'feature/circle-hd-3d-motion-v2',
        owner: 'Andrew · approved final',
        previewUrl: 'https://feature-circle-hd-3d-motion.venu-e60.pages.dev/immersive/',
        note: 'APPROVED, DO NOT MODIFY. Exact commit 1264f55b365a73d62a56c2749eef4abea9311c58, Cloudflare deployment 61c7713a-0873-49d9-81d9-456180916c18. Full source in public venu repository; immutable build is the live preview above. Commercial soundtrack needs licensing before further public launch.',
      },
      {
        name: 'main',
        owner: 'Historical production',
        previewUrl: 'https://venu-e60.pages.dev',
        note: 'Older site, NOT the approved finished design. Do not promote or overwrite without owner approval.',
      },
      {
        name: 'feature/circle-hd-3d-foundation-v1',
        owner: 'Andrew + Ryan · previous HD foundation',
        previewUrl: 'https://f3fcd0ce.venu-e60.pages.dev/immersive/',
        note: 'Earlier 3D foundation and photographic fallback. Historical only; do not confuse with accepted 1264f55 film.',
      },
      { name: 'feature/venue-flow', owner: 'Shared · original baseline', previewUrl: 'https://feature-venue-flow.venu-e60.pages.dev/?review', note: 'Historical baseline, not the approved final film.' },
      { name: 'room/bar', owner: 'Legacy room branch', note: 'Historical branch preserved for reference.' },
      { name: 'room/speakeasy', owner: 'Legacy room branch', note: 'Historical branch preserved for reference.' },
    ],
    // No statusDoc: main/docs/STATUS.md describes an older website and is misleading here.
    checkpoint: {
      branch: 'feature/circle-hd-3d-motion-v2',
      path: 'docs/ANIMATION_STATE.md',
      note: 'APPROVED RELEASE 1264f55 (5 Nov 2026). Git bundle and separate original-media ZIP were backed up on the owner Mac; the original-media ZIP still needs a verified off-machine copy. Cloudflare immutable deployment: 61c7713a-0873-49d9-81d9-456180916c18. Never modify approved site files, replace assets, or promote Pages production without approval.',
    },
  },
];

export function getClientSite(slug: string): ClientSite | undefined {
  return CLIENT_SITES.find((site) => site.slug === slug);
}

export function repoUrl(site: ClientSite): string {
  return `https://github.com/${site.repo.owner}/${site.repo.name}`;
}

export function branchUrl(site: ClientSite, branch: string): string {
  return `${repoUrl(site)}/tree/${branch.split('/').map(encodeURIComponent).join('/')}`;
}

// ---------- STATUS.md parsing ----------

export type StatusRow = { cells: string[]; open: boolean };
export type StatusSection = { heading: string; columns: string[]; rows: StatusRow[] };

const OPEN_PATTERN = /\b(not done|placeholder|demo mode|inert|proposed|partial|blocked|waiting|needs confirmation|not tested|not opened|(?:isn't|not) verified|none exist)\b/i;

/** True when a status cell describes something that is not finished. */
export function isOpenState(state: string): boolean {
  return OPEN_PATTERN.test(state);
}

function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

/** Strip the light markdown used in status tables so it renders as plain text. */
export function plainMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

/** Parse every markdown table in a status document, grouped under its nearest heading. */
export function parseStatusMarkdown(markdown: string): { title: string; sections: StatusSection[] } {
  const lines = markdown.split(/\r?\n/);
  let title = '';
  let heading = '';
  const sections: StatusSection[] = [];
  let current: StatusSection | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      if (!title && h[1].length === 1) title = plainMarkdown(h[2]);
      else heading = plainMarkdown(h[2]);
      current = null;
      continue;
    }
    if (!line.trim().startsWith('|')) { current = null; continue; }
    const next = lines[i + 1] ?? '';
    if (!current && /^\s*\|?\s*:?-{3,}/.test(next)) {
      current = { heading: heading || title, columns: splitRow(line).map(plainMarkdown), rows: [] };
      sections.push(current);
      i++; // skip the separator row
      continue;
    }
    if (current) {
      const cells = splitRow(line).map(plainMarkdown);
      current.rows.push({ cells, open: isOpenState(cells.join(' ')) });
    }
  }
  return { title, sections };
}

/** Rows still open across all sections, with the section heading for context. */
export function openItems(sections: StatusSection[]): { heading: string; item: string; state: string }[] {
  return sections.flatMap((section) => section.rows.filter((row) => row.open).map((row) => ({
    heading: section.heading,
    item: row.cells[0] ?? '',
    state: row.cells.slice(1).filter(Boolean).join(' · '),
  })));
}
