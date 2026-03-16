import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@toa/shared', '@toa/ui'],
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
