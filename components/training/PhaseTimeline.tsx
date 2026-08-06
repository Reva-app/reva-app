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
 * De fases verdelen zich met flex-1 gelijk over de volle breedte (i.p.v.
 * vaste pixelbreedtes met horizontaal scrollen) zodat de hele balk altijd
 * in één oogopslag past, ook bij protocollen met 6+ fases.
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

  return (
    <Card>
      <CardHeader title="Jouw hersteltraject" subtitle={timing?.message ?? "De fases van je herstelplan"} />
      <div className="flex items-start">
        {phases.map((phase, i) => {
          const isCompleted = phase.status === "completed";
          const isActive = phase.status === "active";
          const isLast = i === phases.length - 1;
          const dotColor = isCompleted ? "#16a34a" : isActive ? "var(--brand-accent, #e8632a)" : "#e8e5df";
          return (
            <div key={phase.id} className={`flex items-start ${isLast ? "shrink-0" : "flex-1 min-w-0"}`}>
              <div className="flex flex-col items-center min-w-0" style={{ width: isLast ? "auto" : "100%" }}>
                <div className="flex items-center w-full">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                    style={{
                      background: isCompleted || isActive ? dotColor : "#ffffff",
                      border: `2.5px solid ${dotColor}`,
                      color: isCompleted || isActive ? "#ffffff" : "#9ca3af",
                      boxShadow: isActive ? `0 0 0 4px ${dotColor}22` : "none",
                    }}
                  >
                    {isCompleted ? <Check size={15} /> : i + 1}
                  </div>
                  {!isLast && <div className="flex-1 h-1 rounded-full" style={{ background: isCompleted ? "#16a34a" : "#e8e5df" }} />}
                </div>
                <div className="mt-2 pr-2 text-center w-full">
                  <p className="text-xs font-medium leading-tight line-clamp-2" style={{ color: isActive ? "#1a1a1a" : "#6b7280" }}>
                    {phase.name}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {[phase.weekRangeLabel, phase.milestonesTotal > 0 ? `${phase.milestonesCompleted}/${phase.milestonesTotal} mijlpalen` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
