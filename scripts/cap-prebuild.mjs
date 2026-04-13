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

import { existsSync, renameSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const SERVER_ROUTES = [
  "app/api/delete-account/route.ts",
  "app/api/feedback/route.ts",
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
    console.warn(`[cap-prebuild] Bestand niet gevonden (overgeslagen): ${rel}`);
  }
}

console.log("[cap-prebuild] Klaar — server routes tijdelijk verplaatst.");
