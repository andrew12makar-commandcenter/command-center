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
    summary: 'Three-scene immersive website: actual Circle entrance, main bar and speakeasy. Shared delivery tracks 3D scene fidelity, cinematic motion, approved events and owner review. Gyro Theory has its own website and is out of scope.',
    stage: 'In build',
    liveUrl: 'https://venu-e60.pages.dev',
    hosting: 'Cloudflare Pages (Andrew personal Cloudflare account; Circle site remains isolated from Command Center)',
    repo: { owner: 'andrew12makar-commandcenter', name: 'venu', defaultBranch: 'main' },
    branches: [
      { name: 'main', owner: 'Reviewed production', previewUrl: 'https://venu-e60.pages.dev', note: 'Production remains unchanged; review PRs before any merge.' },
      { name: 'feature/circle-hd-3d-foundation-v1', owner: 'Andrew + Ryan · HD collaboration', previewUrl: 'https://f3fcd0ce.venu-e60.pages.dev/immersive/', note: 'S01 PlayCanvas background code; Cloudflare build succeeded but model files are absent, so page shows an explicitly labeled photographic fallback. DO NOT treat this as an approved HD 3D render. Source-of-truth: docs/ANIMATION_STATE.md and docs/START_HERE_CIRCLE_HD.md. Draft PR #3.' },
      { name: 'feature/venue-flow', owner: 'Shared · original venue baseline', previewUrl: 'https://feature-venue-flow.venu-e60.pages.dev/?review', note: 'Preserved baseline before HD 3D upgrade; historical Gyro elements not part of the new scope.' },
      { name: 'room/bar', owner: 'Legacy room branch', note: 'Historical room branch; prefer current S01 development branch.' },
      { name: 'room/speakeasy', owner: 'Legacy room branch', note: 'Historical room branch; preserve for comparison, not new work.' },
    ],
    statusDoc: 'docs/STATUS.md',
    checkpoint: {
      branch: 'feature/circle-hd-3d-foundation-v1',
      path: 'docs/START_HERE_CIRCLE_HD.md',
      note: 'Current S01 3D checkpoint. The main-branch STATUS.md is historical; use this feature-branch handoff for current implementation and blocker status.',
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
