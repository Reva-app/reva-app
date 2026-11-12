"use client";

import { useState } from "react";
import { Check, Info, Ban, Flag, Target, Plus, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useAppData } from "@/lib/store";
import { WorkoutPlayer } from "@/components/training/WorkoutPlayer";
import { TrainingScheduleCard } from "@/components/training/TrainingScheduleCard";
import { OwnSchemaTrainer } from "@/components/training/OwnSchemaTrainer";
import { PhaseTimeline } from "@/components/training/PhaseTimeline";
import { TrainingWeekOverview, type WeekDayEntry } from "@/components/training/TrainingWeekOverview";
import {
  logProtocolSession,
  type PatientActiveProtocol, type PatientProtocolScheduleView,
} from "@/lib/services/patientProtocolService";

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * Het herstelplan van de patiënt als één overzicht:
 *   1. waar sta je (plan, huidige fase, alle fases als stappen);
 *   2. trainen (week + schema's van de fysio + eigen thuisschema's);
 *   3. deze fase (wanneer door, mijlpalen, wat te vermijden, uitleg).
 * Schema's van de fysio zijn alleen-lezen; eigen schema's bouw je onder
 * "Eigen oefeningen" en train je hier met dezelfde trainingsmodus.
 */
export function ProtocolTrainingView({
  protocol, patientId, onLogged, weekDays, today, onCreateOwnSchema,
}: {
  protocol: PatientActiveProtocol;
  patientId: string;
  onLogged: () => void;
  weekDays: WeekDayEntry[];
  today: string;
  onCreateOwnSchema: () => void;
}) {
  const { showToast, toastNode } = useToast();
  const { trainingSchemas } = useAppData();
  const [activeSchedule, setActiveSchedule] = useState<PatientProtocolScheduleView | null>(null);
  const [openEdu, setOpenEdu] = useState<string | null>(null);

  const phase = protocol.currentPhase;
  const ownActive = trainingSchemas.filter((s) => s.status === "actief");
  const criteriaMet = phase ? phase.criteria.filter((c) => c.met).length : 0;

  return (
    <div className="space-y-8">
      {/* 1. Waar sta je */}
      <div className="rounded-3xl p-5 sm:p-7 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1c1c1e 0%, #2d2a27 100%)" }}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--brand-accent-on-dark, #f6b08c)" }}>Jouw herstelplan · {protocol.name}</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-2">{phase?.name ?? "Volgende fase wordt klaargezet"}</h1>
        {phase?.description && <p className="text-sm sm:text-base text-white/75 mt-2 max-w-2xl leading-relaxed">{phase.description}</p>}
        {phase && (
          <div className="flex flex-wrap gap-2 mt-4">
            {phase.weekRangeLabel && <span className="rounded-full px-3 py-1 text-xs font-medium bg-white/10">{phase.weekRangeLabel}</span>}
            {phase.criteria.length > 0 && (
              <span className="rounded-full px-3 py-1 text-xs font-medium bg-white/10">{criteriaMet} van {phase.criteria.length} doelen voor de volgende fase behaald</span>
            )}
          </div>
        )}
      </div>

      <PhaseTimeline patientId={patientId} />

      {/* 2. Trainen */}
      <section>
        <SectionTitle
          title="Trainen"
          subtitle="Kies een schema en start. Je fysio ziet je trainingen terug."
          action={
            <button type="button" onClick={onCreateOwnSchema} className="inline-flex items-center gap-1 text-sm font-medium shrink-0" style={{ color: "var(--brand-accent, #e8632a)" }}>
              <Plus size={14} /> Eigen schema
            </button>
          }
        />
        <div className="space-y-4">
          <TrainingWeekOverview days={weekDays} today={today} />
          {!phase || (phase.schedules.length === 0 && ownActive.length === 0) ? (
            <Card><p className="text-sm text-subtle">Je fysiotherapeut zet je oefeningen voor deze fase nog klaar.</p></Card>
          ) : null}
          {phase?.schedules.map((schedule) => (
            <TrainingScheduleCard
              key={schedule.id}
              title={schedule.title}
              source="fysio"
              exercises={schedule.exercises}
              frequencyPerWeek={schedule.frequencyPerWeek}
              doneThisWeek={schedule.completedThisWeek}
              onStart={() => setActiveSchedule(schedule)}
            />
          ))}
          {ownActive.map((s) => (
            <OwnSchemaTrainer key={s.id} schema={s} onSaved={() => showToast("Training opgeslagen")} />
          ))}
        </div>
      </section>

      {/* 3. Deze fase */}
      {phase && (phase.criteria.length > 0 || phase.milestones.length > 0 || phase.forbiddenActivities.length > 0) && (
        <section>
          <SectionTitle title="Deze fase" subtitle="Waar je naartoe werkt en waar je op let" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {phase.criteria.length > 0 && (
              <div className="rounded-3xl bg-white border p-5" style={{ borderColor: "#e8e5df" }}>
                <div className="flex items-center gap-2 mb-1"><Target size={16} style={{ color: "var(--brand-accent, #e8632a)" }} /><p className="font-semibold text-gray-900">Door naar de volgende fase</p></div>
                <p className="text-xs text-gray-500 mb-3">Je fysio vinkt deze af zodra je ze haalt.</p>
                <ul className="space-y-2">
                  {phase.criteria.map((c) => (
                    <li key={c.id} className="flex items-start gap-2.5 text-sm">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: c.met ? "#16a34a" : "#efece6" }}>
                        {c.met && <Check size={12} className="text-white" />}
                      </span>
                      <span className={c.met ? "text-gray-500 line-through" : "text-gray-800"}>{c.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {phase.milestones.length > 0 && (
              <div className="rounded-3xl bg-white border p-5" style={{ borderColor: "#e8e5df" }}>
                <div className="flex items-center gap-2 mb-3"><Flag size={16} style={{ color: "var(--brand-accent, #e8632a)" }} /><p className="font-semibold text-gray-900">Mijlpalen</p></div>
                <ul className="space-y-2">
                  {phase.milestones.map((m) => (
                    <li key={m.id} className="flex items-start gap-2.5 text-sm">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: m.completed ? "#16a34a" : "#efece6" }}>
                        {m.completed && <Check size={12} className="text-white" />}
                      </span>
                      <span className={m.completed ? "text-gray-800 font-medium" : "text-gray-600"}>{m.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {phase.forbiddenActivities.length > 0 && (
              <div className="rounded-3xl border p-5 md:col-span-2" style={{ borderColor: "#fecaca", background: "#fff7f7" }}>
                <div className="flex items-center gap-2 mb-3"><Ban size={16} style={{ color: "#dc2626" }} /><p className="font-semibold text-gray-900">Vermijd in deze fase</p></div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                  {phase.forbiddenActivities.map((a, i) => <li key={i} className="text-sm text-gray-800">• {a}</li>)}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {phase && phase.educationItems.length > 0 && (
        <section>
          <SectionTitle title="Goed om te weten" />
          <div className="rounded-3xl bg-white border divide-y" style={{ borderColor: "#e8e5df" }}>
            {phase.educationItems.map((e) => (
              <div key={e.id} style={{ borderColor: "#f0ede8" }}>
                <button type="button" onClick={() => setOpenEdu((cur) => (cur === e.id ? null : e.id))} className="w-full flex items-center gap-3 px-5 py-4 text-left">
                  <Info size={16} className="text-gray-400 shrink-0" />
                  <span className="flex-1 text-sm font-medium text-gray-900">{e.title}</span>
                  {e.body && <ChevronDown size={16} className={`text-gray-400 transition-transform ${openEdu === e.id ? "rotate-180" : ""}`} />}
                </button>
                {openEdu === e.id && e.body && <p className="px-5 pb-4 -mt-1 pl-12 text-sm text-gray-600 leading-relaxed">{e.body}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {activeSchedule && phase && (
        <WorkoutPlayer
          title={activeSchedule.title}
          subtitle={phase.name}
          exercises={activeSchedule.exercises}
          mode="patient"
          storageKey={activeSchedule.id}
          onClose={() => setActiveSchedule(null)}
          onSave={async (logs, reflection) => {
            const res = await logProtocolSession(patientId, activeSchedule.id, logs, reflection);
            if (!res.error) { onLogged(); showToast("Training opgeslagen"); }
            return res;
          }}
        />
      )}
      {toastNode}
    </div>
  );
}
