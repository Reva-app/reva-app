import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Tables to delete from (in order — junction tables before parent tables to avoid FK issues).
// Names must match supabase/schema.sql exactly — a mismatch here silently skips that table.
const USER_TABLES: string[] = [
  "diary_workouts",
  "training_logs",
  "training_schema_exercises", // RLS: via schema owner check
  "training_schemas",          // CASCADE → training_schema_exercises
  "training_exercises",
  "medication_schedule_times", // RLS: via schedule owner check
  "medication_logs",
  "medication_schedules",      // CASCADE → medication_schedule_times
  "checkins",
  "appointments",
  "goals",
  "milestones",
  "dossier_documents",
  "dossier_photo_updates",
  "dossier_contacts",
  "push_tokens",
  "notification_states",
  "settings",
];

const STORAGE_BUCKETS = ["dossier-photos", "dossier-documents"] as const;

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

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Server configuratiefout: service role key ontbreekt" },
      { status: 500 }
    );
  }
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);

  // Delete all user data row by row, per table
  for (const table of USER_TABLES) {
    const col = table === "training_schema_exercises" || table === "medication_schedule_times"
      ? null // Handled by CASCADE from parent tables (training_schemas / medication_schedules)
      : "user_id";

    if (!col) continue;

    const { error } = await supabase.from(table).delete().eq(col, userId);
    if (error) {
      console.error(`[delete-account] ${table}: ${error.message}`);
      errors.push(`${table}: ${error.message}`);
    }
  }

  // Delete profile separately (PK is 'id', not 'user_id')
  const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId);
  if (profileError) {
    console.error(`[delete-account] profiles: ${profileError.message}`);
    errors.push(`profiles: ${profileError.message}`);
  }

  // Delete uploaded files — otherwise photos/documents keep existing in Storage
  // after the account (and its rows referencing them) is gone.
  for (const bucket of STORAGE_BUCKETS) {
    const { data: files, error: listError } = await admin.storage.from(bucket).list(userId);
    if (listError) {
      console.error(`[delete-account] storage list ${bucket}: ${listError.message}`);
      errors.push(`storage:${bucket}: ${listError.message}`);
      continue;
    }
    if (files && files.length > 0) {
      const paths = files.map((f) => `${userId}/${f.name}`);
      const { error: removeError } = await admin.storage.from(bucket).remove(paths);
      if (removeError) {
        console.error(`[delete-account] storage remove ${bucket}: ${removeError.message}`);
        errors.push(`storage:${bucket}: ${removeError.message}`);
      }
    }
  }

  // Delete the auth user last — session cookies are only valid until this point.
  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId);
  if (deleteAuthError) {
    console.error("[delete-account] auth.admin.deleteUser:", deleteAuthError.message);
    return NextResponse.json(
      { success: false, error: "Account kon niet volledig worden verwijderd. Probeer het opnieuw of neem contact op.", errors },
      { status: 500 }
    );
  }

  if (errors.length > 0) {
    console.error(`[delete-account] partial failure for uid ${userId}:`, errors);
    return NextResponse.json(
      { success: false, error: "Account is verwijderd, maar niet alle gegevens konden worden gewist. Neem contact op met support.", errors },
      { status: 207 }
    );
  }

  console.info("[delete-account] account fully deleted for uid:", userId);
  return NextResponse.json({ success: true });
}
