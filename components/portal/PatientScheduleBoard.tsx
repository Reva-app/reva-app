"use client";

import { useState } from "react";
import { Play, Pencil, Trash2, Plus, Minus, Check, Loader2, Dumbbell, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ExerciseThumb } from "@/components/portal/ExerciseThumb";
import { SortableExerciseList } from "@/components/portal/SortableExerciseList";
import { WorkoutPlayer } from "@/components/training/WorkoutPlayer";
import { formatPrescription, isTimeBased } from "@/lib/prescription";
import {
  createPatientSchedule, updatePatientSchedule, deletePatientSchedule, updatePatientScheduleExercise,
  type PortalPatientProtocolSchedule, type PortalPatientProtocolScheduleExercise,
} from "@/lib/services/protocolService";
import { logProtocolSession } from "@/lib/services/patientProtocolService";

const FREQUENCIES = [1, 2, 3, 4, 5, 6, 7, 14];
const freqLabel = (n: number) => (n === 14 ? "2× per dag" : `${n}× per week`);

interface PatientScheduleBoardProps {
  schedules: PortalPatientProtocolSchedule[];
  phaseId: string;
  phaseName: string;
  patientId: string;
  patientName: string;
  canManage: boolean;
  onChanged: () => void;
  onAddExercises: (scheduleId: string) => void;
  onRemoveExercise: (exercise: PortalPatientProtocolScheduleExercise) => void;
  onReorderExercises: (scheduleId: string, orderedIds: string[]) => void;
  notify: (message: string, type?: "success" | "error") => void;
}

/**
 * De oefenschema's van de actieve fase van één patiënt, zoals de fysio ze in
 * de praktijk gebruikt: duidelijk per schema, dosering direct in de rij aan
 * te passen, schema's toevoegen/hernoemen, en de training samen met de
 * patiënt starten in de trainingsmodus (telt mee als training).
 */
