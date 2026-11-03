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
};

export const CLIENT_SITES: ClientSite[] = [
  {
    slug: 'circle-tavern',
    name: 'Circle Tavern',
    client: 'Circle Tavern · Gyro Theory',
    summary: 'Night-panorama venue tour: Gyro Theory, the main bar and the speakeasy, with the Campus2Care × Circle event reveal.',
    stage: 'In build',
    liveUrl: 'https://venu-e60.pages.dev',
    hosting: 'Cloudflare Pages (Circle’s own account)',
    repo: { owner: 'andrew12makar-commandcenter', name: 'venu', defaultBranch: 'main' },
    branches: [
      { name: 'main', owner: 'Shared · reviewed', previewUrl: 'https://venu-e60.pages.dev', note: 'Changes land through reviewed PRs.' },
      { name: 'room/bar', owner: 'Andrew', previewUrl: 'https://room-bar.venu-e60.pages.dev' },
      { name: 'room/kitchen', owner: 'Andrew', previewUrl: 'https://room-kitchen.venu-e60.pages.dev' },
      { name: 'room/speakeasy', owner: 'Ryan', previewUrl: 'https://room-speakeasy.venu-e60.pages.dev' },
      { name: 'fx/transitions', owner: 'Ryan', previewUrl: 'https://fx-transitions.venu-e60.pages.dev' },
    ],
    statusDoc: 'docs/STATUS.md',
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
