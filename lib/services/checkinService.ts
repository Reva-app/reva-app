import { createClient } from "@/lib/supabaseClient";
import { dbToCheckIn, checkInToDb } from "@/lib/db/mappers";
import type { CheckIn } from "@/lib/data";

export async function loadCheckIns(userId: string): Promise<CheckIn[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("checkins")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error) { console.error("loadCheckIns:", error); return []; }
  return (data ?? []).map(dbToCheckIn);
}

export async function upsertCheckIn(ci: CheckIn, userId: string): Promise<void> {
  const supabase = createClient();
  const row = checkInToDb(ci, userId);
  const { error } = await supabase
    .from("checkins")
    .upsert(row, { onConflict: "user_id,date" });
  if (error) console.error("upsertCheckIn:", error);
}

export async function deleteCheckIn(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("checkins").delete().eq("id", id);
  if (error) console.error("deleteCheckIn:", error);
}
