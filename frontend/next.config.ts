import type { NextConfig } from "next";

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace('/api', '');

const BACKEND_HOSTNAME = new URL(BACKEND).hostname;
const BACKEND_PORT = new URL(BACKEND).port || undefined;

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
    ],
  },
  async rewrites() {
    return [
      { source: '/uploads/:path*', destination: `${BACKEND}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
