"use client";

import { Card } from "@/components/ui/Card";
import type { CoachInsights, CoachMoodTag } from "@/lib/coach";

const MOOD_CONFIG: Record<CoachMoodTag, { label: string; color: string; bg: string; dot: string }> = {
  positief:    { label: "Positief",    color: "#16a34a", bg: "#f0fdf4", dot: "#22c55e" },
  stabiel:     { label: "Stabiel",     color: "#e8632a", bg: "#fff3ee", dot: "#e8632a" },
  voorzichtig: { label: "Voorzichtig", color: "#ca8a04", bg: "#fefce8", dot: "#eab308" },
};

interface CoachPanelProps {
  coachInsights: CoachInsights;
}

/**
 * Eén responsive coach-kaart — vervangt de vroegere aparte mobiele
 * (compacte) en desktop (uitgebreide) versie, die exact dezelfde data
 * toonden in twee losse JSX-blokken. Tailwind-responsive classes regelen
 * het compactere uiterlijk op klein scherm, zelfde aanpak als
 * OnboardingChecklist. Toont bewust geen losse "volgende stap"-actie meer:
 * die overlapte met zowel de Vandaag-sectie als de vroegere Focus-kaart.
 */
export function CoachPanel({ coachInsights }: CoachPanelProps) {
  const moodCfg = MOOD_CONFIG[coachInsights.moodTag];

  return (
    <Card padding="none">
      <div className="p-4 sm:p-5">
        {/* Header: mood tag + label */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: moodCfg.dot }} />
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-widest" style={{ color: moodCfg.color }}>
              {moodCfg.label}
            </span>
          </div>
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Jouw coach</span>
        </div>

        {/* Daily insight */}
        <p className="text-sm leading-relaxed text-gray-800 mb-2 sm:mb-3">
          {coachInsights.dailyInsight}
        </p>

        {/* Extra inzichten — streaks, correlaties, protocol-tips */}
        {coachInsights.insights.length > 0 && (
          <div className="space-y-1 mb-4 sm:mb-5">
            {coachInsights.insights.map((line, i) => (
              <p key={i} className="text-xs leading-relaxed text-gray-500 pl-3 relative">
                <span className="absolute left-0 top-1.5 w-1 h-1 rounded-full" style={{ background: "#c4bfb7" }} />
                {line}
              </p>
            ))}
          </div>
        )}

        {/* Weekly summary */}
        <div className="rounded-xl px-4 py-3 mb-4" style={{ background: moodCfg.bg, border: `1px solid ${moodCfg.color}22` }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: moodCfg.color }}>
            Samenvatting deze week
          </p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <p className="text-base font-bold leading-none text-gray-900">{coachInsights.weekly.trainingCount}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">trainingen</p>
            </div>
            <div>
              <p className="text-base font-bold leading-none text-gray-900">{coachInsights.weekly.medCount}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">medicatie</p>
            </div>
            <div>
              <p className="text-base font-bold leading-none text-gray-900">{coachInsights.weekly.completedMijl}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">mijlpalen</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{coachInsights.weekly.coachTekst}</p>
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] leading-relaxed" style={{ color: "#c4bfb7" }}>
          {coachInsights.disclaimerTekst}
        </p>
      </div>
    </Card>
  );
}
