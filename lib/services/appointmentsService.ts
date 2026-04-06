import { createClient } from "@/lib/supabaseClient";
import { dbToAppointment, appointmentToDb } from "@/lib/db/mappers";
import type { Appointment } from "@/lib/data";

function logErr(fn: string, error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return;
  console.error(
    `[${fn}] Supabase error — message: "${error.message}" | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`
  );
}

export async function loadAppointments(userId: string): Promise<Appointment[]> {
  const supabase = createClient();
  console.info("[loadAppointments] uid:", userId);
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (error) { logErr("loadAppointments", error); return []; }
  console.info("[loadAppointments] loaded", data?.length ?? 0, "rows for uid:", userId);
  return (data ?? []).map(dbToAppointment);
}

/**
 * INSERT for new appointments.
 */
export async function insertAppointment(apt: Appointment, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const payload = appointmentToDb(apt, userId);
  console.info("[insertAppointment] uid:", userId, "id:", apt.id, "title:", apt.title, "payload:", payload);

  const { data, error } = await supabase
    .from("appointments")
    .insert(payload)
    .select();

  if (error) {
    logErr("insertAppointment", error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    const msg = "insertAppointment: 0 rows returned";
    console.error("[insertAppointment]", msg, "— uid:", userId, "id:", apt.id);
    return { error: msg };
  }
  console.info("[insertAppointment] saved OK, rows:", data.length, "result:", data);
  return { error: null };
}

/**
 * UPDATE for existing appointments.
 */
export async function updateAppointmentRecord(apt: Appointment, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { id: _id, user_id: _uid, ...fields } = appointmentToDb(apt, userId);
  console.info("[updateAppointmentRecord] uid:", userId, "id:", apt.id, "title:", apt.title, "fields:", fields);

  const { data, error } = await supabase
    .from("appointments")
    .update(fields)
    .eq("id", apt.id)
    .eq("user_id", userId)
    .select();

  if (error) {
    logErr("updateAppointmentRecord", error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    const msg = "updateAppointmentRecord: geen rij gevonden (id of user_id klopt niet)";
    console.error("[updateAppointmentRecord]", msg, "— uid:", userId, "id:", apt.id);
    return { error: msg };
  }
  console.info("[updateAppointmentRecord] saved OK, rows:", data.length, "result:", data);
  return { error: null };
}

/**
 * Upsert kept for the localStorage-migration path only.
 */
export async function upsertAppointment(apt: Appointment, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const payload = appointmentToDb(apt, userId);
  console.info("[upsertAppointment/migration] uid:", userId, "id:", apt.id, "payload:", payload);

  const { data, error } = await supabase
    .from("appointments")
    .upsert(payload, { onConflict: "id" })
    .select();

  if (error) {
    logErr("upsertAppointment", error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    console.warn("[upsertAppointment/migration] 0 rows — retrying via insert then update");
    const insertResult = await insertAppointment(apt, userId);
    if (insertResult.error) {
      return updateAppointmentRecord(apt, userId);
    }
    return insertResult;
  }
  console.info("[upsertAppointment/migration] saved OK, rows:", data.length);
  return { error: null };
}

export async function deleteAppointment(id: string): Promise<void> {
  const supabase = createClient();
  console.info("[deleteAppointment] id:", id);
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) logErr("deleteAppointment", error);
  else console.info("[deleteAppointment] deleted OK, id:", id);
}
