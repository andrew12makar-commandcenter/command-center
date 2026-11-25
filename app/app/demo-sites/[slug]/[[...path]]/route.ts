import { readFile, stat } from 'node:fs/promises';
import { requireWorkspace } from '@/lib/workspace';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { INTERNAL_DEMO_SITES, internalDemoUrl, resolveDemoFile } from '@/lib/demo-site-files';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const notFound = () => new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

// Serves an in-repo client demo (see lib/demo-site-files.ts) behind the Command Center login.
export async function GET(request: Request, { params }: { params: Promise<{ slug: string; path?: string[] }> }) {
  // Same gate as every other /app page: no workspace connection, no demo (never served unauthenticated).
  if (!hasSupabaseConfig()) {
    return new Response('Demo previews need the Command Center workspace connection and sign-in. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  await requireWorkspace();
  const { slug, path = [] } = await params;
  if (!path.length && INTERNAL_DEMO_SITES[slug]) return Response.redirect(new URL(internalDemoUrl(slug), request.url), 307);
  const target = resolveDemoFile(slug, path);
  if (!target) return notFound();
  let size: number;
  try {
    const st = await stat(target.file);
    if (!st.isFile()) return notFound();
    size = st.size;
  } catch {
    return notFound();
  }
  const headers: Record<string, string> = {
    'Content-Type': target.contentType,
    'Cache-Control': 'private, no-cache',
    'X-Robots-Tag': 'noindex, nofollow',
    'X-Content-Type-Options': 'nosniff',
  };
  const body = await readFile(target.file);
  const range = request.headers.get('range');
  if (range && target.contentType.startsWith('video/')) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m && m[1] ? Number(m[1]) : 0;
    const end = m && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    return new Response(body.subarray(start, end + 1), {
      status: 206,
      headers: { ...headers, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) },
    });
  }
  return new Response(body, { headers: { ...headers, 'Accept-Ranges': 'bytes' } });
}
