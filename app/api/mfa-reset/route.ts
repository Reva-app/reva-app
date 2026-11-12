import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit";
import { tokenHasAal2 } from "@/lib/apiAuth";

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

/**
 * Reset (verwijdert) de tweestapsverificatie-factor van een collega, zodat
 * die bij de volgende poging opnieuw door het instelscherm moet — het enige
 * herstelpad bij een kwijtgeraakte authenticator-app (geen self-service
 * back-up-codes in deze eerste versie).
 *
 * Toegestaan: platform-beheerder (kan iedereen resetten), of een
 * organization_owner die een collega (geen andere eigenaar, niet zichzelf)
 * binnen dezelfde organisatie reset. Een eigenaar die zelf vastzit kan
 * alleen via platform-support geholpen worden.
 *
 * Patiënten (met `patientId`): eigenaar of behandelaar van de praktijk die
 * het dossier beheert. Alleen voor accounts zonder medewerkersrol.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error("[mfa-reset] SUPABASE_SERVICE_ROLE_KEY is niet ingesteld");
    return NextResponse.json({ error: "Server configuratiefout: service role key ontbreekt" }, { status: 500 });
  }

  const authClient = createSupabaseClient(supabaseUrl, anonKey);
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const rateLimitOk = await checkRateLimit(`mfa-reset:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS);
  if (!rateLimitOk) return rateLimitedResponse();

  if (!tokenHasAal2(token)) {
    return NextResponse.json({ error: "Tweestapsverificatie vereist" }, { status: 403 });
  }

  const body = (await request.json()) as { targetUserId?: string; organizationId?: string; patientId?: string };

  const supabase = createSupabaseClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const admin = createSupabaseClient(supabaseUrl, serviceRoleKey);

  let targetUserId: string | null = null;
  let authorized = false;

  if (body.patientId) {
    // ── Patiënt: eigenaar/behandelaar van de praktijk van dit dossier ──
    // Het dossier wordt met de token van de aanroeper gelezen, dus RLS
    // (can_access_patient, migratie 122, eist aal2) bepaalt of de aanroeper
    // dit dossier überhaupt mag zien.
    const { data: patient } = await supabase
      .from("patients")
      .select("user_id, organization_id")
      .eq("id", body.patientId)
      .maybeSingle();
    if (!patient?.user_id) {
      return NextResponse.json({ error: "Deze patiënt heeft (nog) geen account." }, { status: 400 });
    }
    const { data: callerMembership } = await supabase.from("memberships").select("roles(key)")
      .eq("organization_id", patient.organization_id).eq("user_id", user.id).eq("status", "active").maybeSingle();
    const callerRoleKey = (callerMembership?.roles as unknown as { key: string } | null)?.key ?? null;

    // Nooit via deze route een medewerker resetten: dat loopt via de
    // collega-route hieronder, met de strengere eigenaarsregels.
    const { count: targetMemberships } = await admin.from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("user_id", patient.user_id).eq("status", "active");

    targetUserId = patient.user_id as string;
    authorized = (callerRoleKey === "organization_owner" || callerRoleKey === "therapist") && (targetMemberships ?? 0) === 0;
  } else {
    // ── Collega: platform-beheerder of eigenaar binnen dezelfde organisatie ──
    const { targetUserId: target, organizationId } = body;
    if (!target || !organizationId) {
      return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
    }
    targetUserId = target;
    const { data: callerIsAdmin } = await supabase.rpc("is_platform_admin");
    authorized = !!callerIsAdmin;
    if (!authorized) {
      const [{ data: callerMembership }, { data: targetMembership }] = await Promise.all([
        supabase.from("memberships").select("status, roles(key)")
          .eq("organization_id", organizationId).eq("user_id", user.id).eq("status", "active").maybeSingle(),
        supabase.from("memberships").select("status, roles(key)")
          .eq("organization_id", organizationId).eq("user_id", target).eq("status", "active").maybeSingle(),
      ]);
      const callerRoleKey = (callerMembership?.roles as unknown as { key: string } | null)?.key ?? null;
      const targetRoleKey = (targetMembership?.roles as unknown as { key: string } | null)?.key ?? null;
      authorized = callerRoleKey === "organization_owner" && !!targetRoleKey && targetRoleKey !== "organization_owner";
    }
  }

  if (targetUserId === user.id) {
    return NextResponse.json({ error: "Je kunt jouw eigen tweestapsverificatie niet op deze manier resetten." }, { status: 400 });
  }
  if (!authorized || !targetUserId) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }


  const { data: factorsData, error: factorsError } = await admin.auth.admin.mfa.listFactors({ userId: targetUserId });
  if (factorsError) {
    console.error("[mfa-reset] listFactors:", factorsError.message);
    return NextResponse.json({ error: "Ophalen van tweestapsverificatie-status is niet gelukt" }, { status: 500 });
  }

  const totpFactors = (factorsData?.factors ?? []).filter((f) => f.factor_type === "totp");
  for (const factor of totpFactors) {
    const { error: deleteError } = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: targetUserId });
    if (deleteError) console.error("[mfa-reset] deleteFactor:", deleteError.message);
  }

  return NextResponse.json({ success: true });
}
