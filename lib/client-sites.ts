// Client site registry for the Command Center Client Builds and Client Demos area.
// Each client site lives in its own repository and hosting account. The Command
// Center only links to, embeds and reads public metadata about it.
// To add the next client site, append one entry to CLIENT_SITES and set
// collection to 'build' (sold or live on a domain) or 'demo' (preview only).

export type ClientSiteCollection = 'build' | 'demo';

export type ClientSiteBranch = {
  name: string;
  owner: string;
  /** Branch preview URL, if the host builds one. */
  previewUrl?: string;
  note?: string;
  /** Recorded commit when live activity cannot be read from GitHub. */
  commitSha?: string;
  commitMessage?: string;
  commitDate?: string;
  commitUrl?: string;
};

export type ClientSiteRepo = {
  host?: 'github' | 'gitlab';
  owner: string;
  name: string;
  defaultBranch: string;
};

export type ClientSite = {
  slug: string;
  name: string;
  client: string;
  summary: string;
  /** Sold/live work vs preview-only demos. */
  collection: ClientSiteCollection;
  /** Lifecycle label shown on the card. */
  stage: 'In build' | 'In review' | 'Live' | 'Paused';
  liveUrl: string;
  /** Immutable host URL for the same release, if one exists. */
  pinnedUrl?: string;
  hosting: string;
  saleNote?: string;
  repo: ClientSiteRepo;
  branches: ClientSiteBranch[];
  /** Repo path of a markdown status file with tables (Area | State | Evidence). */
  statusDoc?: string;
};

export const COLLECTION_LABELS: Record<ClientSiteCollection, string> = {
  build: 'Client Builds',
  demo: 'Client Demos',
};

