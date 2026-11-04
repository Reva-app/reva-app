import { REVA_GLYPH } from "@/lib/brand";

/**
 * De "R" uit het REVA-logo als inline SVG — scherp op elk formaat, neemt de
 * tekstkleur over (`text-white`). Geef alleen een hoogte mee; de breedte
 * volgt uit de verhouding. Gebruik binnen de oranje logotegel.
 */
export function RevaGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${REVA_GLYPH.width} ${REVA_GLYPH.height}`}
      className={`w-auto shrink-0 ${className}`}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={REVA_GLYPH.path} />
    </svg>
  );
}
