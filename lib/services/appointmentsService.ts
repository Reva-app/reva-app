import { createClient } from "@/lib/supabaseClient";
import { dbToAppointment, appointmentToDb } from "@/lib/db/mappers";
import type { Appointment } from "@/lib/data";

function logErr(fn: string, error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return;
  console.error(`[${fn}] Supabase error — message: "${error.message}" | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`);
}

export async function loadAppointments(userId: string): Promise<Appointment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (error) { logErr("loadAppointments", error); return []; }
  return (data ?? []).map(dbToAppointment);
}

export async function upsertAppointment(apt: Appointment, userId: string): Promise<void> {
  const supabase = createClient();
  const row = appointmentToDb(apt, userId);
  const { error } = await supabase
    .from("appointments")
    .upsert(row, { onConflict: "id" });
  if (error) logErr("upsertAppointment", error);
}

export async function deleteAppointment(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) logErr("deleteAppointment", error);
}
