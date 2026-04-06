import { createClient } from "@/lib/supabaseClient";

function logErr(fn: string, error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return;
  console.error(
    `[${fn}] Supabase error — message: "${error.message}" | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`
  );
}

export async function loadNotificationState(userId: string): Promise<{ readIds: string[]; loggedIds: string[] }> {
  const supabase = createClient();
  console.info("[loadNotificationState] uid:", userId);

  const { data, error } = await supabase
    .from("notification_states")
    .select("read_ids, logged_ids")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) { logErr("loadNotificationState", error); return { readIds: [], loggedIds: [] }; }
  console.info("[loadNotificationState] loaded for uid:", userId, "readIds:", data?.read_ids?.length ?? 0, "loggedIds:", data?.logged_ids?.length ?? 0);
  return {
    readIds: data?.read_ids ?? [],
    loggedIds: data?.logged_ids ?? [],
  };
}

export async function saveNotificationState(userId: string, readIds: string[], loggedIds: string[]): Promise<void> {
  const supabase = createClient();
  console.info("[saveNotificationState] uid:", userId, "readIds:", readIds.length, "loggedIds:", loggedIds.length);

  const { error } = await supabase
    .from("notification_states")
    .upsert(
      { user_id: userId, read_ids: readIds, logged_ids: loggedIds, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (error) logErr("saveNotificationState", error);
  else console.info("[saveNotificationState] saved OK for uid:", userId);
}
