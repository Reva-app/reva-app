"use client";

import { useState, useEffect } from "react";
import { useAppData } from "@/lib/store";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { usePatientProtocol } from "@/lib/hooks/usePatientProtocol";
import { ProtocolTrainingView } from "@/components/training/ProtocolTrainingView";
import { type WeekDayEntry } from "@/components/training/TrainingWeekOverview";
import { TrainingSchemasSection } from "@/components/training/TrainingSchemasSection";
import { loadSessionLogsInRange } from "@/lib/services/patientProtocolService";
import { Tabs } from "@/components/ui/Tabs";

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

export default function TrainingPage() {
  const { hydrated } = useAppData();
  const { checked: protocolChecked, hasActiveProtocol, protocol, patientId, refresh: refreshProtocol } = usePatientProtocol();
  const { trainingSchemas, dagboekWorkouts } = useAppData();
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
        .map((log) => ({ id: log.id, label: scheduleTitleById.get(log.scheduleId) ?? "Sessie", completed: true }))
        .concat(dagboekWorkouts.filter((w) => w.date === date && w.completed).map((w) => ({ id: w.id, label: w.title, completed: true }))),
    }));
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 overflow-x-hidden">
        <Tabs
          options={[
            { value: "behandelplan", label: "Mijn herstelplan" },
            { value: "thuis", label: `Eigen oefeningen${trainingSchemas.some((s) => s.status === "actief") ? ` (${trainingSchemas.filter((s) => s.status === "actief").length})` : ""}` },
          ]}
          value={mainTab}
          onChange={setMainTab}
        />

        {mainTab === "behandelplan" ? (
          <ProtocolTrainingView
            protocol={protocol}
            patientId={patientId}
            onLogged={refreshProtocol}
            weekDays={protocolWeekDays}
            today={today}
            onCreateOwnSchema={() => setMainTab("thuis")}
          />
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
