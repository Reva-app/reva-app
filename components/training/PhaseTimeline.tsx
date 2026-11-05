"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { loadMyProtocolTimeline, type PatientProtocolTimelinePhase } from "@/lib/services/patientProtocolService";
import { estimatePhaseTiming } from "@/lib/scheduleProgress";

/**
 * Fase-geankerde tijdlijn van het hele herstelplan (niet alleen de actieve
 * fase, zoals ProtocolTrainingView). Bewust NIET op kalenderweken geankerd —
 * een tijdlijn die zichzelf "niet statisch" noemt maar een vaste week-as
 * toont, is tegenstrijdig. De fase (met een echt datamodel: status, mijlpaal-
 * voortgang) is de hoofdas; week_range_label wordt alleen als kleine,
 * ondergeschikte context getoond, niet als primaire structuur.
 *
 * Elke fase krijgt een even brede kolom (grid), met de verbindingslijn van
 * bolletje naar bolletje, zodat de hele balk altijd in één oogopslag past,
 * ook bij protocollen met 6+ fases. Op telefoon passen zes fasenamen niet
 * naast elkaar: daar alleen de bolletjes, met eronder de huidige fase
 * (en de volgende) in leesbare tekst.
 */
export function PhaseTimeline({ patientId }: { patientId: string }) {
  const [phases, setPhases] = useState<PatientProtocolTimelinePhase[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMyProtocolTimeline(patientId).then((data) => {
      if (!cancelled) setPhases(data);
    });
    return () => { cancelled = true; };
  }, [patientId]);

  if (!phases || phases.length < 2) return null; // Bij 1 fase voegt een tijdlijn niets toe

  const activePhase = phases.find((p) => p.status === "active");
  const timing = activePhase ? estimatePhaseTiming(activePhase.weekRangeLabel, activePhase.startedAt, new Date()) : null;

  const currentIndex = activePhase ? phases.indexOf(activePhase) : phases.findIndex((p) => p.status !== "completed");
  const current = currentIndex >= 0 ? phases[currentIndex] : null;
  const next = currentIndex >= 0 ? phases[currentIndex + 1] ?? null : null;

  return (
    <Card>
      <CardHeader title="Jouw hersteltraject" subtitle={timing?.message ?? "De fases van je herstelplan"} />
      <ol className="grid" style={{ gridTemplateColumns: `repeat(${phases.length}, minmax(0, 1fr))` }}>
        {phases.map((phase, i) => {
          const isCompleted = phase.status === "completed";
          const isActive = phase.status === "active";
          const isLast = i === phases.length - 1;
          const dotColor = isCompleted ? "#16a34a" : isActive ? "var(--brand-accent, #e8632a)" : "#e8e5df";
          return (
            <li
              key={phase.id}
              className="relative flex flex-col items-center text-center px-1"
              aria-current={isActive ? "step" : undefined}
              aria-label={`${phase.name}${isCompleted ? ", afgerond" : isActive ? ", huidige fase" : ""}`}
            >
              {/* Verbindingslijn van het midden van dit bolletje naar het midden van het volgende */}
              {!isLast && (
                <div
                  aria-hidden
                  className="absolute top-[18px] left-1/2 w-full h-1 -translate-y-1/2 rounded-full"
                  style={{ background: isCompleted ? "#16a34a" : "#e8e5df" }}
                />
              )}
              <div
                aria-hidden
                className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                style={{
                  background: isCompleted || isActive ? dotColor : "#ffffff",
                  border: `2.5px solid ${dotColor}`,
                  color: isCompleted || isActive ? "#ffffff" : "#6b7280",
                  boxShadow: isActive ? `0 0 0 4px ${dotColor}22` : "none",
                }}
              >
                {isCompleted ? <Check size={15} /> : i + 1}
              </div>
              <div className="hidden sm:block mt-2 w-full">
                <p className="text-xs font-medium leading-tight line-clamp-2" style={{ color: isActive ? "#1a1a1a" : "#6b7280" }}>
                  {phase.name}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                  {[phase.weekRangeLabel, phase.milestonesTotal > 0 ? `${phase.milestonesCompleted}/${phase.milestonesTotal} mijlpalen` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Telefoon: de huidige fase uitgeschreven */}
      {current && (
        <div className="sm:hidden mt-4 rounded-xl px-4 py-3" style={{ background: "#f8f7f4" }}>
          <p className="text-xs text-gray-500">
            {activePhase ? "Huidige fase" : "Volgende stap"} · {currentIndex + 1} van {phases.length}
          </p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">{current.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {[current.weekRangeLabel, current.milestonesTotal > 0 ? `${current.milestonesCompleted}/${current.milestonesTotal} mijlpalen behaald` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {next && activePhase && (
            <p className="text-xs text-gray-500 mt-2">Daarna: {next.name}</p>
          )}
        </div>
      )}
    </Card>
  );
}
