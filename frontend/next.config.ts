import type { NextConfig } from "next";

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace('/api', '');

const BACKEND_HOSTNAME = new URL(BACKEND).hostname;
const BACKEND_PORT = new URL(BACKEND).port || undefined;

// En développement, Next.js 15+ bloque les images dont l'URL résout vers une IP
// privée (127.0.0.1, ::1). On désactive l'optimisation d'images en dev — elle
// n'est utile qu'en production où le backend a un vrai hostname public.
const isDev = process.env.NODE_ENV !== 'production';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['host.docker.internal'],
  images: {
    unoptimized: isDev,
    remotePatterns: isDev ? [] : [
      {
        protocol: 'https',
        hostname: BACKEND_HOSTNAME,
        port: BACKEND_PORT,
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
