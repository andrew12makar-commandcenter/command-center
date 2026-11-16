// Client site registry for the Command Center Client Builds and Client Demos area.
// Each client site lives in its own repository and hosting account. The Command
// Center only links to, embeds and reads public metadata about it.
// To add the next client site, append one entry to CLIENT_SITES and set
// collection to 'build' (sold or live on a domain) or 'demo' (preview only).
// alsoIn lists a site in a second section too (Circle Tavern is a sold Client
// Build that is also shown in Client Demos as a finished example to pitch with).

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
  /** Extra sections the card also appears in, e.g. a sold live site shown in Client Demos as a pitch example. */
  alsoIn?: ClientSiteCollection[];
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
    alsoIn: ['demo'],
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
    summary: 'Pitch demo, preview only (r4): the Charcoal & Brass r3 site plus its own booking and online payment page. Customers pick a cut ($35 haircut or fade, $25 kids 15 and under, five other cuts in an "Other services" dropdown; prices set from the shop price list on Nov 16), a day and a 30-minute time from the shop hours (Sunday closed, Thu/Fri until 7 PM), enter name and phone, then pay. Payments run in demo mode ("Demo payment · Stripe connects at launch", no money moves) until the owner connects his own Stripe account and bank (docs/BOOKING-PAYMENTS.md). Double-booking protected; owner view at /admin behind an owner code. Call stays the main action. r3 is the same site without payments (fallback). Nov 16: real price list on the site, "Cash & card" instead of "Cash only", storefront hero photo. Owner still to confirm: phone (817) 966-9525 vs (617) 787-0200; Thu/Fri close 7 PM vs 6 PM; rating; whether combo services need more than 30 minutes. Not on a custom domain.',
    stage: 'In review',
    liveUrl: 'https://r4.universal-barber-preview.pages.dev',
    pinnedUrl: 'https://80efd175.universal-barber-preview.pages.dev',
    hosting: 'Cloudflare Pages project universal-barber-preview (Andrew personal account), noindex; bookings in D1 universal-barber-bookings-preview',
    repo: {
      host: 'gitlab',
      owner: 'andrew-makar-personal-projects-group',
      name: 'universal-barber-site',
      defaultBranch: 'r4',
    },
    branches: [
      {
        name: 'r4',
        owner: 'Andrew',
        previewUrl: 'https://r4.universal-barber-preview.pages.dev',
        note: 'Pitch version with booking + online payment, preview only; not on a domain. Pinned URL: https://80efd175.universal-barber-preview.pages.dev (built from 393c1f35). Book at /book/, owner view at /admin/. Payments: demo mode until STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set (docs/BOOKING-PAYMENTS.md). Nov 16: real prices ($35/$25 and the full list), cash and card, other cuts in a booking dropdown, storefront hero photo; checked live by hand. QA suites last passed on 302b15f1 (site 103/103, contrast pass, booking 50/50) and were updated for the new prices but not re-run.',
        commitSha: '393c1f3571c4419e359dfd6fbba7368be901adb2',
        commitMessage: 'r4: version tag on hero image URLs so cached copies of the old hero are not shown',
        commitDate: '2026-11-16T21:40:27Z',
        commitUrl: 'https://gitlab.com/andrew-makar-personal-projects-group/universal-barber-site/-/commit/393c1f3571c4419e359dfd6fbba7368be901adb2',
      },
      {
        name: 'r3',
        owner: 'Andrew',
        previewUrl: 'https://r3.universal-barber-preview.pages.dev',
        note: 'No-payment fallback (r4 adds booking + payments on top). Preview only; not on a domain. Palette: Charcoal & Brass (cream #F5F0E8, charcoal #26221F, brass #C29A5B). Pinned URL: https://e4dc0b41.universal-barber-preview.pages.dev. QA 103/103 + contrast 6/6. Same open owner items as r2.',
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
  {
    slug: 'oliveira-deli',
    name: 'Oliveira Deli Market',
    client: 'Oliveira Deli Market, 243 Faneuil St, Brighton (owner not yet named)',
    collection: 'demo',
    summary: 'Client Demo 05, pitch demo, preview only (r1, Nov 16). Brazilian deli and market site: real storefront photo (Harvard Crimson, Dec 2024, door number 243), DoorDash food photo as hero, Yelp hot-food and pastel photos kept at native 250 px. All photos are third-party, provisional and demo-only (docs/ASSET-SOURCES.md); the night storefront photo is held back because its window reads 279. Real published menu data: 26 DoorDash items and prices (delivery-listing prices, may differ in-store). Listed Restaurantji hours with a Boston-time OPEN/CLOSED status, menu filter and search, a pickup-list builder that copies the list and offers a call (no order is submitted, no SMS), keyboard lightbox, reduced-motion support, works without JavaScript, noindex. QA 72/72, axe clean, Lighthouse not run. Owner to confirm: hours, in-store prices, best sellers and specials, catering, phone orders, photo permission, owner story. Not on a custom domain.',
    stage: 'In review',
    liveUrl: 'https://r1.oliveira-deli-preview.pages.dev',
    pinnedUrl: 'https://7ad9a4d7.oliveira-deli-preview.pages.dev',
    hosting: 'Cloudflare Pages project oliveira-deli-preview (Andrew personal account), preview branch r1 only (no production deployment), noindex. Not behind Cloudflare Access yet: the link is unlisted but open.',
    repo: {
      host: 'gitlab',
      owner: 'andrew-makar-personal-projects-group',
      name: 'oliveira-deli-site',
      defaultBranch: 'r1',
    },
    branches: [
      {
        name: 'r1',
        owner: 'President Claude',
        previewUrl: 'https://r1.oliveira-deli-preview.pages.dev',
        note: 'First build (Claude Opus 5.5), Nov 16, 2026. Pushed to GitLab (private) and deployed as Cloudflare Pages preview 7ad9a4d7 (built from 463346f2); pinned URL https://7ad9a4d7.oliveira-deli-preview.pages.dev. QA 72/72 on 4b7f2bba (4 viewports, functional, hours boundaries, no-JS, reduced motion, axe); live smoke test on the preview passed on desktop and mobile. Not behind Access yet.',
        commitSha: '463346f28ef70cebc1185d44587f085bcf90a250',
        commitMessage: 'r1: QA results for 4b7f2bba (72 passed, 0 failed; axe clean; Lighthouse not run)',
        commitDate: '2026-11-16T23:38:20Z',
        commitUrl: 'https://gitlab.com/andrew-makar-personal-projects-group/oliveira-deli-site/-/commit/463346f28ef70cebc1185d44587f085bcf90a250',
      },
    ],
  },
];

export function getClientSite(slug: string): ClientSite | undefined {
  return CLIENT_SITES.find((site) => site.slug === slug);
}

/** Sites whose own collection matches, then sites listed there through alsoIn. */
export function sitesInCollection(collection: ClientSiteCollection): ClientSite[] {
  return [
    ...CLIENT_SITES.filter((site) => site.collection === collection),
    ...CLIENT_SITES.filter((site) => site.collection !== collection && (site.alsoIn ?? []).includes(collection)),
  ];
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
