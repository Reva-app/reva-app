"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { RevaScoreResult, RevaScoreTier } from "@/lib/revaScore";

const TIER_CONFIG: Record<RevaScoreTier, { color: string; bg: string; dot: string }> = {
  op_schema:      { color: "#16a34a", bg: "#f0fdf4", dot: "#22c55e" },
  aandacht:       { color: "#ca8a04", bg: "#fefce8", dot: "#eab308" },
  extra_aandacht: { color: "#b91c1c", bg: "#fef2f2", dot: "#ef4444" },
  onbekend:       { color: "#6b7280", bg: "#f9fafb", dot: "#d1d5db" },
};

/**
 * Compact rondje voor in de hero: kleur volgt de tier (rood/oranje/groen),
 * getal is de 1-10 REVA Score zelf. Toont een streepje zolang er nog geen
 * score berekend kan worden (te weinig check-ins), nooit een misleidend getal.
 */
export function RevaScoreCircle({ result }: { result: RevaScoreResult }) {
  const cfg = TIER_CONFIG[result.tier];
  return (
    <div className="flex flex-col items-center shrink-0">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: cfg.bg, border: `2.5px solid ${cfg.color}` }}
      >
        <span className="text-xl font-bold leading-none" style={{ color: cfg.color }}>
          {result.score !== null ? result.score.toFixed(1) : "–"}
        </span>
      </div>
      <span className="text-[9px] font-semibold text-gray-400 mt-1.5 uppercase tracking-widest">REVA Score</span>
    </div>
  );
}

interface RevaScoreCardProps {
  result: RevaScoreResult;
}

/**
 * Uitgebreide REVA Score-kaart met de factorenlijst (elk 0-100%, gemiddeld
 * tot de score). Bewust breder dan alleen check-ins: training, medicatie
 * bijhouden, afspraken-terugkoppeling en doelstellingen tellen mee, maar
 * alleen als ze voor deze patiënt van toepassing zijn.
 */
export function RevaScoreCard({ result }: RevaScoreCardProps) {
  const cfg = TIER_CONFIG[result.tier];
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Card padding="none">
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-widest" style={{ color: cfg.color }}>
              {result.label}
            </span>
            {result.score !== null && (
              <span className="text-xs font-bold" style={{ color: cfg.color }}>{result.score.toFixed(1)}/10</span>
            )}
          </div>
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">REVA Score</span>
        </div>

        <p className="text-sm leading-relaxed text-gray-800 mb-3">{result.explanation}</p>

        {result.factors.length > 0 && (
          <>
            <button
              onClick={() => setShowDetails((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium mb-3"
              style={{ color: cfg.color }}
            >
              {showDetails ? "Verberg details" : "Bekijk details"}
              {showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showDetails && (
              <div className="rounded-xl px-4 py-3 mb-3 space-y-3" style={{ background: cfg.bg, border: `1px solid ${cfg.color}22` }}>
                {result.factors.map((f) => (
                  <div key={f.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{f.label}</span>
                      <span className="text-[11px] text-gray-500">{f.detail}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#ffffff" }}>
                      <div className="h-full rounded-full" style={{ width: `${f.ratio * 100}%`, background: cfg.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <p className="text-[10px] leading-relaxed" style={{ color: "#c4bfb7" }}>
          Gebaseerd op je eigen check-ins, training, medicatie, afspraken en doelstellingen. Geen medisch oordeel, neem bij twijfel contact op met je behandelaar.
        </p>
      </div>
    </Card>
  );
}
