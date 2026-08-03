"use client";

import { useEffect, useState } from "react";
import { Dumbbell } from "lucide-react";
import { resolveSignedUrl } from "@/lib/services/storageService";

/**
 * Consistente vierkante thumbnail voor een oefening — lost zelf een signed
 * URL op uit de private `protocol-media`-bucket (geen publieke URL's, zelfde
 * patroon als dossierfoto's). Valt terug op het Dumbbell-icoon zolang er
 * geen media_path is, of terwijl de URL nog wordt opgehaald.
 */
export function ExerciseThumb({
  mediaPath, mediaType, size = 36,
}: {
  mediaPath: string | null;
  mediaType?: string | null;
  size?: number;
}) {
  const [url, setUrl] = useState<string | null>(null);

  // Elke aanroepplek rendert dit component binnen een op oefening-id
  // ge-key-te ouder (rij/label/div), dus bij een andere oefening wordt dit
  // component altijd opnieuw gemount i.p.v. hergebruikt met een nieuwe
  // mediaPath-prop — een handmatige reset naar null is dan niet nodig.
  useEffect(() => {
    if (!mediaPath) return;
    let cancelled = false;
    resolveSignedUrl("protocol-media", mediaPath).then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });
    return () => { cancelled = true; };
  }, [mediaPath]);

  return (
    <div
      className="rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
      style={{ width: size, height: size, background: "#f8f7f4" }}
    >
      {url ? (
        mediaType === "video" ? (
          <video src={url} muted playsInline className="w-full h-full object-contain" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="w-full h-full object-contain" />
        )
      ) : (
        <Dumbbell size={Math.round(size * 0.4)} className="text-gray-400" />
      )}
    </div>
  );
}
