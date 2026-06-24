import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4002/api').replace('/api', '');

const BACKEND_HOSTNAME = new URL(BACKEND).hostname;
const BACKEND_PORT = new URL(BACKEND).port || undefined;

const isDev = process.env.NODE_ENV !== 'production';

const r2Patterns: NonNullable<NextConfig['images']>['remotePatterns'] = [];
const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
if (r2PublicUrl) {
  const r2 = new URL(r2PublicUrl);
  r2Patterns.push({
    protocol: r2.protocol.replace(':', '') as 'http' | 'https',
    hostname: r2.hostname,
    pathname: '/**',
  });
}

const backendProtocol = new URL(BACKEND).protocol.replace(':', '') as 'http' | 'https';
const backendUploadPattern = {
  protocol: backendProtocol,
  hostname: BACKEND_HOSTNAME,
  ...(BACKEND_PORT ? { port: BACKEND_PORT } : {}),
  pathname: '/uploads/**' as const,
};

const nextConfig: NextConfig = {
  serverExternalPackages: ['esbuild-wasm', 'esbuild'],
  output: 'standalone',
  allowedDevOrigins: ['host.docker.internal'],
  images: {
    unoptimized: isDev,
    remotePatterns: [backendUploadPattern, ...r2Patterns],
  },
  async rewrites() {
    return [
      { source: '/uploads/:path*', destination: `${BACKEND}/uploads/:path*` },
    ];
  },
};

export default withSerwist(nextConfig);
