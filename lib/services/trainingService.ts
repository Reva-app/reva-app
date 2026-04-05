import { createClient } from "@/lib/supabaseClient";
import {
  dbToTrainingOefening, trainingOefeningToDb,
  dbToTrainingSchema, trainingSchemaToDb,
  dbToTrainingLog, trainingLogToDb,
  dbToDagboekWorkout, dagboekWorkoutToDb,
} from "@/lib/db/mappers";
import type { TrainingOefening, TrainingSchema, TrainingLog, DagboekWorkout } from "@/lib/data";

function logErr(fn: string, error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return;
  console.error(
    `[${fn}] Supabase error — message: "${error.message}" | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`
  );
}

// ─── Exercises ────────────────────────────────────────────────────────────────

export async function loadTrainingOefeningen(userId: string): Promise<TrainingOefening[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("training_exercises")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) { logErr("loadTrainingOefeningen", error); return []; }
  console.info("[loadTrainingOefeningen] loaded", data?.length ?? 0, "rows for uid:", userId);
  return (data ?? []).map(dbToTrainingOefening);
}

export async function upsertTrainingOefening(o: TrainingOefening, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const payload = trainingOefeningToDb(o, userId);
  console.info("[upsertTrainingOefening] uid:", userId, "id:", o.id, "title:", o.title, "payload:", payload);

  const { data, error } = await supabase
    .from("training_exercises")
    .upsert(payload, { onConflict: "id" })
    .select();

  if (error) {
    logErr("upsertTrainingOefening", error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    const msg = "upsertTrainingOefening: 0 rows affected";
    console.error("[upsertTrainingOefening]", msg, "— uid:", userId, "id:", o.id);
    return { error: msg };
  }
  console.info("[upsertTrainingOefening] saved OK, rows:", data.length);
  return { error: null };
}

export async function deleteTrainingOefening(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("training_exercises").delete().eq("id", id);
  if (error) logErr("deleteTrainingOefening", error);
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export async function loadTrainingSchemas(userId: string): Promise<TrainingSchema[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("training_schemas")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) { logErr("loadTrainingSchemas", error); return []; }
  console.info("[loadTrainingSchemas] loaded", data?.length ?? 0, "rows for uid:", userId);
  return (data ?? []).map(dbToTrainingSchema);
}

export async function upsertTrainingSchema(s: TrainingSchema, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const payload = trainingSchemaToDb(s, userId);
  console.info("[upsertTrainingSchema] uid:", userId, "id:", s.id, "title:", s.title, "exerciseIds:", s.exerciseIds, "payload:", payload);

  const { data, error } = await supabase
    .from("training_schemas")
    .upsert(payload, { onConflict: "id" })
    .select();

  if (error) {
    logErr("upsertTrainingSchema", error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    const msg = "upsertTrainingSchema: 0 rows affected";
    console.error("[upsertTrainingSchema]", msg, "— uid:", userId, "id:", s.id);
    return { error: msg };
  }
  console.info("[upsertTrainingSchema] saved OK, rows:", data.length, "result:", data);
  return { error: null };
}

export async function deleteTrainingSchema(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("training_schemas").delete().eq("id", id);
  if (error) logErr("deleteTrainingSchema", error);
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export async function loadTrainingLogs(userId: string): Promise<TrainingLog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("training_logs")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error) { logErr("loadTrainingLogs", error); return []; }
  console.info("[loadTrainingLogs] loaded", data?.length ?? 0, "rows for uid:", userId);
  return (data ?? []).map(dbToTrainingLog);
}

export async function insertTrainingLog(l: TrainingLog, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const payload = trainingLogToDb(l, userId);
  console.info("[insertTrainingLog] uid:", userId, "id:", l.id, "date:", l.date, "payload:", payload);

  const { data, error } = await supabase
    .from("training_logs")
    .insert(payload)
    .select();

  if (error) {
    logErr("insertTrainingLog", error);
    return { error: error.message };
  }
  console.info("[insertTrainingLog] saved OK, rows:", data?.length ?? 0);
  return { error: null };
}

export async function deleteTrainingLog(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("training_logs").delete().eq("id", id);
  if (error) logErr("deleteTrainingLog", error);
}

// ─── Diary workouts ───────────────────────────────────────────────────────────

export async function loadDagboekWorkouts(userId: string): Promise<DagboekWorkout[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("diary_workouts")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  if (error) { logErr("loadDagboekWorkouts", error); return []; }
  console.info("[loadDagboekWorkouts] loaded", data?.length ?? 0, "rows for uid:", userId);
  return (data ?? []).map(dbToDagboekWorkout);
}

export async function upsertDagboekWorkout(w: DagboekWorkout, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const payload = dagboekWorkoutToDb(w, userId);
  console.info("[upsertDagboekWorkout] uid:", userId, "id:", w.id, "date:", w.date, "schemaId:", w.schemaId, "payload:", payload);

  const { data, error } = await supabase
    .from("diary_workouts")
    .upsert(payload, { onConflict: "id" })
    .select();

  if (error) {
    logErr("upsertDagboekWorkout", error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    const msg = "upsertDagboekWorkout: 0 rows affected";
    console.error("[upsertDagboekWorkout]", msg, "— uid:", userId, "id:", w.id);
    return { error: msg };
  }
  console.info("[upsertDagboekWorkout] saved OK, rows:", data.length);
  return { error: null };
}

export async function deleteDagboekWorkout(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("diary_workouts").delete().eq("id", id);
  if (error) logErr("deleteDagboekWorkout", error);
}
