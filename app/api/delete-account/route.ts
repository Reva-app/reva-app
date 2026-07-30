import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit";

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

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

export async function DELETE(request: Request) {
  // De sessie wordt bewust NIET uit cookies gereconstrueerd — @supabase/ssr's
  // cookie-gebaseerde sessie kan achterlopen op een stille token-refresh die de
  // browser-client intern al heeft doorgevoerd, wat hier leidde tot valse
  // "niet ingelogd"-afwijzingen ondanks een geldig ingelogde gebruiker. In
  // plaats daarvan valideert de client zijn actuele, verse access token
  // expliciet via de Authorization-header (zie instellingen/page.tsx).
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const authClient = createSupabaseClient(supabaseUrl, anonKey);
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) {
    console.error("[delete-account] auth check failed:", authError?.message ?? "no user for token");
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const rateLimitOk = await checkRateLimit(authClient, `delete-account:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS);
  if (!rateLimitOk) return rateLimitedResponse();

  // RLS-gebonden client, geauthenticeerd met hetzelfde geverifieerde token —
  // zodat ook de losse rij-verwijderingen hieronder niet alsnog op een
  // cookie-mismatch kunnen stranden.
  const supabase = createSupabaseClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const userId = user.id;
  const errors: string[] = [];

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Server configuratiefout: service role key ontbreekt" },
      { status: 500 }
    );
  }
  const admin = createSupabaseClient(supabaseUrl, serviceRoleKey);

  // Is dit account ook gekoppeld aan een praktijkdossier (patients-rij)?
  // Die rij or geen deel van USER_TABLES hieronder (die is op patient_id
  // gekoppeld, niet user_id) en zou anders — samen met de hele
  // Protocol Engine-historie (patient_protocols e.v., migratie 049/050,
  // cascade op patient_id) — na accountverwijdering blijven staan, los van
  // enig account. `on delete cascade` op patient_id (migratie 065) ruimt bij
  // deze ene delete meteen ook alle klinische data van dit dossier op.
  // Loopt via een RPC (i.p.v. een directe delete) zodat de acterende
  // gebruiker in dezelfde transactie wordt doorgegeven aan de audit-trigger
  // (migratie 066) — zie dezelfde toelichting in delete-patient/route.ts.
  const { error: patientDeleteError } = await admin.rpc("delete_own_patient_dossier", { p_user_id: userId });
  if (patientDeleteError) {
    console.error("[delete-account] patients:", patientDeleteError.message);
    errors.push(`patients: ${patientDeleteError.message}`);
  }

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
