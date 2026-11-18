import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit";
import { isDemoOrg, DEMO_ORG_DEFAULT_NAME, DEMO_OWNER_EMAIL, DEMO_PATIENT_EMAIL } from "@/lib/demo";

/**
 * Zet de demopraktijk (lib/demo.ts) terug naar de lege beginstand:
 * - alle patiëntdossiers weg (via delete_patient_dossier, met bestanden);
 * - eigen herstelplannen, schema's, oefeningen en tests van de praktijk weg;
 * - medewerkers en openstaande uitnodigingen weg, behalve de demo-eigenaar;
 * - extra locaties weg, de hoofdlocatie terug naar "Hoofdlocatie";
 * - naam, logo, kleur en contactgegevens terug naar de beginstand;
 * - activiteitenlog, voorstel-feedback, tevredenheid en intakes van de praktijk weg.
 * De demo-accounts (eigenaar en patiënt) blijven bestaan, met hun 2FA.
 *
 * Mag alleen door een platformbeheerder of de eigenaar van die demopraktijk,
 * en alleen voor een praktijk die in DEMO_ORG_IDS staat.
 */
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return NextResponse.json({ error: "Server configuratiefout" }, { status: 500 });

  const authClient = createSupabaseClient(supabaseUrl, anonKey);
  const { data: { user } } = await authClient.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  if (!(await checkRateLimit(`demo-reset:${user.id}`, 20, 60 * 60))) return rateLimitedResponse();

  const { organizationId } = (await request.json().catch(() => ({}))) as { organizationId?: string };
  if (!organizationId || !isDemoOrg(organizationId)) {
    return NextResponse.json({ error: "Dit is geen demopraktijk" }, { status: 403 });
  }

  // Autorisatie met het token van de aanroeper (RLS, aal2).
  const caller = createSupabaseClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: isAdmin } = await caller.rpc("is_platform_admin");
  if (!isAdmin) {
    const { data: m } = await caller
      .from("memberships").select("roles(key)")
      .eq("organization_id", organizationId).eq("user_id", user.id).eq("status", "active").maybeSingle();
    const role = (m?.roles as unknown as { key: string } | null)?.key;
    if (role !== "organization_owner") return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const admin = createSupabaseClient(supabaseUrl, serviceRoleKey);
  const problems: string[] = [];
  const check = (label: string, error: { message: string } | null) => { if (error) problems.push(`${label}: ${error.message}`); };

  // ── Vaste accounts ───────────────────────────────────────────────────────
  const { data: keepProfiles } = await admin.from("profiles").select("id, email").in("email", [DEMO_OWNER_EMAIL, DEMO_PATIENT_EMAIL]);
  const ownerId = keepProfiles?.find((p) => p.email === DEMO_OWNER_EMAIL)?.id ?? null;
  const demoPatientUserId = keepProfiles?.find((p) => p.email === DEMO_PATIENT_EMAIL)?.id ?? null;

  // ── Patiënten ────────────────────────────────────────────────────────────
  const { data: patients } = await admin.from("patients").select("id, user_id").eq("organization_id", organizationId);
  const linkedUsers = new Set<string>();
  for (const p of patients ?? []) {
    if (p.user_id) linkedUsers.add(p.user_id as string);
    const { error } = await admin.rpc("delete_patient_dossier", { p_patient_id: p.id, p_actor_id: user.id });
    check("patiënt", error);
  }
  if (demoPatientUserId) linkedUsers.add(demoPatientUserId);
  for (const uid of linkedUsers) {
    await removeUserFiles(admin, uid);
    // Persoonlijke werkruimte die het account eventueel kreeg (bv. inloggen vóór er een dossier was).
    const { data: own } = await admin.from("patients").select("organization_id").eq("user_id", uid);
    for (const o of own ?? []) {
      if (o.organization_id !== organizationId && !isDemoOrg(o.organization_id)) {
        const { count } = await admin.from("memberships").select("id", { count: "exact", head: true }).eq("organization_id", o.organization_id);
        if (!count) check("werkruimte", (await admin.from("organizations").delete().eq("id", o.organization_id)).error);
      }
    }
    if (uid === demoPatientUserId) {
      await admin.from("diary_workouts").delete().eq("user_id", uid);
      await admin.from("notification_states").delete().eq("user_id", uid);
    } else {
      await deleteIfUnused(admin, uid);
    }
  }

  // ── Inhoud van de praktijk ───────────────────────────────────────────────
  check("herstelplannen", (await admin.from("protocols").delete().eq("organization_id", organizationId)).error);
  check("schema's", (await admin.from("schedule_library").delete().eq("organization_id", organizationId)).error);
  check("oefeningen", (await admin.from("exercise_library").delete().eq("organization_id", organizationId)).error);
  check("tests", (await admin.from("test_library").delete().eq("organization_id", organizationId)).error);
  for (const table of ["insight_feedback", "patient_feedback", "patient_intakes", "patient_staff_notes", "audit_log"]) {
    check(table, (await admin.from(table).delete().eq("organization_id", organizationId)).error);
  }

  // ── Medewerkers ──────────────────────────────────────────────────────────
  check("uitnodigingen", (await admin.from("membership_invites").delete().eq("organization_id", organizationId)).error);
  const { data: members } = await admin.from("memberships").select("id, user_id").eq("organization_id", organizationId);
  for (const m of members ?? []) {
    if (m.user_id === ownerId) continue;
    check("medewerker", (await admin.from("memberships").delete().eq("id", m.id)).error);
    await deleteIfUnused(admin, m.user_id as string);
  }

  // ── Locaties ─────────────────────────────────────────────────────────────
  const ownerMembership = (members ?? []).find((m) => m.user_id === ownerId);
  const { data: locations } = await admin.from("locations").select("id, is_main_location, created_at").eq("organization_id", organizationId).order("created_at");
  const { data: ownerRow } = ownerMembership
    ? await admin.from("memberships").select("location_id").eq("id", ownerMembership.id).maybeSingle()
    : { data: null };
  const keepLoc = (locations ?? []).find((l) => l.id === ownerRow?.location_id) ?? (locations ?? []).find((l) => l.is_main_location) ?? locations?.[0];
  if (ownerMembership) {
    await admin.from("membership_locations").delete().eq("membership_id", ownerMembership.id).neq("location_id", keepLoc?.id ?? "");
    await admin.from("memberships").update({ location_id: keepLoc?.id ?? null, welcomed_at: null }).eq("id", ownerMembership.id);
  }
  for (const l of locations ?? []) {
    if (l.id === keepLoc?.id) continue;
    check("locatie", (await admin.from("locations").delete().eq("id", l.id)).error);
  }
  if (keepLoc) {
    check("hoofdlocatie", (await admin.from("locations").update({
      name: "Hoofdlocatie", is_main_location: true, street: null, house_number: null, postal_code: null, city: null, phone: null, email: null,
    }).eq("id", keepLoc.id)).error);
  }

  // ── Praktijk ─────────────────────────────────────────────────────────────
  const { data: logos } = await admin.storage.from("organization-logos").list(organizationId);
  if (logos?.length) await admin.storage.from("organization-logos").remove(logos.map((f) => `${organizationId}/${f.name}`));
  check("praktijk", (await admin.from("organizations").update({
    name: DEMO_ORG_DEFAULT_NAME, primary_color: null, logo_path: null, status: "active",
    website: null, contact_name: null, contact_email: null, contact_phone: null,
    address_street: null, address_postal_code: null, address_city: null, kvk_number: null, btw_number: null,
  }).eq("id", organizationId)).error);

  if (problems.length) {
    console.error("[demo-reset]", problems);
    return NextResponse.json({ error: "Niet alles kon worden leeggemaakt", details: problems }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

async function removeUserFiles(admin: SupabaseClient, uid: string) {
  for (const bucket of ["dossier-photos", "dossier-documents"]) {
    const { data: files } = await admin.storage.from(bucket).list(uid);
    if (files?.length) await admin.storage.from(bucket).remove(files.map((f) => `${uid}/${f.name}`));
  }
}

/**
 * Account dat tijdens de demo is aangemaakt (uitgenodigde medewerker of patiënt):
 * alleen weg als het nergens anders meer aan hangt — nooit een echt account raken.
 */
async function deleteIfUnused(admin: SupabaseClient, uid: string) {
  const [{ count: pts }, { count: mems }, { data: pa }] = await Promise.all([
    admin.from("patients").select("id", { count: "exact", head: true }).eq("user_id", uid),
    admin.from("memberships").select("id", { count: "exact", head: true }).eq("user_id", uid),
    admin.from("platform_admins").select("user_id").eq("user_id", uid).maybeSingle(),
  ]);
  if (pts || mems || pa) return;
  await admin.from("profiles").delete().eq("id", uid);
  await admin.auth.admin.deleteUser(uid);
}
