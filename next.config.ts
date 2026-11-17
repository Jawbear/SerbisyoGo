import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: { unoptimized: true },
  poweredByHeader: false,
  serverExternalPackages: [],
  turbopack: {},
  webpack(webpackConfig, { dev }) {
    // Reusing the filesystem cache on this Windows toolchain can leave an
    // invalid WasmHash input. Production exports must compile fresh there.
    if (process.platform === 'win32' && !dev) webpackConfig.cache = false;
    return webpackConfig;
  },
  async headers() { return [{ source: '/:path*', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=()' }
  ] }]; }
};
export default config;
