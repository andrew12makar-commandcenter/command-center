// Serves static client demo sites that live in this repository (sites/<slug>/site/)
// from inside the Command Center, behind the same /app login as everything else.
// Used for demos that have no hosted preview yet, so they can still be opened and
// embedded. Only slugs listed here are served; paths can never leave the site folder.
import { extname, normalize, resolve, sep } from 'node:path';

/** slug -> folder (relative to the repo root) holding the built static site. */
export const INTERNAL_DEMO_SITES: Record<string, string> = {
  'cigars-and-more': 'sites/cigars-and-more/site',
};

export const INTERNAL_DEMO_BASE = '/app/demo-sites';

export const DEMO_CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

export type DemoFile = { file: string; contentType: string };

/**
 * Where a demo opens. The page is addressed as .../<slug>/index.html, not .../<slug>,
 * because Next.js drops trailing slashes: relative asset URLs and in-page #anchors
 * only resolve correctly when the page URL sits inside the slug folder.
 */
export function internalDemoUrl(slug: string): string {
  return `${INTERNAL_DEMO_BASE}/${slug}/index.html`;
}

/**
 * Resolve a request for /app/demo-sites/<slug>/<...segments> to a file on disk.
 * Returns null for unknown slugs, the bare slug (the route redirects that to
 * index.html), unsupported file types, hidden files or any path that would escape
 * the site folder.
 */
export function resolveDemoFile(slug: string, segments: string[] = [], repoRoot = process.cwd()): DemoFile | null {
  const dir = INTERNAL_DEMO_SITES[slug];
  if (!dir) return null;
  const parts = segments.filter((s) => s !== '');
  if (!parts.length) return null;
  if (parts.some((s) => s === '..' || s.startsWith('.') || s.includes('\\') || s.includes('\0'))) return null;
  const rel = parts.join('/');
  const root = resolve(repoRoot, dir);
  const file = resolve(root, normalize(rel));
  if (file !== root && !file.startsWith(root + sep)) return null;
  const contentType = DEMO_CONTENT_TYPES[extname(file).toLowerCase()];
  if (!contentType) return null;
  return { file, contentType };
}
