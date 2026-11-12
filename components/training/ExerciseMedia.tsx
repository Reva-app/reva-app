"use client";

import { useEffect, useState } from "react";
import { Dumbbell, Timer } from "lucide-react";
import { resolveSignedUrl } from "@/lib/services/storageService";

/**
 * Groot beeldvlak van een oefening in de trainingsmodus. Met foto of video
 * (video speelt stil in een lus af); zonder beeld een rustige tegel met het
 * oefeningnummer, zodat altijd duidelijk is wélke oefening je doet.
 */
export function ExerciseMedia({ mediaPath, mediaType, number, timed }: {
  mediaPath: string | null;
  mediaType?: string | null;
  number: number;
  timed: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!mediaPath) return;
    let cancelled = false;
    resolveSignedUrl("protocol-media", mediaPath).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [mediaPath]);

  if (mediaPath && url) {
    return (
      <div className="rounded-3xl overflow-hidden bg-white border aspect-[16/10] flex items-center justify-center" style={{ borderColor: "#e8e5df" }}>
        {mediaType === "video" ? (
          <video src={url} autoPlay loop muted playsInline controls={false} className="w-full h-full object-contain" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="w-full h-full object-contain" />
        )}
      </div>
    );
  }

  const Icon = timed ? Timer : Dumbbell;
  return (
    <div
      className="rounded-3xl aspect-[16/7] sm:aspect-[16/6] relative overflow-hidden flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, var(--brand-accent-soft, #fff3ee) 0%, var(--brand-accent-border, #fde3d4) 55%, var(--brand-accent-border, #f9d2bd) 100%)" }}
      aria-hidden
    >
      <span className="absolute -right-4 -bottom-10 text-[180px] font-bold leading-none tabular-nums select-none" style={{ color: "rgba(var(--brand-accent-rgb, 232, 99, 42),0.12)" }}>
        {number}
      </span>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/80 shadow-sm">
        <Icon size={30} style={{ color: "var(--brand-accent, #e8632a)" }} />
      </div>
    </div>
  );
}
