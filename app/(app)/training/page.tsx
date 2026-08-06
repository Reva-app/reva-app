"use client";

import { useState, useEffect } from "react";
import { useAppData } from "@/lib/store";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { usePatientProtocol } from "@/lib/hooks/usePatientProtocol";
import { ProtocolTrainingView } from "@/components/training/ProtocolTrainingView";
import { PhaseTimeline } from "@/components/training/PhaseTimeline";
import { TrainingWeekOverview, type WeekDayEntry } from "@/components/training/TrainingWeekOverview";
import { TrainingSchemasSection } from "@/components/training/TrainingSchemasSection";
import { loadSessionLogsInRange } from "@/lib/services/patientProtocolService";
import { ClipboardList, Home } from "lucide-react";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Get the Monday of the current week
function getWeekDays(): { date: string; label: string }[] {
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  const labels = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
  return labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { date: dateStr, label };
  });
}

type MainTab = "behandelplan" | "thuis";

/**
 * Grote, primaire tabwissel tussen het fysio-behandelplan en het eigen
 * thuis schema — bewust prominenter dan de kleinere pill-tabs binnen
 * TrainingSchemasSection, zodat het meteen duidelijk is dat dit twee
 * verschillende, gelijkwaardige contexten zijn (niet een sub-filter).
 * "Mijn behandelplan" staat links en is de standaardkeuze: dat is het
 * officiële, met de fysio afgestemde schema — de thuisoefeningen zijn een
 * bewust ondergeschikte aanvulling, nooit de eerste blik bij binnenkomst.
 */
function MainTabs({ active, onChange, thuisCount }: {
  active: MainTab;
  onChange: (t: MainTab) => void;
  thuisCount: number;
}) {
  return (
    <div className="flex rounded-2xl overflow-hidden border" style={{ borderColor: "#e8e5df", background: "#ffffff" }}>
      {([
        { id: "behandelplan" as MainTab, label: "Mijn behandelplan", sublabel: "Van je fysio", icon: ClipboardList },
        { id: "thuis" as MainTab, label: "Thuis schema", sublabel: "Jouw eigen oefeningen", icon: Home },
      ] as const).map(({ id, label, sublabel, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex-1 flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
            style={{ background: isActive ? "#fff8f5" : "#ffffff", borderBottom: isActive ? "2px solid #e8632a" : "2px solid transparent" }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: isActive ? "#fff3ee" : "#f8f7f4" }}>
              <Icon size={16} style={{ color: isActive ? "#e8632a" : "#9ca3af" }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight" style={{ color: isActive ? "#1a1a1a" : "#6b7280" }}>
                {label}
                {id === "thuis" && thuisCount > 0 && (
                  <span className="ml-1.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "#fff3ee", color: "#e8632a" }}>
                    {thuisCount}
                  </span>
                )}
              </p>
              <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{sublabel}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function TrainingPage() {
  const { hydrated } = useAppData();
  const { checked: protocolChecked, hasActiveProtocol, protocol, patientId, refresh: refreshProtocol } = usePatientProtocol();
  const { trainingSchemas } = useAppData();
  const [mainTab, setMainTab] = useState<MainTab>("behandelplan");
  const [protocolSessionLogs, setProtocolSessionLogs] = useState<{ id: string; date: string; scheduleId: string }[]>([]);

  const weekDays = getWeekDays();
  const today = todayStr();

  useEffect(() => {
    if (!hasActiveProtocol || !patientId) return;
    let cancelled = false;
    loadSessionLogsInRange(patientId, weekDays[0].date, weekDays[6].date).then((logs) => {
      if (!cancelled) setProtocolSessionLogs(logs);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveProtocol, patientId, protocol]);

  if (!hydrated || !protocolChecked) return <PageSkeleton />;

  if (hasActiveProtocol && protocol && patientId) {
    const scheduleTitleById = new Map(protocol.currentPhase?.schedules.map((s) => [s.id, s.title]) ?? []);
    const protocolWeekDays: WeekDayEntry[] = weekDays.map(({ date, label }) => ({
      date, label,
      items: protocolSessionLogs
        .filter((log) => log.date === date)
        .map((log) => ({ id: log.id, label: scheduleTitleById.get(log.scheduleId) ?? "Sessie", completed: true })),
    }));
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 overflow-x-hidden">
        <MainTabs active={mainTab} onChange={setMainTab} thuisCount={trainingSchemas.length} />

        {mainTab === "behandelplan" ? (
          <div className="space-y-6">
            <TrainingWeekOverview days={protocolWeekDays} today={today} />
            <PhaseTimeline patientId={patientId} />
            <ProtocolTrainingView protocol={protocol} patientId={patientId} onLogged={refreshProtocol} />
          </div>
        ) : (
          <TrainingSchemasSection variant="supplementary" />
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 overflow-x-hidden">
      <TrainingSchemasSection variant="primary" />
    </div>
  );
}
