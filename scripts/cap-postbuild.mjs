/**
 * cap-postbuild.mjs
 *
 * Herstelt de server-only route handlers die cap-prebuild.mjs tijdelijk
 * heeft verplaatst. Wordt automatisch uitgevoerd na `npm run build:cap`.
 *
 * Gebruik: node scripts/cap-postbuild.mjs
 */

import { existsSync, renameSync, mkdirSync, readdirSync, rmSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const BACKUP_DIR = join(root, ".cap-routes-backup");

// Zet alles terug wat cap-prebuild opzij heeft gezet (de hele backupmap),
// zodat er nooit een route achterblijft.
function backedUp(dir = BACKUP_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    return e.isDirectory() ? backedUp(full) : [relative(BACKUP_DIR, full)];
  });
}

for (const rel of backedUp()) {
  const dest = join(root, rel);
  mkdirSync(dirname(dest), { recursive: true });
  renameSync(join(BACKUP_DIR, rel), dest);
  console.log(`[cap-postbuild] Hersteld: ${rel}`);
}
rmSync(BACKUP_DIR, { recursive: true, force: true });

console.log("[cap-postbuild] Klaar — server routes hersteld.");
