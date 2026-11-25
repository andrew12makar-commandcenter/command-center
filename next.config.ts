import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
 reactStrictMode: true,
 // Bounded private Lighthouse JSON uploads (< 8 MB in server action).
 // Next defaults to 1 MB for all Server Actions; allow multipart overhead.
 experimental: { serverActions: { bodySizeLimit: '9mb' } },
 // In-repo client demos served at /app/demo-sites/<slug> (lib/demo-site-files.ts) must ship with the build.
 outputFileTracingIncludes: { '/app/demo-sites/[slug]/[[...path]]': ['./sites/*/site/**/*'] },
};
export default nextConfig;
