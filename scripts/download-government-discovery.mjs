import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { downloadBostonGovernmentSources } from '../lib/government-discovery.ts';
import { serializeGovernmentCandidatesCsv } from '../lib/government-discovery-export.ts';

const snapshot = await downloadBostonGovernmentSources();
const dir = resolve('.local-discovery/government');
await mkdir(dir, { recursive: true });
const stamp = snapshot.created_at.replace(/[:.]/g, '-');
const path = resolve(dir, `brighton-${stamp}.json`);
await writeFile(path, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });
const csvPath = resolve(dir, `brighton-${stamp}.csv`);
await writeFile(csvPath, serializeGovernmentCandidatesCsv(snapshot.candidates), { mode: 0o600 });
console.log(JSON.stringify({
  file: path,
  csvFile: csvPath,
  origin: snapshot.origin,
  coverage: snapshot.coverage,
  counts: snapshot.counts,
  sources: snapshot.sources.map(({ id, title, source_rows, brighton_rows, url }) => ({ id, title, source_rows, brighton_rows, url })),
  coordinateMatched: snapshot.candidates.filter((x) => x.coordinates).length,
  needsLocationMatch: snapshot.candidates.filter((x) => !x.coordinates).length,
  nearestTen: snapshot.candidates.filter((x) => x.distance_miles !== null).slice(0, 10).map(({ name, address, category, distance_miles, source_title }) => ({ name, address, category, distance_miles, source_title })),
}, null, 2));
