"use client";

import { useEffect, useState } from "react";
import { brandPalette } from "@/lib/brand";

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
 * praktijkkleur volgt. Bij het verlaten (bv. naar het beheerportaal) gaan
 * de standaardwaarden uit globals.css weer gelden.
 */
export function useBrandCssVars(color: string | null | undefined) {
  useEffect(() => {
    const root = document.documentElement;
    const palette = brandPalette(color);
    for (const [k, v] of Object.entries(palette)) root.style.setProperty(k, v);
    return () => { for (const k of Object.keys(palette)) root.style.removeProperty(k); };
  }, [color]);
}
