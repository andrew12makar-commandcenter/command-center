import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
 reactStrictMode: true,
 // Bounded private Lighthouse JSON uploads (< 8 MB in server action).
 // Next defaults to 1 MB for all Server Actions; allow multipart overhead.
 experimental: { serverActions: { bodySizeLimit: '9mb' } },
};
export default nextConfig;
