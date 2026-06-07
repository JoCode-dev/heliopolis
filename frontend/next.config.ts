import type { NextConfig } from "next";

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace('/api', '');

const BACKEND_HOSTNAME = new URL(BACKEND).hostname;
const BACKEND_PORT = new URL(BACKEND).port || undefined;

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

const nextConfig: NextConfig = {
  allowedDevOrigins: ['host.docker.internal'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: BACKEND_HOSTNAME,
        port: BACKEND_PORT,
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: BACKEND_HOSTNAME,
        pathname: '/uploads/**',
      },
      ...r2Patterns,
    ],
  },
  async rewrites() {
    return [
      { source: '/uploads/:path*', destination: `${BACKEND}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
