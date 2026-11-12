"use client";

import { useEffect, useState } from "react";
import { applyBrandVars, readBrandCache, writeBrandCache } from "@/lib/brandCache";

const CACHE_KEY = "reva-brand-color";

/**
 * De praktijkkleur die nu geldt: de geladen kleur, of — zolang die nog
 * onderweg is — de laatst bekende kleur op dit apparaat. Zo opent de app
 * meteen in de eigen kleur in plaats van eerst even REVA-oranje.
 */
export function useEffectiveBrandColor(color: string | null | undefined): string | null {
  // Lazy uitlezen: de layout zelf rendert pas na het inloggen (de gates tonen
  // eerst een laadscherm), dus dit verschilt niet van de server-render.
  const [cached] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try { return localStorage.getItem(CACHE_KEY); } catch { return null; }
  });
  useEffect(() => {
    if (!color) return;
    try { localStorage.setItem(CACHE_KEY, color); } catch { /* geen opslag */ }
  }, [color]);
  return color ?? cached;
}

/**
 * Zet de kleurfamilie van de praktijk op <html>, zodat ook alles wat via een
 * portal buiten de layout rendert (vensters, menu's, datumkiezers) de
 * praktijkkleur volgt. Bij het verlaten (bv. uitloggen naar het
 * inlogscherm) blijft de laatst bekende praktijkkleur staan.
 */
export function useBrandCssVars(color: string | null | undefined) {
  useEffect(() => {
    applyBrandVars(color);
    return () => applyBrandVars(readBrandCache()?.color);
  }, [color]);
}

/** Onthoud de volledige huisstijl (naam, kleur, logo) voor de schermen vóór het inloggen. */
export function useRememberBrand(branding: { name: string; primaryColor: string | null; logoPath: string | null } | null | undefined) {
  const name = branding?.name, color = branding?.primaryColor ?? null, logo = branding?.logoPath ?? null;
  useEffect(() => {
    if (name === undefined) return; // nog aan het laden
    writeBrandCache({ name, primaryColor: color, logoPath: logo });
  }, [name, color, logo]);
}
