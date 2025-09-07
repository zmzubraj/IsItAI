import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable built-in compression and serve modern image formats.
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Split worker code into its own bundle to keep the main thread lighter.
  webpack: (config) => {
    const splitChunks = config.optimization?.splitChunks || {};
    config.optimization = config.optimization || {};
    config.optimization.splitChunks = {
      ...splitChunks,
      cacheGroups: {
        ...(splitChunks.cacheGroups || {}),
        workers: {
          test: /[\\/]workers[\\/]/,
          chunks: 'all',
          enforce: true,
        },
      },
    };
    return config;
  },
};

export default nextConfig;
