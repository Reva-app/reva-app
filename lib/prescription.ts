/**
 * Dosering van een oefening leesbaar maken — één plek voor portaal en
 * patiënt-app. Tijdsoefeningen (cardio, rekken, vasthouden) tonen tijd,
 * nooit herhalingen: "15 min", "3 × 30 sec"; krachtoefeningen "3 × 12".
 */

export interface PrescriptionLike {
  prescribedSets: number | null;
  prescribedReps: number | null;
  prescribedDurationSeconds: number | null;
  prescribedLoadText?: string | null;
}

/** 45 → "45 sec", 600 → "10 min", 90 → "1 min 30 sec". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec === 0 ? `${min} min` : `${min} min ${sec} sec`;
}

/** Op tijd (geen herhalingen, wel een duur)? */
export function isTimeBased(p: PrescriptionLike): boolean {
  return !p.prescribedReps && !!p.prescribedDurationSeconds;
}

/** "3 × 12", "3 × 30 sec", "15 min", "3 × 10 · houd 5 sec" — of "" als er niets is. */
export function formatPrescription(p: PrescriptionLike, opts: { withLoad?: boolean } = {}): string {
  const sets = p.prescribedSets && p.prescribedSets > 0 ? p.prescribedSets : null;
  const parts: string[] = [];
  if (p.prescribedReps) {
    parts.push(sets ? `${sets} × ${p.prescribedReps}` : `${p.prescribedReps} herhalingen`);
    if (p.prescribedDurationSeconds) parts.push(`houd ${formatDuration(p.prescribedDurationSeconds)}`);
  } else if (p.prescribedDurationSeconds) {
    parts.push(sets && sets > 1 ? `${sets} × ${formatDuration(p.prescribedDurationSeconds)}` : formatDuration(p.prescribedDurationSeconds));
  } else if (sets) {
    parts.push(`${sets} ${sets === 1 ? "set" : "sets"}`);
  }
  if (opts.withLoad !== false && p.prescribedLoadText?.trim()) parts.push(p.prescribedLoadText.trim());
  return parts.join(" · ");
}

/**
 * Vrije dosering van een eigen thuisoefening ("3×15 herh.", "2 x 30 sec",
 * "20 minuten", "10 herhalingen") omzetten naar sets/herhalingen/tijd.
 * Lukt het niet, dan blijft het één set om af te vinken.
 */
export function parseFreeDose(repetitions: string, loadOrTime = ""): PrescriptionLike {
  const text = `${repetitions} ${loadOrTime}`.toLowerCase().replace(",", ".");
  const out: PrescriptionLike = { prescribedSets: null, prescribedReps: null, prescribedDurationSeconds: null };
  const setsX = /(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(sec|seconden|s\b|min|minuten|m\b)?/.exec(text);
  if (setsX) {
    out.prescribedSets = Number(setsX[1]);
    const n = Number(setsX[2]);
    const unit = setsX[3] ?? "";
    if (unit.startsWith("s")) out.prescribedDurationSeconds = Math.round(n);
    else if (unit.startsWith("m")) out.prescribedDurationSeconds = Math.round(n * 60);
    else out.prescribedReps = Math.round(n);
    return out;
  }
  const time = /(\d+(?:\.\d+)?)\s*(sec|seconden|min|minuten|uur)/.exec(text);
  if (time) {
    const n = Number(time[1]);
    out.prescribedDurationSeconds = Math.round(time[2].startsWith("s") ? n : time[2] === "uur" ? n * 3600 : n * 60);
    return out;
  }
  const reps = /(\d+)\s*(herh|keer)/.exec(text);
  if (reps) out.prescribedReps = Number(reps[1]);
  return out;
}
