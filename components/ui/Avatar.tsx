"use client";

import { useState } from "react";

interface AvatarProps {
  fullName: string | null;
  email?: string | null;
  avatarUrl: string | null;
  /** Diameter in px. Standaard 36 (w-9/h-9). */
  size?: number;
  className?: string;
}

function initials(name: string | null, email?: string | null) {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/**
 * Toont een profielfoto, met een terugval op initialen — niet alleen als er
 * geen avatarUrl is, maar ook als de afbeelding niet laadt (bv. een
 * verlopen/geroteerde Google-profielfoto-URL), via onError. Zonder die
 * terugval bleef eerder een kapot-afbeelding-icoon staan in plaats van de
 * initialen-cirkel.
 */
export function Avatar({ fullName, email, avatarUrl, size = 36, className = "" }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = !!avatarUrl && !failed;

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold text-white shrink-0 overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.32),
        background: showImage ? "transparent" : "var(--brand-accent, #e8632a)",
      }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl as string}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(fullName, email)
      )}
    </div>
  );
}
