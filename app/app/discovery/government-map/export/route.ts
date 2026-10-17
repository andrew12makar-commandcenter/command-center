import { requireWorkspace } from '@/lib/workspace';
import { serializeGovernmentCandidatesCsv } from '@/lib/government-discovery-export';
import { readLatestGovernmentSnapshot } from '../records';

export async function GET() {
  await requireWorkspace();
  const snapshot = await readLatestGovernmentSnapshot();
  if (!snapshot) return new Response('Local government snapshot not found.', { status: 404 });
  return new Response(serializeGovernmentCandidatesCsv(snapshot.candidates), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="brighton-government-records-zip-02135.csv"',
      'Cache-Control': 'private, no-store',
    },
  });
}
