"use client";

import { useMemo, useState } from "react";
import { useAppData } from "@/lib/store";
import { mondayOfWeek, todayStr } from "@/lib/dateUtils";
import { parseFreeDose } from "@/lib/prescription";
import type { TrainingSchema, TrainingOefening } from "@/lib/data";
import { TrainingScheduleCard } from "@/components/training/TrainingScheduleCard";
import { WorkoutPlayer, type WorkoutExercise } from "@/components/training/WorkoutPlayer";

/** Eigen oefening (vrije dosering) → oefening voor de trainingsmodus. */
export function ownExerciseToWorkout(o: TrainingOefening): WorkoutExercise {
  const dose = parseFreeDose(o.repetitions, o.loadOrTime);
  const loadIsTime = !!o.loadOrTime && /\d+\s*(sec|min|uur)/i.test(o.loadOrTime);
  return {
    id: o.id,
    title: o.title,
    description: null,
    instructions: o.description || null,
    mediaPath: null,
    prescribedSets: dose.prescribedSets,
    prescribedReps: dose.prescribedReps,
    prescribedDurationSeconds: dose.prescribedDurationSeconds,
    prescribedLoadText: loadIsTime ? null : o.loadOrTime || null,
    prescriptionNote: o.note || null,
  };
}

/**
 * Een eigen thuisschema als trainingskaart, met dezelfde trainingsmodus als
 * de schema's van de fysio. Een voltooide training komt in het eigen
 * trainingslogboek (training_logs) en telt mee in de weekvoortgang.
 */
export function OwnSchemaTrainer({ schema, actions, onSaved }: {
  schema: TrainingSchema;
  actions?: React.ReactNode;
  onSaved?: () => void;
}) {
  const { trainingOefeningen, dagboekWorkouts, addDagboekWorkout } = useAppData();
  const [playing, setPlaying] = useState(false);

  const exercises = useMemo(
    () => schema.exerciseIds
      .map((id) => trainingOefeningen.find((o) => o.id === id))
      .filter((o): o is TrainingOefening => !!o)
      .map(ownExerciseToWorkout),
    [schema.exerciseIds, trainingOefeningen]
  );

  const weekStart = mondayOfWeek();
  const doneThisWeek = dagboekWorkouts.filter((w) => w.schemaId === schema.id && w.completed && w.date >= weekStart).length;

  return (
    <>
      <TrainingScheduleCard
        title={schema.title}
        source="eigen"
        exercises={exercises}
        doneThisWeek={doneThisWeek}
        onStart={() => setPlaying(true)}
        actions={actions}
      />
      {playing && (
        <WorkoutPlayer
          title={schema.title}
          subtitle="Eigen schema"
          exercises={exercises}
          mode="patient"
          storageKey={`eigen-${schema.id}`}
          onClose={() => setPlaying(false)}
          onSave={async (_logs, reflection, meta) => {
            const now = new Date().toISOString();
            addDagboekWorkout({
              id: crypto.randomUUID(),
              schemaId: schema.id,
              title: schema.title,
              date: todayStr(),
              completed: true,
              completedAt: now,
              reflection: reflection.trim() || undefined,
              completedExerciseIds: meta.completedExerciseIds,
              durationMinutes: Math.max(1, Math.round(meta.durationSeconds / 60)),
              createdAt: now,
            });
            onSaved?.();
            return { error: null };
          }}
        />
      )}
    </>
  );
}
