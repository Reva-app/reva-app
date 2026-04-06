import { createClient } from "@/lib/supabaseClient";
import {
  dbToTrainingOefening, trainingOefeningToDb,
  dbToTrainingSchema, trainingSchemaToDb,
  dbToTrainingLog, trainingLogToDb,
} from "@/lib/db/mappers";
import type { TrainingOefening, TrainingSchema, TrainingLog } from "@/lib/data";

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

async function syncTrainingSchemaExercises(schemaId: string, exerciseIds: string[]): Promise<void> {
  const supabase = createClient();

  const { error: deleteError } = await supabase
    .from("training_schema_exercises")
    .delete()
    .eq("schema_id", schemaId);
  if (deleteError) { logErr("syncTrainingSchemaExercises/delete", deleteError); return; }

  if (exerciseIds.length === 0) return;

  const rows = exerciseIds.map((exercise_id, sort_order) => ({ schema_id: schemaId, exercise_id, sort_order }));
  const { error: insertError } = await supabase
    .from("training_schema_exercises")
    .insert(rows);
  if (insertError) logErr("syncTrainingSchemaExercises/insert", insertError);
}

export async function loadTrainingSchemas(userId: string): Promise<TrainingSchema[]> {
  const supabase = createClient();

  const [{ data: schemaRows, error: schemaError }, { data: linkRows, error: linkError }] = await Promise.all([
    supabase.from("training_schemas").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("training_schema_exercises").select("schema_id, exercise_id, sort_order"),
  ]);

  if (schemaError) { logErr("loadTrainingSchemas/schemas", schemaError); return []; }
  if (linkError) { logErr("loadTrainingSchemas/links", linkError); return []; }

  console.info("[loadTrainingSchemas] loaded", schemaRows?.length ?? 0, "schemas, ", linkRows?.length ?? 0, "links for uid:", userId);

  const links = linkRows ?? [];
  return (schemaRows ?? []).map((row) => {
    const schema = dbToTrainingSchema(row);
    schema.exerciseIds = links
      .filter((l) => l.schema_id === schema.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((l) => l.exercise_id);
    return schema;
  });
}

/**
 * INSERT for new schemas. Uses explicit insert (not upsert) to avoid
 * the silent-failure issue with JSONB columns in PostgREST upsert on conflict.
 */
export async function insertTrainingSchema(s: TrainingSchema, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const payload = trainingSchemaToDb(s, userId);
  console.info("[insertTrainingSchema] uid:", userId, "id:", s.id, "title:", s.title, "exerciseIds:", s.exerciseIds, "payload:", payload);

  const { data, error } = await supabase
    .from("training_schemas")
    .insert(payload)
    .select();

  if (error) {
    logErr("insertTrainingSchema", error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    const msg = "insertTrainingSchema: 0 rows returned";
    console.error("[insertTrainingSchema]", msg, "— uid:", userId, "id:", s.id);
    return { error: msg };
  }

  await syncTrainingSchemaExercises(s.id, s.exerciseIds);
  console.info("[insertTrainingSchema] saved OK, rows:", data.length, "result:", data);
  return { error: null };
}

/**
 * UPDATE for existing schemas. Uses explicit update (not upsert) to avoid
 * the silent-failure issue with JSONB columns in PostgREST upsert on conflict.
 */
export async function updateTrainingSchemaRecord(s: TrainingSchema, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  // Omit id and user_id from the update payload (they are the WHERE keys, not fields to update).
  const { id: _id, user_id: _uid, ...fields } = trainingSchemaToDb(s, userId);
  console.info("[updateTrainingSchemaRecord] uid:", userId, "id:", s.id, "exerciseIds:", s.exerciseIds, "fields:", fields);

  const { data, error } = await supabase
    .from("training_schemas")
    .update(fields)
    .eq("id", s.id)
    .eq("user_id", userId)
    .select();

  if (error) {
    logErr("updateTrainingSchemaRecord", error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    const msg = "updateTrainingSchemaRecord: geen rij gevonden (id of user_id klopt niet)";
    console.error("[updateTrainingSchemaRecord]", msg, "— uid:", userId, "id:", s.id);
    return { error: msg };
  }

  await syncTrainingSchemaExercises(s.id, s.exerciseIds);
  console.info("[updateTrainingSchemaRecord] saved OK, rows:", data.length, "result:", data);
  return { error: null };
}

/**
 * Upsert kept for the localStorage-migration path only.
 * Use insertTrainingSchema / updateTrainingSchemaRecord for live UI writes.
 */
export async function upsertTrainingSchema(s: TrainingSchema, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const payload = trainingSchemaToDb(s, userId);
  console.info("[upsertTrainingSchema/migration] uid:", userId, "id:", s.id, "payload:", payload);

  const { data, error } = await supabase
    .from("training_schemas")
    .upsert(payload, { onConflict: "id" })
    .select();

  if (error) {
    logErr("upsertTrainingSchema", error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    console.warn("[upsertTrainingSchema/migration] 0 rows — retrying via insert then update");
    const insertResult = await insertTrainingSchema(s, userId);
    if (insertResult.error) {
      // Row likely exists already; fall back to update
      return updateTrainingSchemaRecord(s, userId);
    }
    return insertResult;
  }

  await syncTrainingSchemaExercises(s.id, s.exerciseIds);
  console.info("[upsertTrainingSchema/migration] saved OK, rows:", data.length);
  return { error: null };
}

export async function deleteTrainingSchema(id: string): Promise<void> {
  const supabase = createClient();
  const { error: linkError } = await supabase.from("training_schema_exercises").delete().eq("schema_id", id);
  if (linkError) logErr("deleteTrainingSchema/links", linkError);
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

export async function updateTrainingLogRecord(l: TrainingLog, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { id: _id, user_id: _uid, ...fields } = trainingLogToDb(l, userId);
  console.info("[updateTrainingLogRecord] uid:", userId, "id:", l.id, "date:", l.date, "fields:", fields);

  const { data, error } = await supabase
    .from("training_logs")
    .update(fields)
    .eq("id", l.id)
    .eq("user_id", userId)
    .select();

  if (error) {
    logErr("updateTrainingLogRecord", error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    const msg = "updateTrainingLogRecord: geen rij gevonden (id of user_id klopt niet)";
    console.error("[updateTrainingLogRecord]", msg, "— uid:", userId, "id:", l.id);
    return { error: msg };
  }
  console.info("[updateTrainingLogRecord] saved OK, rows:", data.length);
  return { error: null };
}

export async function deleteTrainingLog(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("training_logs").delete().eq("id", id);
  if (error) logErr("deleteTrainingLog", error);
}

// diary_workouts table is kept in the DB schema for backwards compat but is no longer written to.
// All dated/planned/completed workout entries use training_logs as the single source of truth.
// The store.tsx dagboekWorkouts value is derived from trainingLogs (DagboekWorkout = TrainingLog).
