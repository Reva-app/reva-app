import { createClient } from "@/lib/supabaseClient";
import {
  dbToTrainingOefening, trainingOefeningToDb,
  dbToTrainingSchema, trainingSchemaToDb,
  dbToTrainingLog, trainingLogToDb,
  dbToDagboekWorkout, dagboekWorkoutToDb,
} from "@/lib/db/mappers";
import type { TrainingOefening, TrainingSchema, TrainingLog, DagboekWorkout } from "@/lib/data";

// ─── Exercises ────────────────────────────────────────────────────────────────

export async function loadTrainingOefeningen(userId: string): Promise<TrainingOefening[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("training_exercises")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) { console.error("loadTrainingOefeningen:", error); return []; }
  return (data ?? []).map(dbToTrainingOefening);
}

export async function upsertTrainingOefening(o: TrainingOefening, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("training_exercises")
    .upsert(trainingOefeningToDb(o, userId), { onConflict: "id" });
  if (error) console.error("upsertTrainingOefening:", error);
}

export async function deleteTrainingOefening(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("training_exercises").delete().eq("id", id);
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export async function loadTrainingSchemas(userId: string): Promise<TrainingSchema[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("training_schemas")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) { console.error("loadTrainingSchemas:", error); return []; }
  return (data ?? []).map(dbToTrainingSchema);
}

export async function upsertTrainingSchema(s: TrainingSchema, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("training_schemas")
    .upsert(trainingSchemaToDb(s, userId), { onConflict: "id" });
  if (error) console.error("upsertTrainingSchema:", error);
}

export async function deleteTrainingSchema(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("training_schemas").delete().eq("id", id);
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export async function loadTrainingLogs(userId: string): Promise<TrainingLog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("training_logs")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error) { console.error("loadTrainingLogs:", error); return []; }
  return (data ?? []).map(dbToTrainingLog);
}

export async function insertTrainingLog(l: TrainingLog, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("training_logs")
    .insert(trainingLogToDb(l, userId));
  if (error) console.error("insertTrainingLog:", error);
}

export async function deleteTrainingLog(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("training_logs").delete().eq("id", id);
}

// ─── Diary workouts ───────────────────────────────────────────────────────────

function logSupabaseError(fn: string, error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return;
  console.error(`[${fn}] Supabase error — message: "${error.message}" | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`);
}

export async function loadDagboekWorkouts(userId: string): Promise<DagboekWorkout[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("diary_workouts")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  if (error) {
    logSupabaseError("loadDagboekWorkouts", error);
    return [];
  }
  return (data ?? []).map(dbToDagboekWorkout);
}

export async function upsertDagboekWorkout(w: DagboekWorkout, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("diary_workouts")
    .upsert(dagboekWorkoutToDb(w, userId), { onConflict: "id" });
  if (error) logSupabaseError("upsertDagboekWorkout", error);
}

export async function deleteDagboekWorkout(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("diary_workouts").delete().eq("id", id);
  if (error) logSupabaseError("deleteDagboekWorkout", error);
}
