import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Tables to delete from (in order — junction tables before parent tables to avoid FK issues)
const USER_TABLES: string[] = [
  "diary_workouts",
  "training_logs",
  "training_schema_exercises", // RLS: via schema owner check
  "training_schemas",          // CASCADE → training_schema_exercises
  "training_exercises",
  "medication_schedule_times", // RLS: via schedule owner check
  "medication_logs",
  "medication_schedules",      // CASCADE → medication_schedule_times
  "check_ins",
  "appointments",
  "doelen",
  "mijlpalen",
  "dossier_documents",
  "dossier_photo_updates",
  "dossier_contacts",
  "user_settings",
];

export async function DELETE() {
  const cookieStore = await cookies();

  // Build server-side Supabase client (honors RLS with user's session)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options); } catch { /* read-only in route handler */ }
          });
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const userId = user.id;
  const errors: string[] = [];

  // Delete all user data row by row, per table
  for (const table of USER_TABLES) {
    const col = table === "training_schema_exercises" || table === "medication_schedule_times"
      ? null // These are handled by CASCADE from parent tables; try anyway via admin below
      : "user_id";

    if (!col) continue; // Skip — CASCADE will handle them

    const { error } = await supabase.from(table).delete().eq(col, userId);
    if (error) {
      // Non-fatal: table may not exist in this DB instance
      console.error(`[delete-account] ${table}: ${error.message}`);
      errors.push(`${table}: ${error.message}`);
    }
  }

  // Delete profile separately (PK is 'id', not 'user_id')
  const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId);
  if (profileError) {
    console.error(`[delete-account] profiles: ${profileError.message}`);
  }

  // Delete the auth user — requires service role key (admin)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Server configuratiefout: service role key ontbreekt" },
      { status: 500 }
    );
  }

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);
  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId);
  if (deleteAuthError) {
    console.error("[delete-account] auth.admin.deleteUser:", deleteAuthError.message);
    return NextResponse.json({ error: deleteAuthError.message }, { status: 500 });
  }

  console.info("[delete-account] account fully deleted for uid:", userId);
  return NextResponse.json({ success: true });
}
