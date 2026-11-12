"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X, Check, ChevronLeft, ChevronRight, Plus, Minus, Play, Pause, Timer, Info, Loader2, Trophy, Pencil, RotateCcw, ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ExerciseMedia } from "@/components/training/ExerciseMedia";
import { formatDuration, formatPrescription, isTimeBased } from "@/lib/prescription";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WorkoutExercise {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  mediaPath: string | null;
  mediaType?: string | null;
  prescribedSets: number | null;
  prescribedReps: number | null;
  prescribedDurationSeconds: number | null;
  prescribedLoadText: string | null;
  prescriptionNote: string | null;
}

export interface WorkoutLog {
  scheduleExerciseId: string;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  painScore: number | null;
}

export interface DoseInput {
  prescribedSets: number | null;
  prescribedReps: number | null;
  prescribedDurationSeconds: number | null;
  prescribedLoadText: string;
  prescriptionNote: string;
}

interface SetState { done: boolean; reps: string; weight: string; seconds: string }
interface ExerciseState { sets: SetState[]; pain: number | null }
interface Saved { v: 1; startedAt: number; index: number; states: Record<string, ExerciseState> }

interface WorkoutPlayerProps {
  title: string;
  subtitle?: string;
  exercises: WorkoutExercise[];
  /** "therapist" = samen met de patiënt in de praktijk; dosering is dan direct aan te passen. */
  mode: "patient" | "therapist";
  /** Sleutel voor hervatten na per ongeluk sluiten (bv. schema-id). */
  storageKey: string;
  onSave: (logs: WorkoutLog[], reflection: string, meta: { durationSeconds: number; completedExerciseIds: string[] }) => Promise<{ error: string | null }>;
  onClose: () => void;
  /** Alleen in therapeutmodus: dosering van een oefening blijvend aanpassen. */
  onUpdateDose?: (exerciseId: string, input: DoseInput) => Promise<{ error: string | null }>;
}

// ─── Hulpfuncties ────────────────────────────────────────────────────────────

const REST_KEY = "reva-rest-seconds";
const STORE_PREFIX = "reva-workout-";
const RESUME_MAX_MS = 12 * 60 * 60 * 1000;

function initialState(ex: WorkoutExercise): ExerciseState {
  const n = Math.max(1, ex.prescribedSets ?? 1);
  return {
    sets: Array.from({ length: n }, () => ({
      done: false,
      reps: ex.prescribedReps ? String(ex.prescribedReps) : "",
      weight: "",
      seconds: ex.prescribedDurationSeconds ? String(ex.prescribedDurationSeconds) : "",
    })),
    pain: null,
  };
}

function readStore<T>(key: string): T | null {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : null; } catch { return null; }
}
function writeStore(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* opslag geblokkeerd: geen hervatten */ }
}
function clearStore(key: string) {
  try { localStorage.removeItem(key); } catch { /* idem */ }
}

/** Korte dubbele piep + trilling aan het einde van een timer. */
function signal() {
  try { navigator.vibrate?.([180, 90, 180]); } catch { /* niet ondersteund */ }
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    [0, 0.22].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.18);
    });
    setTimeout(() => ctx.close(), 800);
  } catch { /* geen audio */ }
}

function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Houdt het scherm aan tijdens het trainen (waar de browser dat ondersteunt). */
function useWakeLock() {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    async function acquire() {
      try { lock = (await nav.wakeLock?.request("screen")) ?? null; } catch { lock = null; }
    }
    function onVisible() { if (document.visibilityState === "visible") void acquire(); }
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => { document.removeEventListener("visibilitychange", onVisible); void lock?.release().catch(() => {}); };
  }, []);
}

/** Aftellen op basis van een eindtijd — blijft kloppen als het tabblad even op de achtergrond staat. */
function useCountdown(endsAt: number | null, onDone: () => void) {
  const [now, setNow] = useState(() => Date.now());
  const doneRef = useRef(onDone);
  useEffect(() => { doneRef.current = onDone; });
  useEffect(() => {
    if (!endsAt) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt) { window.clearInterval(id); doneRef.current(); }
    }, 200);
    return () => window.clearInterval(id);
  }, [endsAt]);
  return endsAt ? Math.max(0, (endsAt - now) / 1000) : 0;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Trainingsmodus: schermvullend een schema doorlopen. Per oefening de sets
 * afvinken (herhalingen/gewicht, of een aftelklok bij tijdsoefeningen), een
 * rusttimer die na elke set start, pijn per oefening en aan het eind een
 * samenvatting. Voortgang wordt lokaal bewaard, zodat per ongeluk sluiten
 * niets kost.
 */