export const CLIENT_SITES: ClientSite[] = [
  {
    slug: 'circle-tavern',
    name: 'Circle Tavern',
    client: 'George · Circle Tavern',
    collection: 'build',
    summary: 'Sold live venue site on www.thecircletavern.com. The Nov 14, 2026 production release replaces the Campus2Care event banner with a call-to-book banner at (617) 904-8482 and removes the food menu so only drinks remain.',
    stage: 'Live',
    liveUrl: 'https://www.thecircletavern.com/',
    pinnedUrl: 'https://2f6b8925.circle-tavern-official.pages.dev',
    hosting: 'Cloudflare Pages project circle-tavern-official (Andrew personal account)',
    saleNote: 'Sold to George for $1,000.',
    repo: {
      host: 'gitlab',
      owner: 'andrew-makar-personal-projects-group',
      name: 'circle-venu',
      defaultBranch: 'release/live-20261114',
    },
    branches: [
      {
        name: 'release/live-20261114',
        owner: 'Andrew',
        previewUrl: 'https://2f6b8925.circle-tavern-official.pages.dev',
        note: 'Canonical production deploy 8be1a3b0-28a8-491c-8ee5-9e8b1bce1f80, Saturday Nov 14, 2026, 5:08 PM ET. Source: circle-venu branch release/live-20261114 @ 9ec7cd87 (live-site/ folder). Changes: event-booking call banner (617) 904-8482 replaced the Campus2Care banner; food menu removed (drinks only). Previous production e47cf2ba is the rollback target. Cloudflare also serves this release at https://8be1a3b0.circle-tavern-official.pages.dev.',
        commitSha: '9ec7cd8795cc9bef5ab72054249979314679a380',
        commitMessage: 'live-site: drinks-only menu open, comment cleanup, deploy worker builder + release README',
        commitDate: '2026-11-14T22:07:56Z',
        commitUrl: 'https://gitlab.com/andrew-makar-personal-projects-group/circle-venu/-/commit/9ec7cd8795cc9bef5ab72054249979314679a380',
      },
    ],
  },
  {
    slug: 'johnnyds',
    name: "Johnny D's Fresh Fruit & Produce",
    client: "Johnny D's Fruit & Produce",
    collection: 'demo',
    summary: 'Preview-only fruit market site, revision r8: lower hero crop so the full storefront sign shows, with reduced motion zoom. Not on a custom domain.',
    stage: 'In review',
    liveUrl: 'https://r8.johnnyds-preview.pages.dev',
    pinnedUrl: 'https://f0ba5452.johnnyds-preview.pages.dev',
    hosting: 'Cloudflare Pages project johnnyds-preview (Andrew personal account)',
    repo: {
      host: 'gitlab',
      owner: 'andrew-makar-personal-projects-group',
      name: 'johnnyds-site',
      defaultBranch: 'r8',
    },
    branches: [
      {
        name: 'r8',
        owner: 'Andrew',
        previewUrl: 'https://r8.johnnyds-preview.pages.dev',
        note: 'Preview only; not on a domain. Pinned URL: https://f0ba5452.johnnyds-preview.pages.dev',
        commitSha: 'adc086f8887a9bf21ac1be0ed7db9cf2ed9da480',
        commitMessage: 'r8 (2/2): native-resolution hero crops from photo A (765×1020)',
        commitDate: '2026-11-14T20:03:26Z',
        commitUrl: 'https://gitlab.com/andrew-makar-personal-projects-group/johnnyds-site/-/commit/adc086f8887a9bf21ac1be0ed7db9cf2ed9da480',
      },
    ],
  },
  {
    slug: 'universal-barber',
    name: 'Universal Barber Shop',
    client: 'Rafy · Universal Barber Shop, 4 Chestnut Hill Ave, Brighton',
    collection: 'demo',
    summary: 'Pitch demo, preview only (r3): r2 polish pass re-themed in the Charcoal & Brass palette Andrew picked (60% cream, 30% warm charcoal, 10% brass on Call and prices), Call as the main action, Book online links to the shop\'s existing booking page, softened privacy blurs. Owner still to confirm: phone (817) 966-9525 vs (617) 787-0200; Thu/Fri close 7 PM (window sign) vs 6 PM (Google); prices $30/$20 vs $35/$25 on the draft site; which booking site he uses; rating (site says about 4.5 from about 98 reviews; draft says 4.6 from 112 Google reviews); kids\' age (under 15 vs 15 and under). Not on a custom domain.',
    stage: 'In review',
    liveUrl: 'https://r3.universal-barber-preview.pages.dev',
    pinnedUrl: 'https://e4dc0b41.universal-barber-preview.pages.dev',
    hosting: 'Cloudflare Pages project universal-barber-preview (Andrew personal account), noindex',
    repo: {
      host: 'gitlab',
      owner: 'andrew-makar-personal-projects-group',
      name: 'universal-barber-site',
      defaultBranch: 'r3',
    },
    branches: [
      {
        name: 'r3',
        owner: 'Andrew',
        previewUrl: 'https://r3.universal-barber-preview.pages.dev',
        note: 'Pitch version, preview only; not on a domain. Palette: Charcoal & Brass (cream #F5F0E8, charcoal #26221F, brass #C29A5B). Pinned URL: https://e4dc0b41.universal-barber-preview.pages.dev. QA 103/103 + contrast 6/6. Same open owner items as r2.',
        commitSha: '53e746a1ef9989c914dec3b59739a4242757981f',
        commitMessage: 'r3-a: palette study notes and theme generator',
        commitDate: '2026-11-15T17:25:02Z',
        commitUrl: 'https://gitlab.com/andrew-makar-personal-projects-group/universal-barber-site/-/commit/53e746a1ef9989c914dec3b59739a4242757981f',
      },
      {
        name: 'r2',
        owner: 'Andrew',
        previewUrl: 'https://r2.universal-barber-preview.pages.dev',
        note: 'Pitch demo, preview only; not on a domain. Pinned URL: https://be605b54.universal-barber-preview.pages.dev (built from f2848d68). QA 103/103 + contrast 6/6. Open owner items: phone (817) 966-9525 vs (617) 787-0200; Thu/Fri 7 PM close; prices $30/$20 vs $35/$25; booking site; rating; kids age.',
        commitSha: '3774ca5087fbe0dbb164727ae809eadf88a70128',
        commitMessage: 'r2: add deploy/make_pages_worker.py (how r2 was deployed)',
        commitDate: '2026-11-14T23:08:40Z',
        commitUrl: 'https://gitlab.com/andrew-makar-personal-projects-group/universal-barber-site/-/commit/3774ca5087fbe0dbb164727ae809eadf88a70128',
      },
      {
        name: 'r1',
        owner: 'President Claude',
        note: 'First build (Claude Opus 5.5), QA 95/95; never deployed. r2 branches from it.',
        commitSha: '9a1469ae66b2261f4e7f0ec98f954d88178cd5b5',
        commitMessage: 'r1: QA results and screenshots for the in-between width fix (95 passed, 0 failed)',
        commitDate: '2026-11-14T22:05:27Z',
        commitUrl: 'https://gitlab.com/andrew-makar-personal-projects-group/universal-barber-site/-/commit/9a1469ae66b2261f4e7f0ec98f954d88178cd5b5',
      },
    ],
  },
];

export function getClientSite(slug: string): ClientSite | undefined {
  return CLIENT_SITES.find((site) => site.slug === slug);
}

export function sitesInCollection(collection: ClientSiteCollection): ClientSite[] {
  return CLIENT_SITES.filter((site) => site.collection === collection);
}

export function repoHost(site: ClientSite): 'github' | 'gitlab' {
  return site.repo.host ?? 'github';
}

export function repoUrl(site: ClientSite): string {
  const host = repoHost(site) === 'gitlab' ? 'https://gitlab.com' : 'https://github.com';
  return `${host}/${site.repo.owner}/${site.repo.name}`;
}

export function branchUrl(site: ClientSite, branch: string): string {
  const encoded = branch.split('/').map(encodeURIComponent).join('/');
  if (repoHost(site) === 'gitlab') {
    return `${repoUrl(site)}/-/tree/${encoded}`;
  }
  return `${repoUrl(site)}/tree/${encoded}`;
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
      // Judge the state/result columns, not the item name (e.g. "shows the proposed layers").
      // A section heading like "(all PROPOSED, waiting for owner approval)" marks every row open.
      const open = isOpenState(cells.slice(1).join(' ')) || /needs confirmation/i.test(cells[0] ?? '') || isOpenState(current.heading);
      current.rows.push({ cells, open });
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