export function PatientScheduleBoard({
  schedules, phaseId, phaseName, patientId, patientName, canManage, onChanged, onAddExercises, onRemoveExercise, onReorderExercises, notify,
}: PatientScheduleBoardProps) {
  const [playing, setPlaying] = useState<PortalPatientProtocolSchedule | null>(null);
  const [adding, setAdding] = useState<{ title: string; freq: number } | null>(null);
  const [savingNew, setSavingNew] = useState(false);

  async function createSchedule() {
    if (!adding) return;
    setSavingNew(true);
    const { error } = await createPatientSchedule(phaseId, adding.title, adding.freq, schedules.length);
    setSavingNew(false);
    if (error) { notify(error, "error"); return; }
    setAdding(null);
    onChanged();
    notify("Schema toegevoegd");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Oefenschema&apos;s</h5>
        {canManage && !adding && (
          <button type="button" onClick={() => setAdding({ title: "", freq: 3 })} className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--brand-accent, #e8632a)" }}>
            <Plus size={14} /> Schema toevoegen
          </button>
        )}
      </div>

      {schedules.length === 0 && !adding && (
        <div className="rounded-2xl border border-dashed p-5 text-center" style={{ borderColor: "#d9d4cc" }}>
          <p className="text-sm text-gray-600">Nog geen oefenschema in deze fase.</p>
          {canManage && (
            <Button size="sm" className="mt-3" onClick={() => setAdding({ title: "Oefeningen", freq: 3 })}><Plus size={14} /> Schema toevoegen</Button>
          )}
        </div>
      )}

      {schedules.map((s) => (
        <ScheduleCard
          key={s.id}
          schedule={s}
          canManage={canManage}
          onStart={() => setPlaying(s)}
          onChanged={onChanged}
          onAddExercises={() => onAddExercises(s.id)}
          onRemoveExercise={onRemoveExercise}
          onReorder={(ids) => onReorderExercises(s.id, ids)}
          notify={notify}
        />
      ))}

      {adding && (
        <div className="rounded-2xl border p-4 space-y-3 bg-white" style={{ borderColor: "var(--brand-accent, #e8632a)" }}>
          <p className="text-sm font-semibold text-gray-900">Nieuw schema</p>
          <div className="flex flex-wrap gap-1.5">
            {[["Thuisoefeningen", 5], ["Training in de praktijk", 1], ["Krachtschema", 3], ["Mobiliteit dagelijks", 7]].map(([name, f]) => (
              <button key={name as string} type="button" onClick={() => setAdding({ title: name as string, freq: f as number })}
                className="rounded-full border px-3 py-1.5 text-sm"
                style={{ borderColor: adding.title === name ? "var(--brand-accent, #e8632a)" : "#e8e5df", background: adding.title === name ? "var(--brand-accent-soft, #fff3ee)" : "#fff" }}>
                {name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-3">
            <input autoFocus value={adding.title} onChange={(e) => setAdding({ ...adding, title: e.target.value })} placeholder="Bijv. Krachtschema thuis"
              className="w-full text-base sm:text-sm rounded-xl border px-3 py-2.5 focus:outline-none" style={{ borderColor: "#e8e5df" }} />
            <select value={adding.freq} onChange={(e) => setAdding({ ...adding, freq: Number(e.target.value) })}
              className="w-full text-base sm:text-sm rounded-xl border px-3 py-2.5 focus:outline-none bg-white" style={{ borderColor: "#e8e5df" }}>
              {FREQUENCIES.map((n) => <option key={n} value={n}>{freqLabel(n)}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setAdding(null)} disabled={savingNew}>Annuleren</Button>
            <Button size="sm" onClick={createSchedule} disabled={savingNew}>{savingNew ? <Loader2 size={13} className="animate-spin" /> : "Schema maken"}</Button>
          </div>
        </div>
      )}

      {playing && (
        <WorkoutPlayer
          title={playing.title}
          subtitle={`${patientName} · ${phaseName}`}
          mode="therapist"
          storageKey={`praktijk-${playing.id}`}
          exercises={playing.exercises.map((e) => ({
            id: e.id, title: e.title, description: e.description, instructions: e.instructions, mediaPath: e.mediaPath, mediaType: e.mediaType,
            prescribedSets: e.prescribedSets, prescribedReps: e.prescribedReps, prescribedDurationSeconds: e.prescribedDurationSeconds,
            prescribedLoadText: e.prescribedLoadText, prescriptionNote: e.prescriptionNote,
          }))}
          onClose={() => { setPlaying(null); onChanged(); }}
          onUpdateDose={(id, input) => updatePatientScheduleExercise(id, input)}
          onSave={async (logs, reflection) => {
            const res = await logProtocolSession(patientId, playing.id, logs, reflection ? `In de praktijk: ${reflection}` : "Training in de praktijk");
            if (!res.error) notify("Training in de praktijk opgeslagen");
            return res;
          }}
        />
      )}
    </div>
  );
}

function ScheduleCard({
  schedule: s, canManage, onStart, onChanged, onAddExercises, onRemoveExercise, onReorder, notify,
}: {
  schedule: PortalPatientProtocolSchedule;
  canManage: boolean;
  onStart: () => void;
  onChanged: () => void;
  onAddExercises: () => void;
  onRemoveExercise: (exercise: PortalPatientProtocolScheduleExercise) => void;
  onReorder: (orderedIds: string[]) => void;
  notify: (message: string, type?: "success" | "error") => void;
}) {
  const [editing, setEditing] = useState<{ title: string; freq: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [openExerciseId, setOpenExerciseId] = useState<string | null>(null);
  const done = Math.min(s.completedThisWeek, s.frequencyPerWeek);

  async function saveHeader() {
    if (!editing) return;
    setBusy(true);
    const { error } = await updatePatientSchedule(s.id, { title: editing.title, frequencyPerWeek: editing.freq });
    setBusy(false);
    if (error) { notify(error, "error"); return; }
    setEditing(null);
    onChanged();
  }

  async function remove() {
    if (!window.confirm(`Schema "${s.title}" verwijderen?`)) return;
    setBusy(true);
    const { error } = await deletePatientSchedule(s.id);
    setBusy(false);
    if (error) { notify(error, "error"); return; }
    onChanged();
    notify("Schema verwijderd");
  }

  return (
    <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: "#e8e5df" }}>
      <div className="px-4 sm:px-5 py-4 flex items-start justify-between gap-3 flex-wrap" style={{ background: "#faf9f7", borderBottom: "1px solid #f0ede8" }}>
        {editing ? (
          <div className="flex-1 min-w-[240px] flex flex-wrap items-center gap-2">
            <input autoFocus value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              className="flex-1 min-w-[160px] text-base sm:text-sm rounded-xl border px-3 py-2 focus:outline-none bg-white" style={{ borderColor: "#e8e5df" }} />
            <select value={editing.freq} onChange={(e) => setEditing({ ...editing, freq: Number(e.target.value) })}
              className="text-base sm:text-sm rounded-xl border px-3 py-2 focus:outline-none bg-white" style={{ borderColor: "#e8e5df" }}>
              {FREQUENCIES.map((n) => <option key={n} value={n}>{freqLabel(n)}</option>)}
            </select>
            <Button size="sm" onClick={saveHeader} disabled={busy}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)} disabled={busy}><X size={14} /></Button>
          </div>
        ) : (
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900">{s.title}</p>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>{freqLabel(s.frequencyPerWeek)}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                {Array.from({ length: Math.min(s.frequencyPerWeek, 7) }, (_, i) => (
                  <span key={i} className="w-2 h-2 rounded-full" style={{ background: i < done ? "#16a34a" : "#e2ddd5" }} />
                ))}
                <span className="ml-1">{done} deze week</span>
              </span>
            </p>
          </div>
        )}
        {!editing && (
          <div className="flex items-center gap-1.5">
            {canManage && (
              <>
                <button type="button" onClick={() => setEditing({ title: s.title, freq: s.frequencyPerWeek })} className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white" title="Schema hernoemen of frequentie aanpassen">
                  <Pencil size={15} />
                </button>
                <button type="button" onClick={remove} disabled={busy} className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white hover:text-red-600" title="Schema verwijderen">
                  <Trash2 size={15} />
                </button>
                <Button size="sm" onClick={onStart} disabled={s.exercises.length === 0}>
                  <Play size={14} /> Start training
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 space-y-2">
        {s.exercises.length === 0 && <p className="text-sm text-gray-500 px-1 py-2">Nog geen oefeningen in dit schema.</p>}
        <SortableExerciseList
          items={s.exercises}
          getId={(ex) => ex.id}
          onReorder={onReorder}
          disabled={!canManage || !!openExerciseId}
          renderItem={(ex, index, dragHandle) => (
            <ExerciseRow
              exercise={ex}
              index={index}
              dragHandle={dragHandle}
              canManage={canManage}
              open={openExerciseId === ex.id}
              onToggle={() => setOpenExerciseId((cur) => (cur === ex.id ? null : ex.id))}
              onSaved={() => { setOpenExerciseId(null); onChanged(); }}
              onRemove={() => onRemoveExercise(ex)}
              notify={notify}
            />
          )}
        />
        {canManage && (
          <button type="button" onClick={onAddExercises}
            className="w-full rounded-xl border border-dashed py-3 text-sm font-medium inline-flex items-center justify-center gap-1.5 hover:bg-[#faf9f7]"
            style={{ borderColor: "#d9d4cc", color: "var(--brand-accent, #e8632a)" }}>
            <Plus size={15} /> Oefeningen toevoegen
          </button>
        )}
      </div>
    </div>
  );
}

function ExerciseRow({
  exercise: ex, index, dragHandle, canManage, open, onToggle, onSaved, onRemove, notify,
}: {
  exercise: PortalPatientProtocolScheduleExercise;
  index: number;
  dragHandle: React.ReactNode;
  canManage: boolean;
  open: boolean;
  onToggle: () => void;
  onSaved: () => void;
  onRemove: () => void;
  notify: (message: string, type?: "success" | "error") => void;
}) {
  const timed = isTimeBased(ex);
  const [kind, setKind] = useState<"reps" | "time">(timed ? "time" : "reps");
  const [sets, setSets] = useState(ex.prescribedSets ?? 0);
  const [reps, setReps] = useState(ex.prescribedReps ?? 10);
  const [secs, setSecs] = useState(ex.prescribedDurationSeconds ?? 30);
  const [load, setLoad] = useState(ex.prescribedLoadText ?? "");
  const [note, setNote] = useState(ex.prescriptionNote ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await updatePatientScheduleExercise(ex.id, {
      prescribedSets: sets || null,
      prescribedReps: kind === "reps" ? reps || null : null,
      prescribedDurationSeconds: kind === "time" ? secs || null : null,
      prescribedLoadText: load,
      prescriptionNote: note,
    });
    setSaving(false);
    if (error) { notify(error, "error"); return; }
    onSaved();
  }

  const dosage = formatPrescription(ex, { withLoad: false });

  return (
    <div className="rounded-xl border" style={{ borderColor: open ? "var(--brand-accent, #e8632a)" : "#e8e5df", background: "#ffffff" }}>
      <div className="flex items-center gap-3 px-2.5 sm:px-3 py-2.5">
        {dragHandle}
        <span className="w-5 text-xs font-semibold text-gray-400 tabular-nums text-center shrink-0">{index + 1}</span>
        <ExerciseThumb mediaPath={ex.mediaPath} size={40} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{ex.title}</p>
          {(ex.prescribedLoadText || ex.prescriptionNote) && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{[ex.prescribedLoadText, ex.prescriptionNote].filter(Boolean).join(" · ")}</p>
          )}
        </div>
        <button
          type="button"
          onClick={canManage ? onToggle : undefined}
          disabled={!canManage}
          className="shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium tabular-nums transition-colors"
          style={{ background: open ? "var(--brand-accent, #e8632a)" : "var(--brand-accent-soft, #fff3ee)", color: open ? "#fff" : "var(--brand-accent-ink, #9a3f17)" }}
          title={canManage ? "Dosering aanpassen" : undefined}
        >
          {timed ? <Timer size={13} /> : <Dumbbell size={13} />} {dosage || "Dosering"}
        </button>
        {canManage && (
          <button type="button" onClick={onRemove} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-gray-50 shrink-0" title="Uit schema verwijderen">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="px-3 sm:px-4 pb-4 pt-1 space-y-3 border-t" style={{ borderColor: "#f0ede8" }}>
          <div className="flex gap-2 pt-3">
            {(["reps", "time"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)} className="rounded-full border px-3 py-1.5 text-sm"
                style={{ borderColor: kind === k ? "var(--brand-accent, #e8632a)" : "#e8e5df", background: kind === k ? "var(--brand-accent-soft, #fff3ee)" : "#fff" }}>
                {k === "reps" ? "Herhalingen" : "Op tijd"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stepper label="Sets" value={sets} onChange={setSets} />
            {kind === "reps"
              ? <Stepper label="Herhalingen" value={reps} onChange={setReps} />
              : <Stepper label="Seconden" value={secs} onChange={setSecs} step={secs >= 60 ? 30 : 5} />}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-gray-500 mb-1">Belasting (optioneel)</span>
              <input value={load} onChange={(e) => setLoad(e.target.value)} placeholder="Bijv. 8 kg, rode band" className="w-full text-base sm:text-sm rounded-xl border px-3 py-2 focus:outline-none" style={{ borderColor: "#e8e5df" }} />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-500 mb-1">Aanwijzing voor de patiënt (optioneel)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bijv. knie boven de voet" className="w-full text-base sm:text-sm rounded-xl border px-3 py-2 focus:outline-none" style={{ borderColor: "#e8e5df" }} />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={onToggle} disabled={saving}>Annuleren</Button>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? <Loader2 size={13} className="animate-spin" /> : "Opslaan"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div>
      <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onChange(Math.max(0, value - step))} className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0" style={{ borderColor: "#e8e5df" }} aria-label={`${label} omlaag`}><Minus size={14} /></button>
        <input type="number" inputMode="numeric" min={0} value={value} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-full min-w-0 text-center text-lg font-semibold tabular-nums rounded-xl border py-1.5 focus:outline-none" style={{ borderColor: "#e8e5df" }} aria-label={label} />
        <button type="button" onClick={() => onChange(value + step)} className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0" style={{ borderColor: "#e8e5df" }} aria-label={`${label} omhoog`}><Plus size={14} /></button>
      </div>
    </div>
  );
}