export function WorkoutPlayer({ title, subtitle, exercises: initialExercises, mode, storageKey, onSave, onClose, onUpdateDose }: WorkoutPlayerProps) {
  const store = STORE_PREFIX + storageKey;
  const [exercises, setExercises] = useState(initialExercises);
  const [resumed] = useState(() => {
    const saved = readStore<Saved>(store);
    return saved && saved.v === 1 && Date.now() - saved.startedAt < RESUME_MAX_MS ? saved : null;
  });
  const [startedAt, setStartedAt] = useState(() => resumed?.startedAt ?? Date.now());
  const [index, setIndex] = useState(() => Math.min(resumed?.index ?? 0, Math.max(0, initialExercises.length - 1)));
  const [states, setStates] = useState<Record<string, ExerciseState>>(() =>
    Object.fromEntries(initialExercises.map((ex) => [ex.id, resumed?.states[ex.id] ?? initialState(ex)]))
  );
  const [showResumeNote, setShowResumeNote] = useState(!!resumed);
  const [finished, setFinished] = useState(false);
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [editingDose, setEditingDose] = useState(false);
  const [elapsedNow, setElapsedNow] = useState(() => Date.now());

  const [restDefault, setRestDefault] = useState(() => {
    const v = Number(readStore<number>(REST_KEY));
    return v >= 15 && v <= 300 ? v : 60;
  });
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(60);
  const [setTimer, setSetTimer] = useState<{ exId: string; set: number; endsAt: number; total: number; paused: number | null } | null>(null);

  useWakeLock();

  useEffect(() => {
    const id = window.setInterval(() => setElapsedNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (finished) return;
    writeStore(store, { v: 1, startedAt, index, states } satisfies Saved);
  }, [store, startedAt, index, states, finished]);

  const ex = exercises[index];
  const st = ex ? states[ex.id] : null;
  const timed = ex ? isTimeBased(ex) : false;

  const restLeft = useCountdown(restEndsAt, () => { setRestEndsAt(null); signal(); });

  /**
   * Set bijwerken. Een gewijzigd gewicht, aantal herhalingen of tijd gaat
   * automatisch mee naar de volgende, nog niet afgevinkte sets die nog de
   * oude (of geen) waarde hadden — handmatig afwijken blijft mogelijk.
   */
  const updateSet = useCallback((exId: string, i: number, patch: Partial<SetState>) => {
    setStates((prev) => {
      const sets = prev[exId].sets;
      const old = sets[i];
      return {
        ...prev,
        [exId]: {
          ...prev[exId],
          sets: sets.map((s, k) => {
            if (k === i) return { ...s, ...patch };
            if (k < i || s.done) return s;
            const next = { ...s };
            for (const key of ["weight", "reps", "seconds"] as const) {
              if (patch[key] !== undefined && (s[key] === old[key] || s[key] === "")) next[key] = patch[key]!;
            }
            return next;
          }),
        },
      };
    });
  }, []);

  function startRest(seconds: number) {
    setRestTotal(seconds);
    setRestEndsAt(Date.now() + seconds * 1000);
  }

  function toggleSet(i: number) {
    if (!ex || !st) return;
    const nowDone = !st.sets[i].done;
    updateSet(ex.id, i, { done: nowDone });
    if (nowDone) {
      const isLastSetOfLast = index === exercises.length - 1 && st.sets.every((s, k) => k === i || s.done);
      if (!isLastSetOfLast) startRest(timed ? Math.min(restDefault, 45) : restDefault);
    }
  }

  // Aftelklok voor een tijdsset
  const setTimerLeft = useCountdown(setTimer && setTimer.paused === null ? setTimer.endsAt : null, () => {
    if (!setTimer) return;
    const { exId, set } = setTimer;
    setSetTimer(null);
    signal();
    updateSet(exId, set, { done: true });
    const exState = states[exId];
    const isLast = index === exercises.length - 1 && exState.sets.every((s, k) => k === set || s.done);
    if (!isLast) startRest(Math.min(restDefault, 45));
  });

  function startSetTimer(i: number) {
    if (!ex || !st) return;
    const secs = Number(st.sets[i].seconds) || ex.prescribedDurationSeconds || 30;
    setRestEndsAt(null);
    setSetTimer({ exId: ex.id, set: i, endsAt: Date.now() + secs * 1000, total: secs, paused: null });
  }
  function toggleSetTimerPause() {
    setSetTimer((t) => {
      if (!t) return t;
      if (t.paused === null) return { ...t, paused: Math.max(0, (t.endsAt - Date.now()) / 1000) };
      return { ...t, endsAt: Date.now() + t.paused * 1000, paused: null };
    });
  }

  function addSet() {
    if (!ex || !st) return;
    const last = st.sets[st.sets.length - 1];
    setStates((prev) => ({ ...prev, [ex.id]: { ...prev[ex.id], sets: [...prev[ex.id].sets, { done: false, reps: last?.reps ?? "", weight: last?.weight ?? "", seconds: last?.seconds ?? "" }] } }));
  }
  function removeSet() {
    if (!ex || !st || st.sets.length <= 1) return;
    setStates((prev) => ({ ...prev, [ex.id]: { ...prev[ex.id], sets: prev[ex.id].sets.slice(0, -1) } }));
  }

  function changeRestDefault(delta: number) {
    const v = Math.max(15, Math.min(300, restDefault + delta));
    setRestDefault(v);
    writeStore(REST_KEY, v);
    if (restEndsAt) setRestEndsAt((e) => (e ? e + delta * 1000 : e));
  }

  function go(to: number) {
    setSetTimer(null);
    setShowInfo(false);
    setEditingDose(false);
    setIndex(Math.max(0, Math.min(exercises.length - 1, to)));
    window.scrollTo?.({ top: 0 });
  }

  function restart() {
    clearStore(store);
    setStates(Object.fromEntries(exercises.map((e) => [e.id, initialState(e)])));
    setIndex(0);
    setStartedAt(Date.now());
    setShowResumeNote(false);
  }

  const doneCount = (id: string) => states[id]?.sets.filter((s) => s.done).length ?? 0;
  const exerciseDone = (id: string) => { const s = states[id]; return !!s && s.sets.length > 0 && s.sets.every((x) => x.done); };
  const totalSetsDone = useMemo(() => Object.values(states).reduce((n, s) => n + s.sets.filter((x) => x.done).length, 0), [states]);
  const exercisesTouched = exercises.filter((e) => doneCount(e.id) > 0).length;
  const anyProgress = totalSetsDone > 0;
  const elapsed = (elapsedNow - startedAt) / 1000;

  function requestClose() {
    if (anyProgress && !finished) { setConfirmClose(true); return; }
    clearStore(store);
    onClose();
  }

  async function save() {
    setSaving(true);
    setError("");
    const logs: WorkoutLog[] = exercises.flatMap((e) => {
      const s = states[e.id];
      const done = s.sets.filter((x) => x.done);
      if (done.length === 0) return [];
      const isTimed = isTimeBased(e);
      const num = (v: string) => (v.trim() === "" ? null : Number(v));
      const weights = done.map((x) => num(x.weight)).filter((v): v is number => v !== null);
      return [{
        scheduleExerciseId: e.id,
        sets: done.length,
        reps: isTimed ? null : num(done[done.length - 1].reps),
        weightKg: isTimed || weights.length === 0 ? null : Math.max(...weights),
        durationSeconds: isTimed ? num(done[done.length - 1].seconds) : null,
        painScore: s.pain,
      }];
    });
    const { error: saveError } = await onSave(logs, reflection, {
      durationSeconds: Math.round((Date.now() - startedAt) / 1000),
      completedExerciseIds: logs.map((l) => l.scheduleExerciseId),
    });
    setSaving(false);
    if (saveError) { setError(saveError); return; }
    clearStore(store);
    onClose();
  }

  // ── Dosering aanpassen (therapeut) ──
  const [dose, setDose] = useState<{ sets: string; reps: string; secs: string; load: string; note: string; kind: "reps" | "time" }>({ sets: "", reps: "", secs: "", load: "", note: "", kind: "reps" });
  const [doseSaving, setDoseSaving] = useState(false);
  function openDose() {
    if (!ex) return;
    setDose({
      sets: ex.prescribedSets ? String(ex.prescribedSets) : "",
      reps: ex.prescribedReps ? String(ex.prescribedReps) : "",
      secs: ex.prescribedDurationSeconds ? String(ex.prescribedDurationSeconds) : "",
      load: ex.prescribedLoadText ?? "",
      note: ex.prescriptionNote ?? "",
      kind: isTimeBased(ex) ? "time" : "reps",
    });
    setEditingDose(true);
  }
  async function saveDose() {
    if (!ex || !onUpdateDose) return;
    const input: DoseInput = {
      prescribedSets: dose.sets ? Number(dose.sets) : null,
      prescribedReps: dose.kind === "reps" && dose.reps ? Number(dose.reps) : null,
      prescribedDurationSeconds: dose.kind === "time" && dose.secs ? Number(dose.secs) : null,
      prescribedLoadText: dose.load,
      prescriptionNote: dose.note,
    };
    setDoseSaving(true);
    const { error: doseError } = await onUpdateDose(ex.id, input);
    setDoseSaving(false);
    if (doseError) { setError(doseError); return; }
    const updated: WorkoutExercise = { ...ex, ...input, prescribedLoadText: input.prescribedLoadText || null, prescriptionNote: input.prescriptionNote || null };
    setExercises((list) => list.map((e) => (e.id === ex.id ? updated : e)));
    // Sets van deze oefening opnieuw opbouwen; al afgevinkte sets blijven staan.
    setStates((prev) => {
      const cur = prev[ex.id];
      const fresh = initialState(updated);
      return { ...prev, [ex.id]: { ...cur, sets: fresh.sets.map((s, k) => (cur.sets[k]?.done ? cur.sets[k] : s)) } };
    });
    setEditingDose(false);
  }

  if (exercises.length === 0) {
    return (
      <Shell onClose={onClose} title={title} subtitle={subtitle}>
        <p className="text-sm text-gray-600 text-center mt-16">Dit schema heeft nog geen oefeningen.</p>
      </Shell>
    );
  }

  // ── Samenvatting ──
  if (finished) {
    return (
      <Shell onClose={requestClose} title={title} subtitle="Samenvatting">
        <div className="max-w-xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto" style={{ background: "#ecfdf3" }}>
              <Trophy size={28} style={{ color: "#16a34a" }} />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900 mt-4">{exercisesTouched === exercises.length ? "Training voltooid!" : "Goed bezig!"}</h2>
            <p className="text-sm text-gray-500 mt-1">{mode === "therapist" ? "Wordt opgeslagen als training in de praktijk." : "Je fysiotherapeut ziet je training terug."}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-7">
            {[
              { label: "Oefeningen", value: `${exercisesTouched}/${exercises.length}` },
              { label: "Sets", value: String(totalSetsDone) },
              { label: "Duur", value: clock(elapsed) },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white border p-4 text-center" style={{ borderColor: "#e8e5df" }}>
                <p className="text-2xl font-semibold tabular-nums text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <ul className="mt-5 rounded-2xl bg-white border divide-y" style={{ borderColor: "#e8e5df" }}>
            {exercises.map((e, i) => {
              const d = doneCount(e.id);
              const total = states[e.id].sets.length;
              return (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: "#f0ede8" }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: d === total ? "#16a34a" : d > 0 ? "#fde7d6" : "#efece6" }}>
                    {d === total ? <Check size={13} color="#fff" /> : <span className="text-[11px] font-semibold text-gray-500">{i + 1}</span>}
                  </span>
                  <span className="flex-1 min-w-0 text-sm text-gray-800 truncate">{e.title}</span>
                  <span className="text-xs text-gray-500 tabular-nums">{d}/{total} sets</span>
                </li>
              );
            })}
          </ul>
          <label className="block text-sm font-medium text-gray-700 mt-6 mb-2">{mode === "therapist" ? "Notitie bij deze training (optioneel)" : "Hoe ging het? (optioneel)"}</label>
          <textarea
            rows={3} value={reflection} onChange={(e) => setReflection(e.target.value)}
            placeholder={mode === "therapist" ? "Bijv. squat-diepte verhoogd, geen pijn" : "Bijv. laatste set was zwaar, geen pijn"}
            className="w-full text-base sm:text-sm rounded-2xl border px-4 py-3 focus:outline-none resize-none bg-white" style={{ borderColor: "#e8e5df" }}
          />
          {error && <p className="text-sm mt-3" role="alert" style={{ color: "#dc2626" }}>{error}</p>}
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" size="lg" onClick={() => setFinished(false)} disabled={saving}><ChevronLeft size={16} /> Terug</Button>
            <Button size="lg" fullWidth onClick={save} disabled={saving || totalSetsDone === 0}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Training opslaan"}
            </Button>
          </div>
          {totalSetsDone === 0 && <p className="text-xs text-subtle mt-2 text-center">Vink minstens één set af om de training op te slaan.</p>}
        </div>
        {confirmClose && <CloseConfirm onCancel={() => setConfirmClose(false)} onConfirm={() => { clearStore(store); onClose(); }} />}
      </Shell>
    );
  }

  // ── Oefening ──
  const allDoneHere = st!.sets.every((s) => s.done);
  const isLast = index === exercises.length - 1;
  const dosage = formatPrescription(ex);
  const currentSet = st!.sets.findIndex((s) => !s.done);
  const nextExercise = exercises[index + 1];

  return (
    <Shell
      onClose={requestClose}
      title={title}
      subtitle={`Oefening ${index + 1} van ${exercises.length} · ${clock(elapsed)}`}
      action={
        <button type="button" onClick={() => setShowOverview(true)} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shrink-0" style={{ borderColor: "#e8e5df" }}>
          <ListChecks size={15} /> Overzicht
        </button>
      }
      progress={
        <div className="flex gap-1">
          {exercises.map((e, i) => (
            <button
              key={e.id} type="button" onClick={() => go(i)} aria-label={`Naar oefening ${i + 1}: ${e.title}`}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{ background: exerciseDone(e.id) ? "#16a34a" : i === index ? "var(--brand-accent, #e8632a)" : doneCount(e.id) > 0 ? "#f6c3a9" : "#e2ddd5" }}
            />
          ))}
        </div>
      }
    >
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-48">
        {showResumeNote && (
          <div className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 mb-4 text-sm" style={{ background: "#fff8f2", border: "1px solid #f6d3c2" }}>
            <span className="text-gray-700">Je training is hervat waar je gebleven was.</span>
            <button type="button" onClick={restart} className="inline-flex items-center gap-1 font-medium shrink-0" style={{ color: "var(--brand-accent, #e8632a)" }}>
              <RotateCcw size={13} /> Opnieuw
            </button>
          </div>
        )}

        <p className="text-xs font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: "var(--brand-accent, #e8632a)" }}>
          Oefening {index + 1} van {exercises.length}
        </p>
        <ExerciseMedia key={ex.id} mediaPath={ex.mediaPath} mediaType={ex.mediaType} number={index + 1} timed={timed} />
        <h2 className="text-2xl sm:text-[32px] font-bold tracking-tight text-gray-900 leading-tight mt-4">{ex.title}</h2>
        <div className="flex items-center gap-2 flex-wrap mt-3">
          {dosage && (
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold" style={{ background: "#fff3ee", color: "#9a3f17" }}>
              {timed ? <Timer size={14} /> : null}{dosage}
            </span>
          )}
          <span className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium" style={{ background: allDoneHere ? "#ecfdf3" : "#ffffff", color: allDoneHere ? "#15803d" : "#374151", border: allDoneHere ? "none" : "1px solid #e8e5df" }}>
            {allDoneHere ? "Alle sets gedaan" : `Set ${Math.min(currentSet + 1, st!.sets.length)} van ${st!.sets.length}`}
          </span>
        </div>

        {ex.prescriptionNote && (
          <p className="mt-4 rounded-2xl px-4 py-3 text-sm" style={{ background: "#f3f7f5", color: "#24564b" }}>
            <span className="font-medium">Van je fysio: </span>{ex.prescriptionNote}
          </p>
        )}

        {(ex.instructions || ex.description) && (
          <div className="mt-4 rounded-2xl bg-white border" style={{ borderColor: "#e8e5df" }}>
            <button type="button" onClick={() => setShowInfo((v) => !v)} className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-gray-800">
              <span className="inline-flex items-center gap-2"><Info size={15} className="text-gray-400" /> Zo doe je het</span>
              <ChevronRight size={16} className={`text-gray-400 transition-transform ${showInfo ? "rotate-90" : ""}`} />
            </button>
            {showInfo && (
              <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed space-y-2">
                {ex.instructions && <p>{ex.instructions}</p>}
                {ex.description && ex.description !== ex.instructions && <p className="text-gray-500">{ex.description}</p>}
              </div>
            )}
          </div>
        )}

        {mode === "therapist" && onUpdateDose && (
          editingDose ? (
            <div className="mt-4 rounded-2xl bg-white border p-4 space-y-3" style={{ borderColor: "var(--brand-accent, #e8632a)" }}>
              <p className="text-sm font-semibold text-gray-900">Dosering aanpassen voor deze patiënt</p>
              <div className="flex gap-2">
                {(["reps", "time"] as const).map((k) => (
                  <button key={k} type="button" onClick={() => setDose((d) => ({ ...d, kind: k }))}
                    className="rounded-full border px-3 py-1.5 text-sm"
                    style={{ borderColor: dose.kind === k ? "var(--brand-accent, #e8632a)" : "#e8e5df", background: dose.kind === k ? "#fff3ee" : "#fff" }}>
                    {k === "reps" ? "Herhalingen" : "Op tijd"}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Sets" value={dose.sets} onChange={(v) => setDose((d) => ({ ...d, sets: v }))} />
                {dose.kind === "reps"
                  ? <NumberField label="Herhalingen" value={dose.reps} onChange={(v) => setDose((d) => ({ ...d, reps: v }))} />
                  : <NumberField label="Seconden" value={dose.secs} onChange={(v) => setDose((d) => ({ ...d, secs: v }))} step={5} />}
              </div>
              <TextField label="Belasting (optioneel)" value={dose.load} onChange={(v) => setDose((d) => ({ ...d, load: v }))} placeholder="Bijv. 8 kg, rode band" />
              <TextField label="Aanwijzing voor de patiënt (optioneel)" value={dose.note} onChange={(v) => setDose((d) => ({ ...d, note: v }))} placeholder="Bijv. knie boven de voet houden" />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditingDose(false)} disabled={doseSaving}>Annuleren</Button>
                <Button size="sm" onClick={saveDose} disabled={doseSaving}>{doseSaving ? <Loader2 size={13} className="animate-spin" /> : "Opslaan in schema"}</Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={openDose} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--brand-accent, #e8632a)" }}>
              <Pencil size={13} /> Dosering aanpassen
            </button>
          )
        )}

        {/* Sets */}
        <div className="mt-6 space-y-2.5">
          {st!.sets.map((s, i) => {
            const running = setTimer && setTimer.exId === ex.id && setTimer.set === i;
            return (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl border px-3 sm:px-4 py-3 transition-colors"
                style={{
                  borderColor: s.done ? "#bfe5cc" : i === currentSet ? "var(--brand-accent, #e8632a)" : "#e8e5df",
                  background: s.done ? "#f0fbf4" : "#ffffff",
                  boxShadow: i === currentSet ? "0 0 0 3px rgba(232,99,42,0.12)" : undefined,
                }}
              >
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0" style={{ background: s.done ? "#16a34a" : i === currentSet ? "var(--brand-accent, #e8632a)" : "#f3f0eb", color: s.done || i === currentSet ? "#fff" : "#6b6560" }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  {timed ? (
                    running ? (
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-semibold tabular-nums text-gray-900">{clock(setTimer!.paused ?? setTimerLeft)}</span>
                        <button type="button" onClick={toggleSetTimerPause} className="w-10 h-10 rounded-full border flex items-center justify-center bg-white" style={{ borderColor: "#e8e5df" }} aria-label={setTimer!.paused === null ? "Pauzeren" : "Doorgaan"}>
                          {setTimer!.paused === null ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                        <button type="button" onClick={() => setSetTimer(null)} className="text-xs text-gray-500 underline">Stop</button>
                      </div>
                    ) : (
                      <>
                        <InlineNumber value={s.seconds} onChange={(v) => updateSet(ex.id, i, { seconds: v })} suffix="sec" disabled={s.done} ariaLabel={`Seconden set ${i + 1}`} />
                        {!s.done && (
                          <button type="button" onClick={() => startSetTimer(i)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-white" style={{ background: "var(--brand-accent, #e8632a)" }}>
                            <Play size={14} /> Start
                          </button>
                        )}
                      </>
                    )
                  ) : (
                    <>
                      <InlineNumber value={s.reps} onChange={(v) => updateSet(ex.id, i, { reps: v })} suffix="herh." disabled={s.done} ariaLabel={`Herhalingen set ${i + 1}`} />
                      <span className="text-gray-300">×</span>
                      <InlineNumber value={s.weight} onChange={(v) => updateSet(ex.id, i, { weight: v })} suffix="kg" disabled={s.done} placeholder="–" step={0.5} ariaLabel={`Gewicht set ${i + 1}`} />
                    </>
                  )}
                </div>
                <button
                  type="button" onClick={() => toggleSet(i)} aria-pressed={s.done} aria-label={s.done ? `Set ${i + 1} ongedaan maken` : `Set ${i + 1} afvinken`}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors touch-press"
                  style={{ background: s.done ? "#16a34a" : "#ffffff", border: s.done ? "none" : "2px solid #d9d4cc" }}
                >
                  <Check size={22} color={s.done ? "#ffffff" : "#b5afa6"} strokeWidth={2.5} />
                </button>
              </div>
            );
          })}
          <div className="flex items-center gap-4 pt-1">
            <button type="button" onClick={addSet} className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--brand-accent, #e8632a)" }}>
              <Plus size={14} /> Set toevoegen
            </button>
            {st!.sets.length > 1 && !st!.sets[st!.sets.length - 1].done && (
              <button type="button" onClick={removeSet} className="inline-flex items-center gap-1 text-sm text-gray-500">
                <Minus size={14} /> Laatste set weg
              </button>
            )}
          </div>
        </div>

        {nextExercise && (
          <button type="button" onClick={() => go(index + 1)} className="mt-6 w-full flex items-center gap-3 rounded-2xl bg-white border px-4 py-3 text-left" style={{ borderColor: "#e8e5df" }}>
            <span className="text-xs font-medium text-gray-500 shrink-0">Hierna</span>
            <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 truncate">{nextExercise.title}</span>
            <span className="text-xs text-gray-500 shrink-0">{formatPrescription(nextExercise, { withLoad: false })}</span>
            <ChevronRight size={16} className="text-gray-400 shrink-0" />
          </button>
        )}

        {/* Pijn */}
        <div className="mt-7">
          <p className="text-sm font-medium text-gray-700 mb-2">Pijn tijdens deze oefening <span className="text-gray-400 font-normal">(optioneel)</span></p>
          <div className="grid grid-cols-11 gap-1">
            {Array.from({ length: 11 }, (_, n) => {
              const sel = st!.pain === n;
              return (
                <button key={n} type="button" aria-pressed={sel}
                  onClick={() => setStates((prev) => ({ ...prev, [ex.id]: { ...prev[ex.id], pain: sel ? null : n } }))}
                  className="h-10 rounded-lg border text-sm tabular-nums"
                  style={{ borderColor: sel ? "var(--brand-accent, #e8632a)" : "#e8e5df", background: sel ? "var(--brand-accent, #e8632a)" : "#fff", color: sel ? "#fff" : "#4b5563", fontWeight: sel ? 600 : 400 }}>
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rusttimer */}
      {restEndsAt && (
        <div className="fixed left-0 right-0 z-10 px-4" style={{ bottom: "calc(88px + env(safe-area-inset-bottom, 0px))" }}>
          <div className="max-w-2xl mx-auto rounded-3xl px-5 py-4 flex items-center gap-4 shadow-xl" style={{ background: "#1c1c1e", color: "#fff" }}>
            <div className="relative w-14 h-14 shrink-0">
              <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="var(--brand-accent, #e8632a)" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${(restLeft / restTotal) * 100.5} 100.5`} />
              </svg>
              <Timer size={16} className="absolute inset-0 m-auto opacity-70" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-white/60">Rust</p>
              <p className="text-3xl font-semibold tabular-nums leading-none mt-1">{clock(restLeft)}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => changeRestDefault(-15)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }} aria-label="15 seconden korter">−15</button>
              <button type="button" onClick={() => changeRestDefault(15)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }} aria-label="15 seconden langer">+15</button>
              <button type="button" onClick={() => setRestEndsAt(null)} className="h-10 px-3 rounded-full text-sm font-medium" style={{ background: "#ffffff", color: "#1c1c1e" }}>Klaar</button>
            </div>
          </div>
        </div>
      )}

      {/* Navigatie */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white/95 backdrop-blur" style={{ borderColor: "#e8e5df", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="secondary" size="lg" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Vorige oefening">
            <ChevronLeft size={18} />
          </Button>
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 mr-auto">
            <Timer size={13} /> Rust {formatDuration(restDefault)}
            <button type="button" onClick={() => changeRestDefault(-15)} className="px-1.5 rounded border" style={{ borderColor: "#e8e5df" }}>−</button>
            <button type="button" onClick={() => changeRestDefault(15)} className="px-1.5 rounded border" style={{ borderColor: "#e8e5df" }}>+</button>
          </div>
          {isLast ? (
            <Button size="lg" fullWidth onClick={() => { setRestEndsAt(null); setFinished(true); }} className="sm:w-auto sm:flex-none">
              Afronden <Check size={16} />
            </Button>
          ) : (
            <Button size="lg" fullWidth onClick={() => go(index + 1)} variant={allDoneHere ? "primary" : "secondary"} className="sm:w-auto sm:flex-none">
              {allDoneHere ? "Volgende oefening" : "Overslaan"} <ChevronRight size={16} />
            </Button>
          )}
        </div>
      </div>

      {showOverview && (
        <div className="fixed inset-0 z-20 flex items-end sm:items-center justify-center sm:p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setShowOverview(false)}>
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-base font-semibold text-gray-900">Alle oefeningen</p>
              <button type="button" onClick={() => setShowOverview(false)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100" aria-label="Sluiten"><X size={18} /></button>
            </div>
            <ol className="space-y-1.5">
              {exercises.map((e, i) => {
                const d = doneCount(e.id); const total = states[e.id].sets.length; const isCur = i === index;
                return (
                  <li key={e.id}>
                    <button type="button" onClick={() => { setShowOverview(false); go(i); }}
                      className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left border"
                      style={{ borderColor: isCur ? "var(--brand-accent, #e8632a)" : "transparent", background: isCur ? "#fff8f4" : "#faf9f7" }}>
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                        style={{ background: d === total ? "#16a34a" : isCur ? "var(--brand-accent, #e8632a)" : "#ebe7e0", color: d === total || isCur ? "#fff" : "#6b6560" }}>
                        {d === total ? <Check size={14} /> : i + 1}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-gray-900 truncate">{e.title}</span>
                        <span className="block text-xs text-gray-500">{formatPrescription(e, { withLoad: false })}</span>
                      </span>
                      <span className="text-xs text-gray-500 tabular-nums shrink-0">{d}/{total}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}

      {confirmClose && <CloseConfirm onCancel={() => setConfirmClose(false)} onConfirm={() => { clearStore(store); onClose(); }} />}
    </Shell>
  );
}

// ─── Onderdelen ──────────────────────────────────────────────────────────────

function Shell({ title, subtitle, onClose, progress, action, children }: {
  title: string; subtitle?: string; onClose: () => void; progress?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode;
}) {
  // Achtergrond niet laten meescrollen.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="fixed inset-0 z-(--z-modal) flex flex-col" style={{ background: "#f8f7f4" }} role="dialog" aria-modal="true" aria-label={title}>
      <header className="shrink-0 bg-white border-b" style={{ borderColor: "#e8e5df", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={onClose} aria-label="Training sluiten" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 shrink-0">
            <X size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
            {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
          </div>
          {action}
        </div>
        {progress && <div className="max-w-2xl mx-auto px-4 pb-3">{progress}</div>}
      </header>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function CloseConfirm({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-20 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-6">
        <p className="text-base font-semibold text-gray-900">Training stoppen?</p>
        <p className="text-sm text-gray-600 mt-1.5">Je afgevinkte sets worden niet opgeslagen. Wil je ze bewaren, kies dan Afronden bij de laatste oefening.</p>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" fullWidth onClick={onCancel}>Doorgaan</Button>
          <Button variant="danger" fullWidth onClick={onConfirm}>Stoppen</Button>
        </div>
      </div>
    </div>
  );
}

function InlineNumber({ value, onChange, suffix, disabled, placeholder, step = 1, ariaLabel }: {
  value: string; onChange: (v: string) => void; suffix: string; disabled?: boolean; placeholder?: string; step?: number; ariaLabel: string;
}) {
  return (
    <label className="inline-flex items-baseline gap-1">
      <input
        type="number" inputMode="decimal" min={0} step={step} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} disabled={disabled} aria-label={ariaLabel}
        className="w-16 text-xl font-semibold tabular-nums text-center rounded-xl border px-1 py-1.5 focus:outline-none focus:border-[#e8632a] disabled:bg-transparent disabled:border-transparent"
        style={{ borderColor: "#e8e5df" }}
      />
      <span className="text-sm text-gray-500">{suffix}</span>
    </label>
  );
}

function NumberField({ label, value, onChange, step = 1 }: { label: string; value: string; onChange: (v: string) => void; step?: number }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(String(Math.max(0, (Number(value) || 0) - step)))} className="w-10 h-10 rounded-xl border flex items-center justify-center" style={{ borderColor: "#e8e5df" }} aria-label={`${label} omlaag`}><Minus size={14} /></button>
        <input type="number" inputMode="numeric" min={0} value={value} onChange={(e) => onChange(e.target.value)} className="w-full text-center text-lg font-semibold rounded-xl border py-1.5 focus:outline-none" style={{ borderColor: "#e8e5df" }} />
        <button type="button" onClick={() => onChange(String((Number(value) || 0) + step))} className="w-10 h-10 rounded-xl border flex items-center justify-center" style={{ borderColor: "#e8e5df" }} aria-label={`${label} omhoog`}><Plus size={14} /></button>
      </div>
    </label>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full text-base sm:text-sm rounded-xl border px-3 py-2 focus:outline-none" style={{ borderColor: "#e8e5df" }} />
    </label>
  );
}
