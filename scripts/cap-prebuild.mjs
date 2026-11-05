/**
 * cap-prebuild.mjs
 *
 * Verplaatst server-only Next.js route handlers tijdelijk opzij zodat
 * `next build` met `output: 'export'` slaagt. Deze routes vereisen een
 * serveromgeving (cookies, service-role key) en zijn niet bruikbaar in
 * de statische Capacitor-bundel.
 *
 * De routes blijven beschikbaar op de Vercel web-deployment via
 * NEXT_PUBLIC_SITE_URL.
 *
 * Gebruik: node scripts/cap-prebuild.mjs
 * Herstel: node scripts/cap-postbuild.mjs
 */

import { existsSync, renameSync, mkdirSync, readdirSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Alle API-routes (app/api/**/route.ts) — automatisch, zodat een nieuwe
// route de Capacitor-build niet ongemerkt breekt.
function apiRoutes(dir = join(root, "app/api")) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return apiRoutes(full);
    return e.name === "route.ts" ? [relative(root, full)] : [];
  });
}

const SERVER_ROUTES = [
  ...apiRoutes(),
  // ImageResponse-routes werken niet met output: 'export'
  // App-iconen worden ingesteld via de native Xcode/Android Studio projecten
  "app/icon.tsx",
  "app/apple-icon.tsx",
];

const BACKUP_DIR = join(root, ".cap-routes-backup");

for (const rel of SERVER_ROUTES) {
  const src = join(root, rel);
  const dest = join(BACKUP_DIR, rel);

  if (existsSync(src)) {
    mkdirSync(dirname(dest), { recursive: true });
    renameSync(src, dest);
    console.log(`[cap-prebuild] Opzijgezet: ${rel}`);
  } else {
    // icon.tsx/apple-icon.tsx bestaan niet meer (statische iconen); prima.
  }
}

console.log("[cap-prebuild] Klaar — server routes tijdelijk verplaatst.");
