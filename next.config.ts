import { buildCsp } from "./lib/csp";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// Capacitor vereist een statische export (output: 'export').
// Draai `npm run build:cap` om de Capacitor-bundel te bouwen.
const isCapacitor = process.env.NEXT_BUILD_TARGET === "capacitor";

// Foutmeldingen gaan direct naar Sentry (EU-regio), zie lib/sentry.ts.
// CSP: zie lib/csp.ts. Pagina's krijgen in proxy.ts een strengere variant met
// een nonce per verzoek; deze header zonder nonce is het vangnet voor wat
// niet door de proxy gaat (API-routes, statische bestanden). Bij static
// export (Capacitor) past Next.js de `headers()`-config niet toe.
const isDev = process.env.NODE_ENV === "development";
const cspHeader = buildCsp({ isDev });

const nextConfig: NextConfig = {
  // Gzip-compressie voor alle responses
  compress: true,

  // Verwijder de "X-Powered-By: Next.js" header
  poweredByHeader: false,

  // React Strict Mode voor betere ontwikkelbaarheid
  reactStrictMode: true,

  // headers() wordt genegeerd bij output: 'export', dus alleen toevoegen
  // voor de normale server-build (niet voor de Capacitor static export).
  // Naast de al aanwezige CSP: standaard hardening-headers die er nog
  // ontbraken (gevonden bij het veiligheidsonderzoek vóór de eerste
  // praktijk) — geen van deze verandert app-gedrag, puur browser-instructies.
  ...(!isCapacitor && {
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [
            { key: "Content-Security-Policy", value: cspHeader },
            // Dwingt de browser om altijd HTTPS te gebruiken voor dit domein,
            // ook bij een eerste bezoek via een http://-link.
            { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
            // Voorkomt dat de browser een bestand als ander MIME-type
            // interpreteert dan de server aangeeft (MIME-sniffing-aanvallen).
            { key: "X-Content-Type-Options", value: "nosniff" },
            // Stuurt geen volledige URL mee als Referer naar andere origins
            // (bv. geen patiënt-id's in de pad-structuur die zouden lekken).
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            // Schakelt browser-API's uit die deze app nooit gebruikt.
            { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ],
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

// Leesbare foutmeldingen in Sentry: uploadt de source maps naar Sentry en
// verwijdert ze daarna uit de build (ze worden dus niet publiek). Alleen actief
// als SENTRY_AUTH_TOKEN is ingesteld (Vercel → Environment Variables); zonder
// token blijft de build exact zoals hij was. Niet voor de Capacitor-export.
const sentryEnabled = !!process.env.SENTRY_AUTH_TOKEN && !isCapacitor;

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: "reva-app",
      project: "reva-dashboard",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      sourcemaps: { deleteSourcemapsAfterUpload: true },
      // Een mislukte upload mag een deploy nooit tegenhouden.
      errorHandler: (err: Error) => console.warn("[sentry] upload van source maps mislukt:", err.message),
    })
  : nextConfig;
