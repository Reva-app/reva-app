"use client";

import { Play, Clock, Dumbbell, Stethoscope, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ExerciseThumb } from "@/components/portal/ExerciseThumb";
import { formatPrescription, type PrescriptionLike } from "@/lib/prescription";

export interface TrainingCardExercise extends PrescriptionLike {
  id: string;
  title: string;
  mediaPath?: string | null;
}

/** Geschatte duur: per set ~45 sec werk (of de voorgeschreven tijd) plus rust. */
export function estimateMinutes(exercises: PrescriptionLike[]): number {
  const sec = exercises.reduce((sum, ex) => {
    const sets = Math.max(1, ex.prescribedSets ?? 1);
    const work = ex.prescribedReps ? 45 : ex.prescribedDurationSeconds ?? 45;
    return sum + sets * work + Math.max(0, sets - 1) * 45 + 30;
  }, 0);
  return Math.max(5, Math.round(sec / 60 / 5) * 5);
}

/**
 * Eén trainingsschema als kaart: van wie het komt, wat erin zit, hoe ver je
 * deze week bent, en starten. Zelfde kaart voor schema's van de fysio en
 * eigen thuisschema's, zodat beide even duidelijk zijn.
 */
export function TrainingScheduleCard({
  title, source, exercises, frequencyPerWeek, doneThisWeek, onStart, actions,
}: {
  title: string;
  source: "fysio" | "eigen";
  exercises: TrainingCardExercise[];
  frequencyPerWeek?: number | null;
  doneThisWeek?: number;
  onStart: () => void;
  /** Extra knoppen rechtsboven, bv. bewerken (alleen eigen schema's). */
  actions?: React.ReactNode;
}) {
  const freq = frequencyPerWeek ?? null;
  const done = Math.min(doneThisWeek ?? 0, freq ?? 99);
  const weekDone = freq !== null && done >= freq;
  const SourceIcon = source === "fysio" ? Stethoscope : Home;

  return (
    <div className="rounded-3xl bg-white border overflow-hidden" style={{ borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
              style={source === "fysio" ? { background: "#eef6f3", color: "#24564b" } : { background: "#f3f0eb", color: "#6b6560" }}
            >
              <SourceIcon size={11} /> {source === "fysio" ? "Van je fysio" : "Eigen schema"}
            </span>
            <h3 className="text-lg font-semibold text-gray-900 leading-snug mt-2">{title}</h3>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1"><Dumbbell size={13} /> {exercises.length} {exercises.length === 1 ? "oefening" : "oefeningen"}</span>
              <span className="inline-flex items-center gap-1"><Clock size={13} /> ± {estimateMinutes(exercises)} min</span>
              {freq !== null && <span>{freq}× per week</span>}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {actions}
            {freq !== null && (
              <div className="flex gap-1 pl-1" aria-label={`${done} van ${freq} keer gedaan deze week`}>
                {Array.from({ length: Math.min(freq, 7) }, (_, i) => (
                  <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: i < done ? "#16a34a" : "#e2ddd5" }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {exercises.length > 0 ? (
          <ol className="mt-4 space-y-1.5">
            {exercises.map((ex, i) => (
              <li key={ex.id} className="flex items-center gap-3 rounded-2xl px-3 py-2" style={{ background: "#faf9f7" }}>
                <span className="w-5 text-xs font-semibold text-gray-400 tabular-nums">{i + 1}</span>
                <ExerciseThumb mediaPath={ex.mediaPath ?? null} size={32} />
                <span className="flex-1 min-w-0 text-sm text-gray-800 truncate">{ex.title}</span>
                <span className="text-xs text-gray-500 shrink-0 tabular-nums">{formatPrescription(ex, { withLoad: false })}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-sm text-gray-500">Nog geen oefeningen in dit schema.</p>
        )}
      </div>
      <div className="px-5 sm:px-6 py-4 flex items-center justify-between gap-3 border-t" style={{ borderColor: "#f0ede8", background: weekDone ? "#f0fbf4" : "#ffffff" }}>
        <p className="text-sm" style={{ color: weekDone ? "#15803d" : "#6b7280" }}>
          {freq === null ? "Train wanneer het jou uitkomt" : weekDone ? "Doel van deze week gehaald" : `${done} van ${freq} keer gedaan deze week`}
        </p>
        <Button onClick={onStart} disabled={exercises.length === 0}>
          <Play size={15} /> Start training
        </Button>
      </div>
    </div>
  );
}
