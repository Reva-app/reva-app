import { createClient } from "@/lib/supabaseClient";
import { dbToMedicatieLog, medicatieLogToDb, dbToMedicatieSchema, medicatieSchemaToDb } from "@/lib/db/mappers";
import type { MedicatieLog, MedicatieSchema } from "@/lib/data";

// ─── Logs ─────────────────────────────────────────────────────────────────────

export async function loadMedicatieLogs(userId: string): Promise<MedicatieLog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("medication_logs")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error) { console.error("loadMedicatieLogs:", error); return []; }
  return (data ?? []).map(dbToMedicatieLog);
}

export async function upsertMedicatieLog(m: MedicatieLog, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("medication_logs")
    .upsert(medicatieLogToDb(m, userId), { onConflict: "id" });
  if (error) console.error("upsertMedicatieLog:", error);
}

export async function deleteMedicatieLog(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("medication_logs").delete().eq("id", id);
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export async function loadMedicatieSchemas(userId: string): Promise<MedicatieSchema[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("medication_schedules")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) { console.error("loadMedicatieSchemas:", error); return []; }
  return (data ?? []).map(dbToMedicatieSchema);
}

export async function upsertMedicatieSchema(s: MedicatieSchema, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("medication_schedules")
    .upsert(medicatieSchemaToDb(s, userId), { onConflict: "id" });
  if (error) console.error("upsertMedicatieSchema:", error);
}

export async function deleteMedicatieSchema(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("medication_schedules").delete().eq("id", id);
}
