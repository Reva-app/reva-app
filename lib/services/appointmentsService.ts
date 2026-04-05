import { createClient } from "@/lib/supabaseClient";
import { dbToAppointment, appointmentToDb } from "@/lib/db/mappers";
import type { Appointment } from "@/lib/data";

export async function loadAppointments(userId: string): Promise<Appointment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (error) { console.error("loadAppointments:", error); return []; }
  return (data ?? []).map(dbToAppointment);
}

export async function upsertAppointment(apt: Appointment, userId: string): Promise<void> {
  const supabase = createClient();
  const row = appointmentToDb(apt, userId);
  const { error } = await supabase
    .from("appointments")
    .upsert(row, { onConflict: "id" });
  if (error) console.error("upsertAppointment:", error);
}

export async function deleteAppointment(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) console.error("deleteAppointment:", error);
}
