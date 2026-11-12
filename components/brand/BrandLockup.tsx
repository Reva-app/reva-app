"use client";

import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand/BrandMark";

/** Verhouding breedte/hoogte van een afbeelding (null zolang onbekend). */
export function useImageAspect(url: string | null | undefined): number | null {
  const [aspect, setAspect] = useState<{ url: string; value: number } | null>(null);
  useEffect(() => {
    if (!url) return;
    const img = new Image();
    img.onload = () => setAspect({ url, value: img.naturalWidth / Math.max(1, img.naturalHeight) });
    img.src = url;
  }, [url]);
  return url && aspect?.url === url ? aspect.value : null;
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
