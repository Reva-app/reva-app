import { createClient } from "@/lib/supabaseClient";
import { dbToDoel, doelToDb, dbToMijlpaal, mijlpaalToDb } from "@/lib/db/mappers";
import type { Doel, Mijlpaal } from "@/lib/data";

// ─── Goals ────────────────────────────────────────────────────────────────────

export async function loadDoelen(userId: string): Promise<Doel[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) { console.error("loadDoelen:", error); return []; }
  return (data ?? []).map(dbToDoel);
}

export async function upsertDoel(d: Doel, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("goals")
    .upsert(doelToDb(d, userId), { onConflict: "id" });
  if (error) console.error("upsertDoel:", error);
}

export async function deleteDoel(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("goals").delete().eq("id", id);
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export async function loadMijlpalen(userId: string): Promise<Mijlpaal[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("milestones")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  if (error) { console.error("loadMijlpalen:", error); return []; }
  return (data ?? []).map(dbToMijlpaal);
}

export async function upsertMijlpaal(m: Mijlpaal, userId: string, sortOrder: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("milestones")
    .upsert(mijlpaalToDb(m, userId, sortOrder), { onConflict: "id" });
  if (error) console.error("upsertMijlpaal:", error);
}

export async function deleteMijlpaal(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("milestones").delete().eq("id", id);
}

/** Persist a new sort order for an array of milestones */
export async function reorderMijlpalen(milestones: Mijlpaal[], userId: string): Promise<void> {
  const supabase = createClient();
  const rows = milestones.map((m, i) => mijlpaalToDb(m, userId, i));
  const { error } = await supabase
    .from("milestones")
    .upsert(rows, { onConflict: "id" });
  if (error) console.error("reorderMijlpalen:", error);
}
