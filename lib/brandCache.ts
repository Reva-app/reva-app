/**
 * Laatst bekende huisstijl van de praktijk op dit apparaat. Zo openen ook
 * de schermen vóór het inloggen (inloggen, wachtwoord vergeten, 2FA,
 * uitnodiging) in de stijl van de praktijk in plaats van in REVA-oranje.
 *
 * Bevat alleen publieke huisstijl (naam, kleur, logo-URL), geen
 * persoonsgegevens. Het logo komt via de publieke route /api/org-logo/[id],
 * die ook zonder sessie werkt.
 */
import { brandPalette } from "@/lib/brand";

export interface CachedBrand {
  name: string;
  color: string | null;
  logoUrl: string | null;
}

const KEY = "reva-brand";
/** Oudere sleutel met alleen de kleur (useEffectiveBrandColor). */
const COLOR_KEY = "reva-brand-color";

export function readBrandCache(): CachedBrand | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as CachedBrand;
    const color = localStorage.getItem(COLOR_KEY);
    return color ? { name: "", color, logoUrl: null } : null;
  } catch { return null; }
}

/** Publieke logo-URL op basis van het opslagpad ("<orgId>/logo.png"). */
export function publicLogoUrl(logoPath: string | null | undefined): string | null {
  if (!logoPath || !logoPath.endsWith(".png")) return null;
  const [orgId, file] = logoPath.split("/");
  return orgId && file ? `/api/org-logo/${orgId}?v=${encodeURIComponent(file)}` : null;
}

/** Bewaar de huisstijl van een praktijk; zonder eigen kleur of logo wissen (REVA-standaard). */
export function writeBrandCache(brand: { name: string; primaryColor: string | null; logoPath: string | null } | null) {
  if (typeof window === "undefined") return;
  try {
    if (!brand || (!brand.primaryColor && !brand.logoPath)) {
      localStorage.removeItem(KEY);
      localStorage.removeItem(COLOR_KEY);
      return;
    }
    const value: CachedBrand = { name: brand.name, color: brand.primaryColor, logoUrl: publicLogoUrl(brand.logoPath) };
    localStorage.setItem(KEY, JSON.stringify(value));
    if (brand.primaryColor) localStorage.setItem(COLOR_KEY, brand.primaryColor);
    else localStorage.removeItem(COLOR_KEY);
  } catch { /* geen opslag */ }
}

/** Zet de kleurfamilie op <html> (of haalt hem weg voor de REVA-standaard). */
export function applyBrandVars(color: string | null | undefined) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const palette = brandPalette(color);
  for (const [k, v] of Object.entries(palette)) {
    if (color) root.style.setProperty(k, v);
    else root.style.removeProperty(k);
  }
}
