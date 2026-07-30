import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextResponse } from "next/server";
import { escapeHtml, inviteEmailHtml, inviteEmailText } from "@/lib/emailHtml";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit";

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

// Moeten in sync blijven met de gelijknamige constanten in
// lib/services/portalService.ts (bewust hier gedupliceerd i.p.v.
// cross-boundary geïmporteerd — zelfde scheiding als adminService/
// portalService elders in dit project).
const MANAGE_PATIENTS_ROLES = ["organization_owner", "therapist"];
const MANAGE_STAFF_ROLES = ["organization_owner"];

const DEFAULT_ACCENT = "#e8632a";

type Body =
  | { context: "admin"; inviteId: string }
  | { context: "portal-staff"; inviteId: string }
  | { context: "portal-staff-linked"; organizationId: string; email: string; firstName: string; roleId: string }
  | { context: "portal-patient"; organizationId: string; patientId: string; linkType?: "invite" | "recovery" };

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

    const rateLimitOk = await checkRateLimit(authClient, `send-invite:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS);
    if (!rateLimitOk) return rateLimitedResponse();

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
    } else if (body.context === "portal-staff-linked") {
      // Iemand met een al bestaand REVA-account (bv. eerder zelf een profiel
      // aangemaakt) wordt direct als actieve medewerker gekoppeld — zonder
      // deze mail zou diegene nooit een signaal krijgen dat ze nu toegang
      // hebben, en (als het account nog nooit echt is geactiveerd) ook geen
      // enkele manier om ooit in te loggen.
      const { data: membership } = await supabase
        .from("memberships")
        .select("status, roles(key)")
        .eq("organization_id", body.organizationId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      const callerRoleKey = (membership?.roles as unknown as { key: string } | null)?.key ?? null;
      if (!callerRoleKey || !MANAGE_STAFF_ROLES.includes(callerRoleKey)) {
        return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
      }

      organizationId = body.organizationId;
      email = body.email.trim().toLowerCase();
      firstName = body.firstName;

      const { data: role } = await supabase.from("roles").select("key, name").eq("id", body.roleId).maybeSingle();
      roleKey = role?.key ?? null;
      roleName = role?.name ?? null;

      // Deze route stuurt zelf geen membership-rij aan — die is al aangemaakt
      // door inviteStaffMember() vóórdat dit endpoint wordt aangeroepen. Zonder
      // deze her-verificatie zou een organization_owner een werkende
      // wachtwoord-reset-link naar ELK bestaand REVA-account kunnen sturen met
      // een "je bent uitgenodigd"-tekst, ongeacht of er echt een lidmaatschap
      // bestaat — geen accountovername, maar wel een e-mail-enumeratie- en
      // spam-vector. Dus: alleen versturen als het lidmaatschap ook echt bestaat.
      const { data: foundUsers } = await supabase.rpc("portal_find_user_by_email", { p_email: email });
      const targetUserId = (foundUsers as { id: string; full_name: string | null }[] | null)?.[0]?.id ?? null;
      if (!targetUserId) {
        return NextResponse.json({ error: "Geen bestaand account gevonden voor dit e-mailadres" }, { status: 404 });
      }
      const { data: targetMembership } = await supabase
        .from("memberships")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", targetUserId)
        .eq("status", "active")
        .maybeSingle();
      if (!targetMembership) {
        return NextResponse.json({ error: "Geen actief lidmaatschap gevonden voor dit account binnen deze organisatie" }, { status: 404 });
      }
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

    // Voor een patiënt-e-mailadres dat al een profiel heeft (bv. een eerdere
    // uitnodiging die nooit is afgerond) weigert Supabase een tweede
    // "invite"-type link — die is alleen bedoeld voor nog niet bestaande
    // gebruikers. Voor die herhaalpoging gebruiken we daarom "recovery": dat
    // werkt voor elk bestaand account, ongeacht of er ooit een wachtwoord is
    // gezet, en laat de ontvanger op dezelfde /auth/reset-password-pagina
    // alsnog een (nieuw) wachtwoord instellen.
    const linkType: "invite" | "recovery" =
      body.context === "portal-patient" ? (body.linkType ?? "invite")
      : body.context === "portal-staff-linked" ? "recovery"
      : "invite";

    const admin = createSupabaseClient(supabaseUrl, serviceRoleKey);
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: linkType,
      email,
      options: { redirectTo: origin },
    });
    if (linkError || !linkData) {
      console.error("[send-invite] generateLink:", linkError?.message);
      return NextResponse.json({ error: "Aanmaken van de uitnodigingslink is niet gelukt" }, { status: 500 });
    }
    const tokenHash = linkData.properties.hashed_token;

    // Iedereen stelt eerst een wachtwoord in voordat ze het dashboard zien —
    // ook patiënten (voorheen wachtwoordloos, maar dat liet ze zonder
    // duidelijke "activeer je account"-stap direct op Instellingen landen).
    const postVerifyPath =
      body.context === "portal-patient"
        ? `/auth/reset-password?next=${encodeURIComponent("/")}&mode=invite&org=${encodeURIComponent(org.name as string)}&role=patient`
        : `/auth/reset-password?next=${encodeURIComponent("/portal")}&mode=invite&org=${encodeURIComponent(org.name as string)}&role=${roleKey === "organization_owner" ? "owner" : "staff"}`;
    const actionLink = `${origin}/auth/verify?token_hash=${tokenHash}&type=${linkType}&next=${encodeURIComponent(postVerifyPath)}`;

    const resend = new Resend(resendApiKey);
    const orgName = org.name as string;
    const accentColor = (org.primary_color as string | null) ?? DEFAULT_ACCENT;
    const safeFirstName = escapeHtml(firstName || "");
    const safeOrgName = escapeHtml(orgName);

    let subject: string;
    let html: string;
    let text: string;

    if (body.context === "portal-patient") {
      subject = `${orgName} heeft je herstel-dashboard klaargezet`;
      const heading = `${safeFirstName ? `${safeFirstName}, w` : "W"}elkom bij je herstel-dashboard`;
      html = inviteEmailHtml({
        accentColor,
        headerLabel: orgName,
        heading,
        bodyHtmlLines: [
          `<strong>${safeOrgName}</strong> heeft een persoonlijk herstel-dashboard voor je klaargezet op REVA.`,
          `Hier houd je je afspraken, oefeningen en voortgang overzichtelijk bij — en blijft je behandelaar altijd op de hoogte.`,
        ],
        ctaLabel: "Naar mijn dashboard",
        ctaUrl: actionLink,
      });
      text = inviteEmailText({
        headerLabel: orgName,
        heading,
        bodyLines: [
          `${orgName} heeft een persoonlijk herstel-dashboard voor je klaargezet op REVA.`,
          `Hier houd je je afspraken, oefeningen en voortgang overzichtelijk bij, en blijft je behandelaar altijd op de hoogte.`,
        ],
        ctaLabel: "Naar mijn dashboard",
        ctaUrl: actionLink,
      });
    } else if (roleKey === "organization_owner") {
      subject = `Welkom bij REVA — start met ${orgName}`;
      const heading = `${safeFirstName ? `${safeFirstName}, w` : "W"}elkom bij REVA!`;
      html = inviteEmailHtml({
        accentColor: DEFAULT_ACCENT,
        headerLabel: "REVA",
        heading,
        bodyHtmlLines: [
          `Je bent uitgenodigd om <strong>${safeOrgName}</strong> te beheren op REVA — het platform waarmee jouw praktijk grip houdt op iedere fase van het hersteltraject van je patiënten.`,
          `Klik op de knop hieronder, kies een wachtwoord, en je hebt direct toegang — er komt geen aparte bevestigingsmail. Daarna kun je meteen je team uitnodigen, locaties inrichten en het platform naar jullie eigen huisstijl aanpassen.`,
        ],
        ctaLabel: "Start met REVA",
        ctaUrl: actionLink,
      });
      text = inviteEmailText({
        headerLabel: "REVA",
        heading,
        bodyLines: [
          `Je bent uitgenodigd om ${orgName} te beheren op REVA, het platform waarmee jouw praktijk grip houdt op iedere fase van het hersteltraject van je patiënten.`,
          `Klik op de link hieronder, kies een wachtwoord, en je hebt direct toegang, er komt geen aparte bevestigingsmail. Daarna kun je meteen je team uitnodigen, locaties inrichten en het platform naar jullie eigen huisstijl aanpassen.`,
        ],
        ctaLabel: "Start met REVA",
        ctaUrl: actionLink,
      });
    } else {
      subject = `Je bent uitgenodigd bij ${orgName}`;
      const heading = `${safeFirstName ? `${safeFirstName}, j` : "J"}e bent uitgenodigd bij ${safeOrgName}`;
      html = inviteEmailHtml({
        accentColor,
        headerLabel: orgName,
        heading,
        bodyHtmlLines: [
          `Je bent uitgenodigd om als <strong>${escapeHtml(roleName ?? "medewerker")}</strong> mee te werken binnen ${safeOrgName} op REVA.`,
          `Klik op de knop hieronder en kies een wachtwoord — je hebt dan direct toegang, zonder aparte bevestigingsmail.`,
        ],
        ctaLabel: "Account activeren",
        ctaUrl: actionLink,
      });
      text = inviteEmailText({
        headerLabel: orgName,
        heading,
        bodyLines: [
          `Je bent uitgenodigd om als ${roleName ?? "medewerker"} mee te werken binnen ${orgName} op REVA.`,
          `Klik op de link hieronder en kies een wachtwoord, je hebt dan direct toegang, zonder aparte bevestigingsmail.`,
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
      text,
      replyTo: "info@reva-app.nl",
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
