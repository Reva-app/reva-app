import type { NextConfig } from "next";

// Capacitor vereist een statische export (output: 'export').
// Draai `npm run build:cap` om de Capacitor-bundel te bouwen.
const isCapacitor = process.env.NEXT_BUILD_TARGET === "capacitor";

// Supabase-project host, nodig voor connect-src/img-src in de CSP hieronder
// (signed storage-URLs en de auth/REST-calls van de browser-client gaan hierheen).
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();

// Basis-CSP zonder nonces (geen dynamic rendering vereist). 'unsafe-inline' voor
// script/style blijft nodig zolang er geen nonce-infrastructuur is opgezet, maar
// object-src/frame-ancestors/base-uri zijn wel hard dichtgezet.
// Alleen relevant voor de server-build — bij static export (Capacitor) past
// Next.js de `headers()`-config niet toe.
//
// 'unsafe-eval' alleen in development: React's dev-mode gebruikt eval() voor
// het reconstrueren van call stacks bij hot-reload/debugging (nooit in een
// production build). Zonder dit blokkeert de CSP dat en toont Next.js een
// permanente "1 Issue"-melding in de dev-overlay — puur een lokaal
// ontwikkelgemak, geen verzwakking van de production-CSP.
const isDev = process.env.NODE_ENV === "development";
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://*.googleusercontent.com${supabaseOrigin ? ` ${supabaseOrigin}` : ""};
  font-src 'self';
  connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""};
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
`.replace(/\s{2,}/g, " ").trim();

const nextConfig: NextConfig = {
  // Gzip-compressie voor alle responses
  compress: true,

  // Verwijder de "X-Powered-By: Next.js" header
  poweredByHeader: false,

  // React Strict Mode voor betere ontwikkelbaarheid
  reactStrictMode: true,

  // headers() wordt genegeerd bij output: 'export', dus alleen toevoegen
  // voor de normale server-build (niet voor de Capacitor static export).
  ...(!isCapacitor && {
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [{ key: "Content-Security-Policy", value: cspHeader }],
        },
      ];
    },
  }),

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
