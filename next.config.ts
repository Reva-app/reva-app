import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gzip-compressie voor alle responses
  compress: true,

  // Verwijder de "X-Powered-By: Next.js" header
  poweredByHeader: false,

  // React Strict Mode voor betere ontwikkelbaarheid
  reactStrictMode: true,
};

export default nextConfig;
