// Genereert alle logobestanden uit lib/brand.ts — draai na een logowijziging:
//
//   npm run brand:build
//
// Rendert de PNG's met de lokaal geïnstalleerde Google Chrome (headless), zo
// komen ze pixel-identiek uit dezelfde SVG. Ander pad? Zet CHROME_PATH.
// De gegenereerde bestanden worden gewoon meegecommit; Vercel draait dit niet.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const chrome = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const { revaIconSvg, REVA_ORANGE } = await import(join(root, "lib/brand.ts"));

// ── Varianten ────────────────────────────────────────────────────────────────
// Afgerond: favicon, mail, UI. Vierkant (radius 0): iOS en Android ronden
// zelf af. Maskable: extra marge, want Android knipt er een cirkel uit.
const rounded = revaIconSvg();
const roundedSmall = revaIconSvg({ glyphHeight: 0.58 }); // iets grotere R: leesbaar op 16–32 px
const square = revaIconSvg({ radius: 0 });
const maskable = revaIconSvg({ radius: 0, glyphHeight: 0.4 });
const glyphWhite = revaIconSvg({ background: null, glyphHeight: 0.8 });
const glyphOrange = revaIconSvg({ background: null, glyphHeight: 0.8, foreground: REVA_ORANGE });

const work = mkdtempSync(join(tmpdir(), "reva-brand-"));

function renderPng(svg, size, outPath) {
  const html = join(work, "render.html");
  writeFileSync(
    html,
    `<!doctype html><html><head><style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style></head><body>${svg}</body></html>`
  );
  mkdirSync(dirname(outPath), { recursive: true });
  execFileSync(chrome, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars",
    "--default-background-color=00000000", "--force-device-scale-factor=1",
    `--window-size=${size},${size}`, `--screenshot=${outPath}`, `file://${html}`,
  ], { stdio: "ignore", timeout: 30_000 });
  const png = readFileSync(outPath);
  const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
  if (w !== size || h !== size) throw new Error(`${outPath}: ${w}×${h}, verwacht ${size}×${size}`);
  return png;
}

/** .ico met PNG-inhoud (ondersteund door alle huidige browsers en Windows). */
function writeIco(pngs, outPath) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  writeFileSync(outPath, Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]));
}

const out = (p) => join(root, p);
const written = [];
const svgFile = (path, svg) => { writeFileSync(out(path), svg); written.push(path); };
const pngFile = (path, svg, size) => { renderPng(svg, size, out(path)); written.push(path); };

mkdirSync(out("public/brand"), { recursive: true });

// Vector — de masters
svgFile("public/brand/reva-icon.svg", rounded);
svgFile("public/brand/reva-icon-square.svg", square);
svgFile("public/brand/reva-glyph-white.svg", glyphWhite);
svgFile("public/brand/reva-glyph-orange.svg", glyphOrange);

// Browser: Next.js pikt app/icon.svg, app/apple-icon.png en app/favicon.ico zelf op
svgFile("app/icon.svg", rounded);
pngFile("app/apple-icon.png", square, 180);
const icoSizes = [16, 32, 48];
writeIco(
  icoSizes.map((size) => ({ size, data: renderPng(roundedSmall, size, join(work, `fav-${size}.png`)) })),
  out("app/favicon.ico")
);
written.push("app/favicon.ico");

// PWA (app/manifest.ts) en App Store / Play Store
pngFile("public/brand/reva-icon-192.png", rounded, 192);
pngFile("public/brand/reva-icon-512.png", rounded, 512);
pngFile("public/brand/reva-icon-maskable-512.png", maskable, 512);
pngFile("public/brand/reva-icon-1024.png", square, 1024);

// E-mail (lib/email/layout.ts) — getoond op 32 px, 3× voor scherpe schermen.
// Afgerond in de PNG zelf: Outlook negeert border-radius.
pngFile("public/email/reva-logo.png", rounded, 96);

rmSync(work, { recursive: true, force: true });
for (const p of written) console.log(`✓ ${p}`);
