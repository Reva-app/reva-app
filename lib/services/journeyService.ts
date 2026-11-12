/**
 * Totalen voor "Jouw traject" in de patiëntapp: alles wat iemand in het
 * hele herstel al gedaan heeft (trainingen, herhalingen, minuten).
 */
import { createClient } from "@/lib/supabaseClient";

export interface TrainingTotals {
  sessions: number;
  /** Datum van elke training (oud → nieuw), voor tijdlijn-mijlpalen. */
  sessionDates: string[];
  reps: number;
  minutes: number;
}

export async function loadTrainingTotals(patientId: string): Promise<TrainingTotals> {
  const supabase = createClient();
  const [sRes, eRes] = await Promise.all([
    supabase.from("patient_protocol_session_logs").select("date").eq("patient_id", patientId).order("date").limit(5000),
    supabase.from("patient_protocol_exercise_logs").select("sets, reps, duration_seconds").eq("patient_id", patientId).limit(20000),
  ]);
  const sessionDates = (sRes.data ?? []).map((r) => r.date as string);
  let reps = 0, seconds = 0;
  for (const e of eRes.data ?? []) {
    const sets = (e.sets as number | null) ?? 1;
    if (e.reps) reps += sets * (e.reps as number);
    if (e.duration_seconds) seconds += sets * (e.duration_seconds as number);
  }
  return { sessions: sessionDates.length, sessionDates, reps, minutes: Math.round(seconds / 60) };
}
