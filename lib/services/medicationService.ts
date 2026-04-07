import { createClient } from "@/lib/supabaseClient";
import {
  dbToMedicatieLog, medicatieLogToDb,
  dbToMedicatieSchema, medicatieSchemaToDb,
} from "@/lib/db/mappers";
import type { MedicatieLog, MedicatieSchema } from "@/lib/data";

function logErr(fn: string, error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return;
  console.error(
    `[${fn}] Supabase error — message: "${error.message}" | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`
  );
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export async function loadMedicatieLogs(userId: string): Promise<MedicatieLog[]> {
  const supabase = createClient();
  console.info("[loadMedicatieLogs] uid:", userId);
  const { data, error } = await supabase
    .from("medication_logs")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error) { logErr("loadMedicatieLogs", error); return []; }
  console.info("[loadMedicatieLogs] loaded", data?.length ?? 0, "rows for uid:", userId);
  return (data ?? []).map(dbToMedicatieLog);
}

export async function insertMedicatieLog(m: MedicatieLog, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const payload = medicatieLogToDb(m, userId);
  console.info("[insertMedicatieLog] uid:", userId, "id:", m.id, "naam:", m.naam, "payload:", payload);

  const { data, error } = await supabase
    .from("medication_logs")
    .insert(payload)
    .select();

  if (error) { logErr("insertMedicatieLog", error); return { error: error.message }; }
  if (!data || data.length === 0) {
    const msg = "insertMedicatieLog: 0 rows returned";
    console.error("[insertMedicatieLog]", msg, "— uid:", userId, "id:", m.id);
    return { error: msg };
  }
  console.info("[insertMedicatieLog] saved OK, rows:", data.length);
  return { error: null };
}

export async function updateMedicatieLogRecord(m: MedicatieLog, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { id: _id, user_id: _uid, ...fields } = medicatieLogToDb(m, userId);
  console.info("[updateMedicatieLogRecord] uid:", userId, "id:", m.id, "fields:", fields);

  const { data, error } = await supabase
    .from("medication_logs")
    .update(fields)
    .eq("id", m.id)
    .eq("user_id", userId)
    .select();

  if (error) { logErr("updateMedicatieLogRecord", error); return { error: error.message }; }
  if (!data || data.length === 0) {
    const msg = "updateMedicatieLogRecord: geen rij gevonden";
    console.error("[updateMedicatieLogRecord]", msg, "— uid:", userId, "id:", m.id);
    return { error: msg };
  }
  console.info("[updateMedicatieLogRecord] saved OK, rows:", data.length);
  return { error: null };
}

export async function upsertMedicatieLog(m: MedicatieLog, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const payload = medicatieLogToDb(m, userId);
  console.info("[upsertMedicatieLog/migration] uid:", userId, "id:", m.id, "payload:", payload);

  const { data, error } = await supabase
    .from("medication_logs")
    .upsert(payload, { onConflict: "id" })
    .select();

  if (error) { logErr("upsertMedicatieLog", error); return { error: error.message }; }
  if (!data || data.length === 0) {
    const insertResult = await insertMedicatieLog(m, userId);
    if (insertResult.error) return updateMedicatieLogRecord(m, userId);
    return insertResult;
  }
  console.info("[upsertMedicatieLog/migration] saved OK, rows:", data.length);
  return { error: null };
}

export async function deleteMedicatieLog(id: string): Promise<void> {
  const supabase = createClient();
  console.info("[deleteMedicatieLog] id:", id);
  const { error } = await supabase.from("medication_logs").delete().eq("id", id);
  if (error) logErr("deleteMedicatieLog", error);
  else console.info("[deleteMedicatieLog] deleted OK, id:", id);
}

// ─── Schedule times sync ──────────────────────────────────────────────────────

