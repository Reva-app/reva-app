/**
 * cap-postbuild.mjs
 *
 * Herstelt de server-only route handlers die cap-prebuild.mjs tijdelijk
 * heeft verplaatst. Wordt automatisch uitgevoerd na `npm run build:cap`.
 *
 * Gebruik: node scripts/cap-postbuild.mjs
 */

import { existsSync, renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const SERVER_ROUTES = [
  "app/api/delete-account/route.ts",
  "app/api/feedback/route.ts",
  "app/icon.tsx",
  "app/apple-icon.tsx",
];

const BACKUP_DIR = join(root, ".cap-routes-backup");

for (const rel of SERVER_ROUTES) {
  const src = join(BACKUP_DIR, rel);
  const dest = join(root, rel);

  if (existsSync(src)) {
    renameSync(src, dest);
    console.log(`[cap-postbuild] Hersteld: ${rel}`);
  } else {
    console.warn(`[cap-postbuild] Backup niet gevonden (overgeslagen): ${rel}`);
  }
}

console.log("[cap-postbuild] Klaar — server routes hersteld.");
