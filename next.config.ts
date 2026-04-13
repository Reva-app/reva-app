import type { NextConfig } from "next";

// Capacitor vereist een statische export (output: 'export').
// Draai `npm run build:cap` om de Capacitor-bundel te bouwen.
const isCapacitor = process.env.NEXT_BUILD_TARGET === "capacitor";

const nextConfig: NextConfig = {
  // Gzip-compressie voor alle responses
  compress: true,

  // Verwijder de "X-Powered-By: Next.js" header
  poweredByHeader: false,

  // React Strict Mode voor betere ontwikkelbaarheid
  reactStrictMode: true,

  // Capacitor-specifieke instellingen
  ...(isCapacitor && {
    // Statische export: genereert de `out/` folder die Capacitor inleest
    output: "export",

    // Trailing slash zodat bestandspaden werken op het lokale bestandssysteem
    // (bijv. /check-in/ → out/check-in/index.html)
    trailingSlash: true,

    // Next.js Image Optimization werkt niet zonder server; zet het uit
    images: {
      unoptimized: true,
    },
  }),
};

export default nextConfig;
