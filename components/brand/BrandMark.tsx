import { RevaGlyph } from "@/components/brand/RevaGlyph";

/**
 * Het beeldmerk linksboven in de navigatie (portal en patiënten-app):
 *   - praktijklogo → op een witte tegel, passend geschaald (nooit afgesneden);
 *   - praktijk zonder logo → beginletter op de huisstijlkleur;
 *   - geen praktijk → het REVA-logo.
 */
export function BrandMark({ logoUrl, initial }: { logoUrl?: string | null; initial?: string | null }) {
  if (logoUrl) {
    return (
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden bg-white p-0.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="" className="max-w-full max-h-full object-contain" />
      </div>
    );
  }
  return (
    <div
      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
      style={{ background: "var(--brand-accent, #e8632a)" }}
    >
      {initial ? (
        <span className="text-white font-bold text-xs leading-none">{initial.toUpperCase()}</span>
      ) : (
        <RevaGlyph className="h-3.5 text-white" />
      )}
    </div>
  );
}
