/**
 * REVA-merk — de enige bron voor het logo.
 *
 * Het beeldmerk is de witte "R" op een oranje, afgeronde tegel. Het pad
 * hieronder komt uit het originele logobestand, verschoven naar 0,0 en
 * afgerond op twee decimalen (vorm ongewijzigd).
 *
 * Alle logobestanden (favicon, app-iconen, PWA, mail-logo, App Store) worden
 * hieruit gegenereerd met `npm run brand:build` — zie scripts/brand-build.mjs.
 * In de UI: components/brand/RevaGlyph.tsx.
 *
 * Bewust ZONDER imports, zodat het build-script dit bestand direct kan laden.
 */

export const REVA_ORANGE = "#e8632a";

export const REVA_GLYPH = {
  width: 625.47,
  height: 801.59,
  path:
    "M 0 801.59 L 0 0 L 335.33 0 C 393.27 0 443.32 9.79 485.47 29.36 C 527.63 48.93 560.37 76.78 583.7 112.91 " +
    "C 607.04 149.03 618.7 191.56 618.7 240.48 C 618.7 277.36 610.8 310.1 594.98 338.7 C 579.18 367.31 557.92 390.27 531.2 407.58 " +
    "C 504.48 424.89 474.94 435.43 442.58 439.19 L 436.94 427.89 C 488.86 427.89 528.94 439.56 557.16 462.89 " +
    "C 585.38 486.23 601.38 521.98 605.16 570.16 L 625.47 801.59 L 476.45 801.59 L 459.52 591.59 " +
    "C 457.25 559.99 447.09 536.66 429.03 521.61 C 410.97 506.55 380.86 499.02 338.7 499.02 L 146.78 499.02 L 146.78 801.59 Z " +
    "M 146.78 370.31 L 326.28 370.31 C 370.7 370.31 405.32 359.78 430.16 338.7 C 454.99 317.63 467.41 287.9 467.41 249.52 " +
    "C 467.41 210.38 454.8 180.28 429.58 159.2 C 404.37 138.12 367.68 127.58 319.52 127.58 L 146.78 127.58 Z",
} as const;

// ─── Huisstijlkleur van een praktijk ────────────────────────────────────────
// Eén regel voor app, portal en e-mail: de accentkleur draagt witte tekst
// (knoppen, tegels) én wordt als tekstkleur op wit gebruikt (links, iconen).
// Contrast is symmetrisch, dus één ondergrens dekt beide. 3:1 is de WCAG-norm
// voor knoppen, iconen en vette/grote tekst; REVA-oranje (3,4:1) voldoet en
// blijft ongewijzigd. Te lichte praktijkkleuren (geel, pastel) worden
// stapsgewijs donkerder gemaakt tot ze leesbaar zijn, met behoud van de tint.

export const MIN_ACCENT_CONTRAST = 3;

export function isHexColor(value: string | null | undefined): value is string {
  return !!value && /^#[0-9a-fA-F]{6}$/.test(value);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrastverhouding (1–21) tussen twee hexkleuren. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * De accentkleur zoals REVA hem toont: de opgegeven kleur als die leesbaar
 * is met witte tekst, anders een donkerdere tint. Ongeldig of leeg → REVA-oranje.
 */
export function accessibleAccent(color: string | null | undefined): string {
  let c = isHexColor(color) ? color.toLowerCase() : REVA_ORANGE;
  for (let i = 0; i < 30 && contrastRatio("#ffffff", c) < MIN_ACCENT_CONTRAST; i++) {
    c = "#" + [1, 3, 5]
      .map((j) => Math.round(parseInt(c.slice(j, j + 2), 16) * 0.92).toString(16).padStart(2, "0"))
      .join("");
  }
  return c;
}

export interface RevaIconOptions {
  /** Hoekafronding als fractie van de breedte; 0 = vierkant (iOS/Android ronden zelf af). */
  radius?: number;
  /** Hoogte van de R als fractie van het icoon. */
  glyphHeight?: number;
  background?: string | null;
  foreground?: string;
}

/** SVG van het beeldmerk in een 512×512-vlak; schaalt verliesvrij. */
export function revaIconSvg({
  radius = 0.22,
  glyphHeight = 0.52,
  background = REVA_ORANGE,
  foreground = "#ffffff",
}: RevaIconOptions = {}): string {
  const size = 512;
  const scale = (size * glyphHeight) / REVA_GLYPH.height;
  const x = (size - REVA_GLYPH.width * scale) / 2;
  const y = (size - REVA_GLYPH.height * scale) / 2;
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const bg = background
    ? `<rect width="${size}" height="${size}" rx="${round(size * radius)}" fill="${background}"/>`
    : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    `<title>REVA</title>${bg}` +
    `<path transform="translate(${round(x)} ${round(y)}) scale(${round(scale)})" fill="${foreground}" d="${REVA_GLYPH.path}"/>` +
    `</svg>\n`
  );
}
