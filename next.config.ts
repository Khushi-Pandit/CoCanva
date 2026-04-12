import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ── Turbopack config (Next.js 16 default bundler) ─────────────────────────
  // Empty object opts-in explicitly and silences the webpack-conflict warning.
  // socket.io-client works fine in Turbopack via transpilePackages below;
  // it auto-skips the Node.js-only paths (ws, bufferutil) in browser bundles.
  turbopack: {},

  // ── Transpile socket.io ESM packages ─────────────────────────────────────
  transpilePackages: [
    'socket.io-client',
    'engine.io-client',
    'engine.io-parser',
    '@socket.io/component-emitter',
    'socket.io-parser',
  ],

  // ── External image hosts ─────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: '**.githubusercontent.com' },
      { protocol: 'https', hostname: '**.s3.amazonaws.com' },
    ],
  },

  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;
