import 'server-only';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GovernmentCandidate } from '@/lib/government-discovery';
import type { GovernmentLocationReview } from '@/lib/government-location-review';

export type GovernmentSnapshot = {
  kind: 'command-center-government-download/v1';
  created_at: string;
  origin: { label: string; lat: number; lon: number };
  coverage: string;
  counts: { source_rows: number; exact_duplicate_rows: number; mapped: number; needs_location_match: number };
  sources: { id: string; title: string; url: string; download_url: string; downloaded_at: string; source_rows: number; brighton_rows: number }[];
  candidates: GovernmentCandidate[];
};

type ReviewFile = { kind: 'command-center-government-reviews/v1'; updated_at: string; reviews: Record<string, GovernmentLocationReview> };
let writeQueue: Promise<void> = Promise.resolve();

export async function readGovernmentLocationReviews(): Promise<Record<string, GovernmentLocationReview>> {
  const path = join(process.cwd(), '.local-discovery', 'government', 'review-status.json');
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as ReviewFile;
    if (parsed.kind !== 'command-center-government-reviews/v1' || !parsed.reviews || typeof parsed.reviews !== 'object') return {};
    return parsed.reviews;
  } catch { return {}; }
}

/** Local-only review file, serialized and atomically replaced to avoid partial or lost updates. */
export async function saveGovernmentLocationReview(review: GovernmentLocationReview): Promise<void> {
  const task = writeQueue.then(async () => {
    const directory = join(process.cwd(), '.local-discovery', 'government');
    await mkdir(directory, { recursive: true });
    const reviews = await readGovernmentLocationReviews();
    reviews[review.key] = review;
    const file: ReviewFile = { kind: 'command-center-government-reviews/v1', updated_at: new Date().toISOString(), reviews };
    const temporary = join(directory, `.review-status-${process.pid}-${Date.now()}.tmp`);
    await writeFile(temporary, JSON.stringify(file, null, 2) + '\n', { mode: 0o600 });
    await rename(temporary, join(directory, 'review-status.json'));
  });
  writeQueue = task.catch(() => {});
  return task;
}

export async function readLatestGovernmentSnapshot(): Promise<GovernmentSnapshot | null> {
  const directory = join(process.cwd(), '.local-discovery', 'government');
  try {
    const files = (await readdir(directory)).filter((name) => /^brighton-.*\.json$/.test(name)).sort().reverse();
    if (!files.length) return null;
    const snapshot = JSON.parse(await readFile(join(directory, files[0]), 'utf8')) as GovernmentSnapshot;
    if (snapshot.kind !== 'command-center-government-download/v1' || !Array.isArray(snapshot.candidates)) return null;
    return snapshot;
  } catch {
    return null;
  }
}
