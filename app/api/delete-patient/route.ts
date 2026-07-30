import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit";

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

// Moet in sync blijven met MANAGE_PATIENTS_ROLES in lib/services/portalService.ts
// (zelfde reden als de gelijknamige duplicatie in send-invite/route.ts).
const MANAGE_PATIENTS_ROLES = ["organization_owner", "therapist"];

const STORAGE_BUCKETS = ["dossier-photos", "dossier-documents"] as const;

export async function DELETE(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error("[delete-patient] SUPABASE_SERVICE_ROLE_KEY is niet ingesteld");
    return NextResponse.json({ error: "Server configuratiefout: service role key ontbreekt" }, { status: 500 });
  }

  const authClient = createSupabaseClient(supabaseUrl, anonKey);
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const rateLimitOk = await checkRateLimit(authClient, `delete-patient:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS);
  if (!rateLimitOk) return rateLimitedResponse();

  const { patientId } = (await request.json()) as { patientId?: string };
  if (!patientId) {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }

  // RLS-gebonden client op het geverifieerde token — de patiënt-lookup
  // hieronder loopt dus door dezelfde can_access_patient()-achtige policy
  // als de rest van de portal.
  const supabase = createSupabaseClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id, organization_id, user_id")
    .eq("id", patientId)
    .maybeSingle();
  if (patientError) {
    console.error("[delete-patient] patient lookup:", patientError.message);
    return NextResponse.json({ error: "Patiëntdossier kon niet worden opgehaald" }, { status: 500 });
  }
  if (!patient) {
    return NextResponse.json({ error: "Patiëntdossier niet gevonden" }, { status: 404 });
  }

  // De delete zelf loopt via de service-role client (zie hieronder) en
  // omzeilt daarmee RLS, dus autorisatie moet hier expliciet herhaald
  // worden — zelfde patroon als de portal-patient-tak in send-invite/route.ts.
  const { data: membership } = await supabase
    .from("memberships")
    .select("status, roles(key)")
    .eq("organization_id", patient.organization_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  const callerRoleKey = (membership?.roles as unknown as { key: string } | null)?.key ?? null;
  if (!callerRoleKey || !MANAGE_PATIENTS_ROLES.includes(callerRoleKey)) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const admin = createSupabaseClient(supabaseUrl, serviceRoleKey);

  // Geüploade bestanden (foto's/documenten) staan los van de database-rijen —
  // die worden door de `on delete cascade` op patient_id (migratie 065) wel
  // automatisch verwijderd, maar de bestanden zelf in Storage niet. Mapstructuur
  // is op user_id, dus alleen relevant als dit dossier een gekoppeld account heeft.
  if (patient.user_id) {
    const uidForStorage = patient.user_id as string;
    for (const bucket of STORAGE_BUCKETS) {
      const { data: files, error: listError } = await admin.storage.from(bucket).list(uidForStorage);
      if (listError) {
        console.error(`[delete-patient] storage list ${bucket}:`, listError.message);
        continue;
      }
      if (files && files.length > 0) {
        const paths = files.map((f) => `${uidForStorage}/${f.name}`);
        const { error: removeError } = await admin.storage.from(bucket).remove(paths);
        if (removeError) console.error(`[delete-patient] storage remove ${bucket}:`, removeError.message);
      }
    }
  }

  // Loopt via een RPC (i.p.v. een directe delete) zodat de acterende
  // gebruiker in dezelfde transactie wordt doorgegeven aan de audit-trigger
  // (migratie 066) — een directe delete via deze service-role-client zou
  // auth.uid() NULL laten zijn, waardoor deze verwijdering permanent als
  // "onbekende gebruiker" gelogd zou worden.
  const { error: deleteError } = await admin.rpc("delete_patient_dossier", {
    p_patient_id: patientId, p_actor_id: user.id,
  });
  if (deleteError) {
    console.error("[delete-patient] patients delete:", deleteError.message);
    return NextResponse.json({ error: "Verwijderen van het patiëntdossier is niet gelukt" }, { status: 500 });
  }

  // Ruim een gekoppeld REVA-account alleen op als het nooit is geactiveerd
  // (nooit ingelogd) én nergens anders meer aan hangt — anders zou dit de
  // volledige hersteldata van een patiënt kunnen wissen die simpelweg bij
  // deze praktijk wegging, of het account van een medewerker raken.
  if (patient.user_id) {
    const uid = patient.user_id as string;
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(uid);
    if (!userError && userData?.user && !userData.user.last_sign_in_at) {
      const [{ count: otherPatients }, { count: memberships }] = await Promise.all([
        admin.from("patients").select("id", { count: "exact", head: true }).eq("user_id", uid),
        admin.from("memberships").select("id", { count: "exact", head: true }).eq("user_id", uid),
      ]);
      if (!otherPatients && !memberships) {
        await admin.from("profiles").delete().eq("id", uid);
        const { error: deleteAuthError } = await admin.auth.admin.deleteUser(uid);
        if (deleteAuthError) {
          console.error("[delete-patient] orphaned auth cleanup:", deleteAuthError.message);
        }
      }
    }
  }

  return NextResponse.json({ success: true });
}
