"use client";

import { useEffect, useSyncExternalStore } from "react";
import { BrandMark } from "@/components/brand/BrandMark";

/**
 * Verhouding breedte/hoogte per logo, onthouden op dit apparaat. Zo staat
 * het merkblok bij het openen meteen in de juiste vorm (breed logo of
 * beeldmerk met naam) en springt het niet om zodra de afbeelding geladen is.
 */
const ASPECT_KEY = "reva-logo-aspect";
const aspects = new Map<string, number>();
const listeners = new Set<() => void>();
let loaded = false;

/** Sleutel zonder querystring: ondertekende URL's wisselen per sessie, het pad niet. */
const aspectKey = (url: string) => url.split("?")[0];

function loadAspects() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(ASPECT_KEY);
    if (raw) for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, number>)) aspects.set(k, v);
  } catch { /* geen opslag */ }
}

function storeAspect(url: string, value: number) {
  const key = aspectKey(url);
  if (aspects.get(key) === value) return;
  aspects.set(key, value);
  try { localStorage.setItem(ASPECT_KEY, JSON.stringify(Object.fromEntries(aspects))); } catch { /* geen opslag */ }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** Verhouding breedte/hoogte van een afbeelding (null zolang onbekend). */
export function useImageAspect(url: string | null | undefined): number | null {
  const aspect = useSyncExternalStore(
    subscribe,
    () => { loadAspects(); return url ? aspects.get(aspectKey(url)) ?? null : null; },
    () => null,
  );
  useEffect(() => {
    if (!url) return;
    const img = new Image();
    img.onload = () => storeAspect(url, img.naturalWidth / Math.max(1, img.naturalHeight));
    img.src = url;
  }, [url]);
  return aspect;
}

/**
 * Merkblok linksboven: een breed logo (met de naam erin) staat groot en
 * leesbaar op een witte tegel, zonder de naam nog eens te herhalen; een
 * vierkant logo of beginletter krijgt de naam ernaast.
 */
export function BrandLockup({ logoUrl, initial, name, subtitle, tone = "dark" }: {
  logoUrl?: string | null;
  initial?: string | null;
  name: string;
  subtitle?: string;
  /** "dark" = op de donkere zijbalk, "light" = op een lichte kopregel. */
  tone?: "dark" | "light";
}) {
  const aspect = useImageAspect(logoUrl);
  const wide = !!logoUrl && aspect !== null && aspect >= 1.8;

  if (wide) {
    return (
      <div className="min-w-0">
        <div className={`rounded-xl bg-white px-2.5 py-1.5 inline-flex items-center ${tone === "light" ? "border" : ""}`} style={tone === "light" ? { borderColor: "#ece9e3" } : undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl!} alt={name} className="h-7 w-auto max-w-[150px] object-contain" />
        </div>
        {subtitle && tone === "dark" && <p className="text-[11px] mt-1.5 pl-0.5" style={{ color: "#52525e" }}>{subtitle}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <BrandMark logoUrl={logoUrl} initial={initial} />
      <div className="leading-none min-w-0">
        <p className={`font-semibold text-sm tracking-tight truncate ${tone === "dark" ? "text-white" : "text-gray-900"}`}>{name}</p>
        {subtitle && <p className="text-[11px] mt-0.5" style={{ color: tone === "dark" ? "#52525e" : "#6b7280" }}>{subtitle}</p>}
      </div>
    </div>
  );
}