async function syncMedicationScheduleTimes(scheduleId: string, times: string[]): Promise<void> {
  const supabase = createClient();

  const { error: deleteError } = await supabase
    .from("medication_schedule_times")
    .delete()
    .eq("schedule_id", scheduleId);
  if (deleteError) {
    // Non-fatal: table may not exist yet in this database instance
    logErr("syncMedicationScheduleTimes/delete (non-fatal)", deleteError);
    return;
  }

  if (times.length === 0) return;

  const rows = times.map((time, sort_order) => ({ schedule_id: scheduleId, time, sort_order }));
  const { error: insertError } = await supabase
    .from("medication_schedule_times")
    .insert(rows);
  if (insertError) logErr("syncMedicationScheduleTimes/insert (non-fatal)", insertError);
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export async function loadMedicatieSchemas(userId: string): Promise<MedicatieSchema[]> {
  const supabase = createClient();
  console.info("[loadMedicatieSchemas] uid:", userId);

  const [{ data: schemaRows, error: schemaError }, { data: timeRows, error: timeError }] = await Promise.all([
    supabase.from("medication_schedules").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("medication_schedule_times").select("schedule_id, time, sort_order"),
  ]);

  if (schemaError) { logErr("loadMedicatieSchemas/schedules", schemaError); return []; }
  // Times table may not exist yet — log but continue with empty times array
  if (timeError) { logErr("loadMedicatieSchemas/times (non-fatal)", timeError); }

  console.info("[loadMedicatieSchemas] loaded", schemaRows?.length ?? 0, "schedules,", timeRows?.length ?? 0, "times for uid:", userId);

  const times = timeRows ?? [];
  return (schemaRows ?? []).map((row) => {
    const schema = dbToMedicatieSchema(row);
    schema.tijden = times
      .filter((t) => t.schedule_id === schema.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((t) => t.time);
    return schema;
  });
}

export async function insertMedicatieSchema(s: MedicatieSchema, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const payload = medicatieSchemaToDb(s, userId);
  console.info("[insertMedicatieSchema] uid:", userId, "id:", s.id, "naam:", s.naam, "tijden:", s.tijden, "payload:", payload);

  const { data, error } = await supabase
    .from("medication_schedules")
    .insert(payload)
    .select();

  if (error) {
    // If columns are missing (schema mismatch), retry with minimal payload
    if (error.message?.includes("column") && error.message?.includes("schema cache")) {
      console.warn("[insertMedicatieSchema] column missing — retrying with minimal payload");
      const minimal = { id: s.id, user_id: userId, medication_name: s.naam };
      const { data: d2, error: e2 } = await supabase.from("medication_schedules").insert(minimal).select();
      if (e2) { logErr("insertMedicatieSchema/minimal", e2); return { error: e2.message }; }
      if (!d2 || d2.length === 0) return { error: "insertMedicatieSchema/minimal: 0 rows" };
      await syncMedicationScheduleTimes(s.id, s.tijden);
      console.info("[insertMedicatieSchema] saved OK (minimal), rows:", d2.length);
      return { error: null };
    }
    logErr("insertMedicatieSchema", error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    const msg = "insertMedicatieSchema: 0 rows returned";
    console.error("[insertMedicatieSchema]", msg, "— uid:", userId, "id:", s.id);
    return { error: msg };
  }

  await syncMedicationScheduleTimes(s.id, s.tijden);
  console.info("[insertMedicatieSchema] saved OK, rows:", data.length);
  return { error: null };
}

export async function updateMedicatieSchemaRecord(s: MedicatieSchema, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { id: _id, user_id: _uid, ...fields } = medicatieSchemaToDb(s, userId);
  console.info("[updateMedicatieSchemaRecord] uid:", userId, "id:", s.id, "naam:", s.naam, "tijden:", s.tijden, "fields:", fields);

  const { data, error } = await supabase
    .from("medication_schedules")
    .update(fields)
    .eq("id", s.id)
    .eq("user_id", userId)
    .select();

  if (error) { logErr("updateMedicatieSchemaRecord", error); return { error: error.message }; }
  if (!data || data.length === 0) {
    const msg = "updateMedicatieSchemaRecord: geen rij gevonden";
    console.error("[updateMedicatieSchemaRecord]", msg, "— uid:", userId, "id:", s.id);
    return { error: msg };
  }

  await syncMedicationScheduleTimes(s.id, s.tijden);
  console.info("[updateMedicatieSchemaRecord] saved OK, rows:", data.length);
  return { error: null };
}

export async function upsertMedicatieSchema(s: MedicatieSchema, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const payload = medicatieSchemaToDb(s, userId);
  console.info("[upsertMedicatieSchema/migration] uid:", userId, "id:", s.id, "payload:", payload);

  const { data, error } = await supabase
    .from("medication_schedules")
    .upsert(payload, { onConflict: "id" })
    .select();

  if (error) { logErr("upsertMedicatieSchema", error); return { error: error.message }; }
  if (!data || data.length === 0) {
    console.warn("[upsertMedicatieSchema/migration] 0 rows — retrying via insert then update");
    const insertResult = await insertMedicatieSchema(s, userId);
    if (insertResult.error) return updateMedicatieSchemaRecord(s, userId);
    return insertResult;
  }

  await syncMedicationScheduleTimes(s.id, s.tijden);
  console.info("[upsertMedicatieSchema/migration] saved OK, rows:", data.length);
  return { error: null };
}

export async function deleteMedicatieSchema(id: string): Promise<void> {
  const supabase = createClient();
  console.info("[deleteMedicatieSchema] id:", id);
  const { error: timesError } = await supabase.from("medication_schedule_times").delete().eq("schedule_id", id);
  if (timesError) logErr("deleteMedicatieSchema/times", timesError);
  const { error } = await supabase.from("medication_schedules").delete().eq("id", id);
  if (error) logErr("deleteMedicatieSchema", error);
  else console.info("[deleteMedicatieSchema] deleted OK, id:", id);
}
