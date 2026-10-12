import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { hasSupabaseConfig } from './lib/supabase/config';

export async function proxy(request: NextRequest) {
  if (!hasSupabaseConfig()) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const adapter: CookieMethodsServer = {
    getAll() { return request.cookies.getAll(); },
    setAll(toSet) {
      toSet.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    },
  };
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: adapter }
  );
  await supabase.auth.getUser();
  return response;
}
export const config = { matcher: ['/app/:path*', '/login'] };
