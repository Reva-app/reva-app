import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextResponse } from "next/server";
import { escapeHtml, inviteEmailHtml } from "@/lib/emailHtml";

// Moet in sync blijven met MANAGE_PATIENTS_ROLES in lib/services/portalService.ts
// (bewust hier gedupliceerd i.p.v. cross-boundary geïmporteerd — zelfde
// scheiding als adminService/portalService elders in dit project).
const MANAGE_PATIENTS_ROLES = ["organization_owner", "therapist", "practice_staff"];

const DEFAULT_ACCENT = "#e8632a";

type Body =
  | { context: "admin"; inviteId: string }
  | { context: "portal-staff"; inviteId: string }
  | { context: "portal-patient"; organizationId: string; patientId: string };

export async function POST(request: Request) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("[send-invite] RESEND_API_KEY is niet ingesteld");
      return NextResponse.json({ error: "E-mail service niet geconfigureerd" }, { status: 500 });
    }
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error("[send-invite] SUPABASE_SERVICE_ROLE_KEY is niet ingesteld");
      return NextResponse.json({ error: "Server configuratiefout: service role key ontbreekt" }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const authClient = createSupabaseClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    // RLS-gebonden client, geauthenticeerd met hetzelfde geverifieerde token —
    // dit doet voor admin/portal-staff meteen ook de autorisatiecheck: de
    // membership_invites-RLS is al can_manage_org_staff()-gated (migratie 041),
    // dus 0 rijen terug = niet geautoriseerd of niet-bestaand.
    const supabase = createSupabaseClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const body = (await request.json()) as Body;

    let organizationId: string;
    let email: string;
    let firstName: string;
    let roleKey: string | null = null;
    let roleName: string | null = null;

    if (body.context === "admin" || body.context === "portal-staff") {
      const { data: invite, error: inviteError } = await supabase
        .from("membership_invites")
        .select("organization_id, email, first_name, role_id")
        .eq("id", body.inviteId)
        .maybeSingle();
      if (inviteError) {
        console.error("[send-invite] invite lookup:", inviteError.message);
        return NextResponse.json({ error: "Uitnodiging kon niet worden opgehaald" }, { status: 500 });
      }
      if (!invite) {
        return NextResponse.json({ error: "Uitnodiging niet gevonden" }, { status: 404 });
      }
      organizationId = invite.organization_id;
      email = invite.email;
      firstName = invite.first_name;

      const { data: role } = await supabase.from("roles").select("key, name").eq("id", invite.role_id).maybeSingle();
      roleKey = role?.key ?? null;
      roleName = role?.name ?? null;
    } else if (body.context === "portal-patient") {
      const { data: membership } = await supabase
        .from("memberships")
        .select("status, roles(key)")
        .eq("organization_id", body.organizationId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      const callerRoleKey = (membership?.roles as unknown as { key: string } | null)?.key ?? null;
      if (!callerRoleKey || !MANAGE_PATIENTS_ROLES.includes(callerRoleKey)) {
        return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
      }

      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .select("organization_id, email, first_name")
        .eq("id", body.patientId)
        .eq("organization_id", body.organizationId)
        .maybeSingle();
      if (patientError) {
        console.error("[send-invite] patient lookup:", patientError.message);
        return NextResponse.json({ error: "Patiëntdossier kon niet worden opgehaald" }, { status: 500 });
      }
      if (!patient || !patient.email) {
        return NextResponse.json({ error: "Patiëntdossier niet gevonden of heeft geen e-mailadres" }, { status: 404 });
      }
      organizationId = patient.organization_id;
      email = patient.email;
      firstName = patient.first_name || "";
    } else {
      return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
    }

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("name, primary_color")
      .eq("id", organizationId)
      .maybeSingle();
    if (orgError || !org) {
      console.error("[send-invite] organization lookup:", orgError?.message ?? "not found");
      return NextResponse.json({ error: "Organisatie kon niet worden opgehaald" }, { status: 500 });
    }

    // We sturen NIET Supabase's eigen action_link (auth/v1/verify) in de mail:
    // mailproviders (Gmail, Outlook, bedrijfsgateways) scannen links in
    // e-mails automatisch door ze zelf al op te vragen, wat een eenmalig te
    // gebruiken token al "verbruikt" vóórdat de ontvanger er zelf op klikt —
    // bevestigd doordat testaccounts al enkele seconden na het versturen van
    // de uitnodiging automatisch bleken bevestigd/ingelogd. In plaats daarvan
    // wijst de mail naar onze eigen /auth/verify-pagina, die de token pas via
    // JavaScript inwisselt (supabase.auth.verifyOtp) — een scanner haalt de
    // pagina wel op, maar voert geen JS uit, dus verbruikt de token niet.
    const origin = new URL(request.url).origin;

    const admin = createSupabaseClient(supabaseUrl, serviceRoleKey);
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo: origin },
    });
    if (linkError || !linkData) {
      console.error("[send-invite] generateLink:", linkError?.message);
      return NextResponse.json({ error: "Aanmaken van de uitnodigingslink is niet gelukt" }, { status: 500 });
    }
    const tokenHash = linkData.properties.hashed_token;

    // Medewerkers/eigenaars stellen eerst een wachtwoord in; patiënten niet
    // (die behouden hun bestaande, wachtwoordloze toegang).
    const postVerifyPath =
      body.context === "portal-patient"
        ? "/"
        : `/auth/reset-password?next=${encodeURIComponent("/portal")}&mode=invite&org=${encodeURIComponent(org.name as string)}&role=${roleKey === "organization_owner" ? "owner" : "staff"}`;
    const actionLink = `${origin}/auth/verify?token_hash=${tokenHash}&type=invite&next=${encodeURIComponent(postVerifyPath)}`;

    const resend = new Resend(resendApiKey);
    const orgName = org.name as string;
    const accentColor = (org.primary_color as string | null) ?? DEFAULT_ACCENT;
    const safeFirstName = escapeHtml(firstName || "");
    const safeOrgName = escapeHtml(orgName);

    let subject: string;
    let html: string;

    if (body.context === "portal-patient") {
      subject = `${orgName} heeft je herstel-dashboard klaargezet`;
      html = inviteEmailHtml({
        accentColor,
        headerLabel: orgName,
        heading: `${safeFirstName ? `${safeFirstName}, w` : "W"}elkom bij je herstel-dashboard`,
        bodyHtmlLines: [
          `<strong>${safeOrgName}</strong> heeft een persoonlijk herstel-dashboard voor je klaargezet op REVA.`,
          `Hier houd je je afspraken, oefeningen en voortgang overzichtelijk bij — en blijft je behandelaar altijd op de hoogte.`,
        ],
        ctaLabel: "Naar mijn dashboard",
        ctaUrl: actionLink,
      });
    } else if (roleKey === "organization_owner") {
      subject = `Welkom bij REVA — start met ${orgName}`;
      html = inviteEmailHtml({
        accentColor: DEFAULT_ACCENT,
        headerLabel: "REVA",
        heading: `${safeFirstName ? `${safeFirstName}, w` : "W"}elkom bij REVA!`,
        bodyHtmlLines: [
          `Je bent uitgenodigd om <strong>${safeOrgName}</strong> te beheren op REVA — het platform waarmee jouw praktijk grip houdt op iedere fase van het hersteltraject van je patiënten.`,
          `Klik op de knop hieronder, kies een wachtwoord, en je hebt direct toegang — er komt geen aparte bevestigingsmail. Daarna kun je meteen je team uitnodigen, vestigingen inrichten en het platform naar jullie eigen huisstijl aanpassen.`,
        ],
        ctaLabel: "Start met REVA",
        ctaUrl: actionLink,
      });
    } else {
      subject = `Je bent uitgenodigd bij ${orgName}`;
      html = inviteEmailHtml({
        accentColor,
        headerLabel: orgName,
        heading: `${safeFirstName ? `${safeFirstName}, j` : "J"}e bent uitgenodigd bij ${safeOrgName}`,
        bodyHtmlLines: [
          `Je bent uitgenodigd om als <strong>${escapeHtml(roleName ?? "medewerker")}</strong> mee te werken binnen ${safeOrgName} op REVA.`,
          `Klik op de knop hieronder en kies een wachtwoord — je hebt dan direct toegang, zonder aparte bevestigingsmail.`,
        ],
        ctaLabel: "Account activeren",
        ctaUrl: actionLink,
      });
    }

    const { error: sendError } = await resend.emails.send({
      from: "REVA <noreply@reva-app.nl>",
      to: email,
      subject,
      html,
    });
    if (sendError) {
      console.error("[send-invite] Resend error:", sendError);
      return NextResponse.json({ error: sendError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[send-invite] Onverwachte fout:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}
