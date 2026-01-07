/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ignore canvas module for pdfjs-dist on server (not available in serverless)
      config.resolve.alias.canvas = false;
    }
    return config;
  },
};

module.exports = nextConfig;
