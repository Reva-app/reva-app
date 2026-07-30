"use client";

import { useState } from "react";
import { Check, Loader2, Info } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { useToast } from "@/components/ui/Toast";
import { ExerciseThumb } from "@/components/portal/ExerciseThumb";
import {
  logProtocolSession,
  type PatientActiveProtocol, type PatientProtocolScheduleView, type PatientExerciseLogInput,
} from "@/lib/services/patientProtocolService";

const inputStyle = { borderColor: "#e8e5df", background: "#ffffff", color: "#1a1a1a" };

/**
 * Vervangt Training & Oefeningen volledig zodra een patiënt een protocol
 * toegewezen heeft gekregen: alleen nog lezen + afvinken/loggen, geen eigen
 * oefeningen/schema's meer aanmaken (die komen van de fysiotherapeut).
 */
export function ProtocolTrainingView({
  protocol, patientId, onLogged,
}: {
  protocol: PatientActiveProtocol;
  patientId: string;
  onLogged: () => void;
}) {
  const [logSchedule, setLogSchedule] = useState<PatientProtocolScheduleView | null>(null);
  const { showToast, toastNode } = useToast();

  const phase = protocol.currentPhase;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium" style={{ color: "var(--brand-accent, #e8632a)" }}>{protocol.name}</p>
        <h1 className="text-xl font-semibold text-gray-900 mt-0.5">{phase?.name ?? "Geen actieve fase"}</h1>
        {phase?.description && <p className="text-sm text-gray-500 mt-1">{phase.description}</p>}
      </div>

      {!phase ? (
        <Card>
          <p className="text-sm text-gray-400">Je fysiotherapeut is nog bezig je volgende fase klaar te zetten.</p>
        </Card>
      ) : (
        <>
          {phase.forbiddenActivities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {phase.forbiddenActivities.map((a, i) => <Badge key={i} variant="danger">Vermijd: {a}</Badge>)}
            </div>
          )}

          {phase.schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardHeader
                title={schedule.title}
                subtitle={`${schedule.frequencyPerWeek}× per week`}
                action={
                  <Button size="sm" onClick={() => setLogSchedule(schedule)}>
                    <Check size={13} /> Sessie loggen
                  </Button>
                }
              />
              <div className="space-y-3">
                <ScoreBar label="Deze week" value={Math.min(schedule.completedThisWeek, schedule.frequencyPerWeek)} max={schedule.frequencyPerWeek} />
                <div className="space-y-2">
                  {schedule.exercises.map((ex) => (
                    <div key={ex.id} className="flex items-start gap-2.5 rounded-xl p-3" style={{ background: "#f8f7f4" }}>
                      <ExerciseThumb mediaPath={ex.mediaPath} size={36} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-800 flex-wrap">
                          {ex.title}
                          {(ex.prescribedSets || ex.prescribedReps) && (
                            <span className="text-xs font-normal text-gray-400">
                              — {ex.prescribedSets ?? "?"}×{ex.prescribedReps ?? "?"}{ex.prescribedLoadText ? ` · ${ex.prescribedLoadText}` : ""}
                            </span>
                          )}
                        </div>
                        {ex.instructions && <p className="text-xs text-gray-500 mt-1.5">{ex.instructions}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}

          {phase.milestones.length > 0 && (
            <Card>
              <CardHeader title="Mijlpalen" subtitle="Door je fysiotherapeut afgevinkt zodra behaald" />
              <div className="space-y-2">
                {phase.milestones.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: m.completed ? "#16a34a" : "#e8e5df" }}
                    >
                      {m.completed && <Check size={10} className="text-white" />}
                    </span>
                    <span className={m.completed ? "text-gray-700" : "text-gray-400"}>{m.title}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {phase.educationItems.length > 0 && (
            <Card>
              <CardHeader title="Goed om te weten" />
              <div className="space-y-2">
                {phase.educationItems.map((e) => (
                  <div key={e.id} className="flex gap-2 rounded-xl p-3" style={{ background: "#f8f7f4" }}>
                    <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{e.title}</p>
                      {e.body && <p className="text-xs text-gray-500 mt-1">{e.body}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {logSchedule && (
        <LogSessionModal
          schedule={logSchedule}
          patientId={patientId}
          onClose={() => setLogSchedule(null)}
          onSaved={() => { setLogSchedule(null); onLogged(); showToast("Sessie opgeslagen"); }}
        />
      )}
      {toastNode}
    </div>
  );
}

function LogSessionModal({
  schedule, patientId, onClose, onSaved,
}: {
  schedule: PatientProtocolScheduleView;
  patientId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, { sets: string; reps: string; weightKg: string; painScore: string }>>(
    () => Object.fromEntries(schedule.exercises.map((ex) => [
      ex.id,
      { sets: ex.prescribedSets?.toString() ?? "", reps: ex.prescribedReps?.toString() ?? "", weightKg: "", painScore: "" },
    ]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reflection, setReflection] = useState("");

  function update(exerciseId: string, field: "sets" | "reps" | "weightKg" | "painScore", value: string) {
    setValues((prev) => ({ ...prev, [exerciseId]: { ...prev[exerciseId], [field]: value } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const exerciseLogs: PatientExerciseLogInput[] = schedule.exercises.map((ex) => {
      const v = values[ex.id];
      return {
        scheduleExerciseId: ex.id,
        sets: v.sets ? Number(v.sets) : null,
        reps: v.reps ? Number(v.reps) : null,
        weightKg: v.weightKg ? Number(v.weightKg) : null,
        durationSeconds: null,
        painScore: v.painScore ? Number(v.painScore) : null,
      };
    });
    const { error: saveError } = await logProtocolSession(patientId, schedule.id, exerciseLogs, reflection);
    setSaving(false);
    if (saveError) {
      setError("Opslaan mislukt: " + saveError);
      return;
    }
    onSaved();
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-md" dismissOnBackdropClick={false}>
      <div className="rounded-2xl p-6" style={{ background: "#ffffff" }}>
        <h3 className="font-semibold text-gray-900 mb-1">{schedule.title} loggen</h3>
        <p className="text-xs text-gray-500 mb-4">Vul in wat je daadwerkelijk hebt gedaan — dit helpt je fysiotherapeut je voortgang te volgen.</p>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto">
          {schedule.exercises.map((ex) => (
            <div key={ex.id} className="rounded-xl border p-3" style={{ borderColor: "#e8e5df" }}>
              <p className="text-sm font-medium text-gray-800 mb-2">{ex.title}</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Sets</label>
                  <input type="number" min={0} value={values[ex.id].sets} onChange={(e) => update(ex.id, "sets", e.target.value)}
                    className="w-full text-sm rounded-lg border px-2 py-1.5 focus:outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Herh.</label>
                  <input type="number" min={0} value={values[ex.id].reps} onChange={(e) => update(ex.id, "reps", e.target.value)}
                    className="w-full text-sm rounded-lg border px-2 py-1.5 focus:outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Gewicht (kg)</label>
                  <input type="number" min={0} step="0.5" value={values[ex.id].weightKg} onChange={(e) => update(ex.id, "weightKg", e.target.value)}
                    className="w-full text-sm rounded-lg border px-2 py-1.5 focus:outline-none" style={inputStyle} />
                </div>
              </div>
              <div className="mt-2">
                <label className="block text-[11px] text-gray-400 mb-1">Pijnscore (1-10, optioneel)</label>
                <input type="number" min={1} max={10} value={values[ex.id].painScore} onChange={(e) => update(ex.id, "painScore", e.target.value)}
                  className="w-full text-sm rounded-lg border px-2 py-1.5 focus:outline-none" style={inputStyle} />
              </div>
            </div>
          ))}
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Notitie (optioneel) — ook zichtbaar voor je fysiotherapeut</label>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Bijv. hoe de sessie voelde, pijn of vermoeidheid, vragen voor je fysio..."
              rows={2}
              className="w-full text-sm rounded-lg border px-2.5 py-2 resize-none focus:outline-none"
              style={inputStyle}
            />
          </div>
          {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" size="sm" variant="secondary" onClick={onClose}>Annuleren</Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : "Sessie opslaan"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
