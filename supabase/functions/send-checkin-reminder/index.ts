/**
 * send-checkin-reminder
 *
 * Supabase Edge Function — verstuurt meldingen voor:
 *  1. Dagelijkse check-in herinnering (op ingesteld tijdstip) — E-MAIL
 *  2. Medicatie herinneringen (op ingesteld schema-tijdstip) — E-MAIL
 *  3. Wekelijkse foto update herinnering (elke zondag om 20:00) — E-MAIL
 *  5. Afspraak herinnering (4 uur vóór de afspraaktijd zelf, alleen het tijdstip) — E-MAIL
 *  6. Doel deadline herinnering (dag ervoor om 09:00) — push
 *
 * Typen 1/2/3/5 zijn omgezet van push naar e-mail (via Resend) — push werkte
 * toch alleen al in de native iOS/Android-app, niet in de webversie, en de
 * gebruiker gaf aan dit specifiek voor deze 4 typen liever als e-mail te
 * ontvangen. Doel-deadline (6) blijft ongewijzigd push-only.
 *
 * De trainingsherinnering (voorheen type 4) en de mijlpaal-instelling zijn
 * verwijderd op verzoek — "training" en "mijlpalen" bestaan niet meer als
 * meldingscategorie. Doel-deadline (6) hergebruikte per ongeluk dezelfde
 * "mijlpalen"-instelling voor een ander concept (doelen, niet mijlpalen) en
 * is daarom losgekoppeld: deze stuurt nu altijd, zonder instelling.
 *
 * Schedule: elke 15 minuten via Supabase cron
 *
 * Vereiste secrets:
 *   FIREBASE_SERVICE_ACCOUNT — JSON string van Firebase service account key
 *                              (Firebase Console → Project Settings → Service Accounts → Generate new private key)
 *   RESEND_API_KEY           — API key van Resend (dezelfde die app/api/send-invite/route.ts
 *                              en app/api/feedback/route.ts al gebruiken).
 *   NEXT_PUBLIC_SITE_URL     — volledige productie-URL (bv. https://dashboard.reva-app.nl),
 *                              voor de deep links in de e-mails. Zelfde naam als lib/apiBase.ts.
 *   PUSH_DISPATCH_SECRET     — zelfde waarde als in Vercel; hiermee bezorgt de app
 *                              (/api/push/send) de pushmeldingen voor de webapp.
 *   CRON_SECRET              — willekeurige lange string. Moet als "x-cron-secret" header
 *                              worden meegestuurd door de caller (de cron job), anders 401.
 *                              Dit is nodig omdat de publieke anon-key op zichzelf al een
 *                              geldige JWT is en dus niet volstaat als autorisatiecheck.
 */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
// Opmaak en teksten van alle REVA-mails — GEGENEREERD uit lib/email/ met
// `npm run email:build`. Wijzig teksten dáár, niet in email.ts.
import {
  EMAIL_REPLY_TO,
  appointmentReminderEmail,
  checkinReminderEmail,
  emailFrom,
  emailLogoBox,
  medicationReminderEmail,
  pngDimensions,
  photoReminderEmail,
  renderEmail,
  type EmailBrand,
  type EmailContent,
  type EmailLogo,
} from "./email.ts";

// ─── FCM v1 helpers ────────────────────────────────────────────────────────────

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

/** Encode string or bytes as base64url (geen padding, URL-safe tekens) */
function b64url(input: string | Uint8Array): string {
  const str =
    typeof input === "string" ? input : String.fromCharCode(...input);
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/** Haal een short-lived OAuth2 access token op via een service account JWT */
async function getFCMAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header  = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss:   sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud:   "https://oauth2.googleapis.com/token",
      iat:   now,
      exp:   now + 3600,
    })
  );

  const signingInput = `${header}.${payload}`;

  // Importeer de private key (PKCS#8 DER formaat)
  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigBytes = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const jwt = `${signingInput}.${b64url(new Uint8Array(sigBytes))}`;

  // Ruil JWT in voor access token
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:  jwt,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Token exchange mislukt: ${JSON.stringify(data)}`);
  }
  return data.access_token as string;
}

/** Verstuur één FCM v1 bericht */
async function sendFCM(
  projectId: string,
  accessToken: string,
  token: string,
  title: string,
  body: string,
  route: string
): Promise<boolean> {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        android: {
          priority: "high",
          notification: {
            sound:      "default",
            channel_id: "reva_default",
            color:      "#e8632a", // REVA oranje — kleurt het notificatie-icoon
            icon:       "ic_launcher_foreground",
          },
        },
        data: { route },
      },
    }),
  });

  return res.ok;
}

// ─── E-mail (Resend) ───────────────────────────────────────────────────────

interface PendingEmail {
  userId: string;
  to: string;
  build: (brand: EmailBrand) => EmailContent;
}

/**
 * Huisstijl per ontvanger: patiënten van een praktijk krijgen de naam en
 * kleur van hun praktijk (zelfde uitstraling als hun uitnodiging); wie
 * alleen een persoonlijke werkruimte heeft krijgt REVA-branding. Een
 * organisatie telt als praktijk zodra er minstens één actieve medewerker is.
 */
async function loadBrands(supabase: SupabaseClient, userIds: string[], siteUrl: string): Promise<Map<string, EmailBrand>> {
  const brands = new Map<string, EmailBrand>();
  if (userIds.length === 0) return brands;

  const { data: patients } = await supabase
    .from("patients")
    .select("user_id, organization_id, organizations(name, primary_color, logo_path)")
    .in("user_id", userIds);
  const orgIds = [...new Set((patients ?? []).map((p) => p.organization_id as string))];
  if (orgIds.length === 0) return brands;

  const { data: staff } = await supabase
    .from("memberships")
    .select("organization_id")
    .in("organization_id", orgIds)
    .eq("status", "active");
  const practiceOrgIds = new Set((staff ?? []).map((m) => m.organization_id as string));

  // Logo één keer per praktijk ophalen (zelfde logica als lib/email/practiceLogo.ts).
  const logos = new Map<string, EmailLogo | null>();
  async function logoFor(orgId: string, logoPath: string | null): Promise<EmailLogo | null> {
    if (logos.has(orgId)) return logos.get(orgId)!;
    let logo: EmailLogo | null = null;
    if (logoPath && logoPath.endsWith(".png")) {
      const { data: file } = await supabase.storage.from("organization-logos").download(logoPath);
      const size = file ? pngDimensions(new Uint8Array(await file.arrayBuffer())) : null;
      if (size) {
        const version = encodeURIComponent(logoPath.split("/").pop() ?? "1");
        logo = { url: `${siteUrl}/api/org-logo/${orgId}?v=${version}`, ...emailLogoBox(size.width, size.height) };
      }
    }
    logos.set(orgId, logo);
    return logo;
  }

  for (const p of patients ?? []) {
    const org = p.organizations as unknown as { name: string; primary_color: string | null; logo_path: string | null } | null;
    const orgId = p.organization_id as string;
    if (org && practiceOrgIds.has(orgId)) {
      brands.set(p.user_id as string, {
        kind: "practice",
        name: org.name,
        color: org.primary_color,
        logo: await logoFor(orgId, org.logo_path),
      });
    }
  }
  return brands;
}

async function sendReminderEmail(resendApiKey: string, to: string, content: EmailContent): Promise<boolean> {
  const { subject, html, text } = renderEmail(content);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: emailFrom(content.brand),
      to: [to],
      reply_to: EMAIL_REPLY_TO,
      subject,
      html,
      text,
    }),
  });
  return res.ok;
}

// ─── Main handler ──────────────────────────────────────────────────────────────

// ── Foutmeldingen naar Sentry (EU) ─────────────────────────────────────────
// Bewust zonder SDK: één fetch naar de ingest-API. Alleen technische info —
// nooit e-mailadressen, tokens of gezondheidsgegevens.
const SENTRY_DSN = Deno.env.get("SENTRY_DSN") ??
  "https://805affe3de01ac08660fb2dba0ed6e10@o4512375718346752.ingest.de.sentry.io/4512377745440848";

async function reportToSentry(message: string, level: "error" | "warning", extra: Record<string, unknown> = {}, err?: unknown) {
  try {
    const dsn = new URL(SENTRY_DSN);
    const projectId = dsn.pathname.replace(/^\//, "");
    const eventId = crypto.randomUUID().replace(/-/g, "");
    const event = {
      event_id: eventId,
      timestamp: Date.now() / 1000,
      platform: "javascript",
      level,
      environment: "production",
      server_name: "send-checkin-reminder",
      tags: { runtime: "supabase-edge", function: "send-checkin-reminder" },
      extra,
      ...(err instanceof Error
        ? { exception: { values: [{ type: err.name, value: err.message, stacktrace: undefined }] } }
        : { message: { formatted: message } }),
    };
    const body = `${JSON.stringify({ event_id: eventId })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(event)}`;
    await fetch(`${dsn.protocol}//${dsn.host}/api/${projectId}/envelope/?sentry_key=${dsn.username}&sentry_version=7`, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body,
    });
  } catch { /* monitoring mag de functie nooit laten falen */ }
}

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (err) {
    console.error("[send-checkin-reminder] onverwachte fout:", err);
    await reportToSentry("Onverwachte fout in herinneringsfunctie", "error", {}, err);
    return new Response("Interne fout", { status: 500 });
  }
});

async function handleRequest(req: Request): Promise<Response> {
  // Autorisatiecheck: alleen de cron job mag deze functie triggeren.
  // Een geldige anon-key is op zichzelf al een geldige JWT — dat is dus geen
  // bruikbare autorisatiecheck. Vereis daarom een apart gedeeld geheim.
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) {
    await reportToSentry("CRON_SECRET niet ingesteld", "error");
    return new Response("CRON_SECRET niet ingesteld", { status: 500 });
  }
  if (req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseUrl    = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const saRaw          = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  const resendApiKey   = Deno.env.get("RESEND_API_KEY");
  const siteUrl        = (Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? "").replace(/\/$/, "");

  // Testmodus: stuur een testnotificatie naar alle tokens in de DB
  let testMode = false;
  try {
    const body = await req.json();
    testMode = body?.test === true;
  } catch { /* geen JSON body — normaal bij cron */ }

  if (!saRaw) {
    await reportToSentry("FIREBASE_SERVICE_ACCOUNT niet ingesteld", "error");
    return new Response("FIREBASE_SERVICE_ACCOUNT niet ingesteld", { status: 500 });
  }

  let sa: ServiceAccount;
  try {
    sa = JSON.parse(saRaw) as ServiceAccount;
  } catch {
    return new Response("FIREBASE_SERVICE_ACCOUNT is geen geldige JSON", { status: 500 });
  }

  // Haal access token op (één keer voor alle berichten in deze run)
  let accessToken: string;
  try {
    accessToken = await getFCMAccessToken(sa);
  } catch (err) {
    await reportToSentry("FCM-authenticatie mislukt", "error", {}, err);
    return new Response(`FCM auth mislukt: ${err}`, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now           = new Date();
  const currentMinUTC = now.getUTCMinutes();

  // Gebruik de IANA timezone "Europe/Amsterdam" — werkt automatisch voor CET én CEST
  const nlFormatter = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    hour:     "numeric",
    minute:   "numeric",
    weekday:  "short",
    year:     "numeric",
    month:    "2-digit",
    day:      "2-digit",
    hour12:   false,
  });
  const nlParts     = Object.fromEntries(nlFormatter.formatToParts(now).map((p) => [p.type, p.value]));
  const localHour   = parseInt(nlParts.hour, 10);
  const localMinute = parseInt(nlParts.minute, 10);
  // Cron tikt elke 15 minuten (rond :00/:15/:30/:45) — een ingesteld
  // tijdstip matcht dus op hetzelfde kwartier, niet alleen hetzelfde uur.
  // Zonder dit matchte bv. "22:55" al om 22:00-22:14, ruim drie kwartier
  // te vroeg — verwarrend voor de gebruiker die op het exacte tijdstip let.
  const localMinuteBucket = Math.floor(localMinute / 15);
  const today     = `${nlParts.year}-${nlParts.month}-${nlParts.day}`;
  const dayOfWeek = ["zo","ma","di","wo","do","vr","za"].indexOf(nlParts.weekday); // 0=zondag

  // Morgen als YYYY-MM-DD (voor de doelen-herinnering, die nog steeds "dag ervoor" is)
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // Tijdstip 4 uur vanaf nu, in dezelfde Europe/Amsterdam-tijdzone als
  // localHour hierboven — voor de afspraak-herinnering (§5), die niet meer op
  // een vast dag-ervoor-tijdstip triggert maar op "4 uur vóór de afspraak".
  const in4Hours = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const in4HoursParts = Object.fromEntries(nlFormatter.formatToParts(in4Hours).map((p) => [p.type, p.value]));
  const in4HoursDateStr = `${in4HoursParts.year}-${in4HoursParts.month}-${in4HoursParts.day}`;
  const in4HoursHour = parseInt(in4HoursParts.hour, 10);
  const in4HoursMinute = parseInt(in4HoursParts.minute, 10);

  const notifications: { token: string; title: string; body: string; route: string }[] = [];
  const emails: PendingEmail[] = [];
  // Pushmeldingen voor de webapp (migratie 141), bezorgd via /api/push/send.
  // Altijd algemene tekst: een melding staat op het vergrendelscherm.
  const webPushes: { userId: string; title: string; body: string; url: string; tag: string }[] = [];

  // ── 1. Check-in herinneringen ────────────────────────────────────────────
  const { data: settings } = await supabase
    .from("settings")
    .select("user_id, checkin_reminder_time, notifications")
    .eq("checkin_reminder_enabled", true)
    .not("checkin_reminder_time", "is", null);

  if (settings && settings.length > 0) {
    const checkinUserIds = settings
      .filter((s) => {
        const [hh, mm] = (s.checkin_reminder_time as string).split(":").map(Number);
        return hh === localHour && Math.floor((mm || 0) / 15) === localMinuteBucket;
      })
      .map((s) => s.user_id as string);

    if (checkinUserIds.length > 0) {
      const { data: existing } = await supabase
        .from("checkins")
        .select("user_id")
        .in("user_id", checkinUserIds)
        .eq("date", today);

      const doneSet = new Set((existing ?? []).map((c) => c.user_id));
      const pending = checkinUserIds.filter((id) => !doneSet.has(id));

      if (pending.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", pending);

        (profiles ?? []).forEach(({ id, email }) => {
          if (!email) return;
          emails.push({ userId: id as string, to: email, build: (brand) => checkinReminderEmail({ brand, siteUrl }) });
          webPushes.push({ userId: id as string, title: "Hoe gaat het vandaag?", body: "Vul je check-in in, het duurt maar even.", url: "/check-in", tag: "checkin" });
        });
      }
    }
  }

  // ── 2. Medicatie herinneringen ───────────────────────────────────────────
  // Tijden staan sinds migratie 005 in de genormaliseerde junction-tabel
  // medication_schedule_times, niet meer in het legacy times-jsonb-veld op
  // medication_schedules zelf (dat wordt door de app niet meer geschreven,
  // zie lib/db/mappers.ts medicatieSchemaToDb).
  //
  // Bewust zonder medicijnnaam in de mail: e-mail is niet end-to-end
  // versleuteld en is zichtbaar op gedeelde apparaten en in previews —
  // de naam staat in de app achter de login (code-review nov 2026).
  const { data: schemas } = await supabase
    .from("medication_schedules")
    .select("user_id, medication_schedule_times(time)")
    .eq("active", true);

  if (schemas && schemas.length > 0) {
    const medUserIds = new Set<string>();
    for (const s of schemas) {
      const times = ((s.medication_schedule_times as { time: string }[] | null) ?? []).map((t) => t.time);
      for (const t of times) {
        const [hh, mm] = t.split(":").map(Number);
        if (hh === localHour && Math.floor((mm || 0) / 15) === localMinuteBucket) {
          medUserIds.add(s.user_id as string);
        }
      }
    }

    if (medUserIds.size > 0) {
      const { data: notifSettings } = await supabase
        .from("settings")
        .select("user_id, notifications")
        .in("user_id", [...medUserIds]);

      const enabledUsers = (notifSettings ?? [])
        .filter((s) => {
          const n = s.notifications as Record<string, unknown>;
          return n?.medicatie !== false;
        })
        .map((s) => s.user_id as string);

      if (enabledUsers.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", enabledUsers);

        (profiles ?? []).forEach(({ id, email }) => {
          if (!email) return;
          emails.push({ userId: id as string, to: email, build: (brand) => medicationReminderEmail({ brand, siteUrl }) });
          webPushes.push({ userId: id as string, title: "Herinnering medicatie", body: "Het is tijd voor je volgende inname volgens je schema.", url: "/medicatie", tag: "medicatie" });
        });
      }
    }
  }

  // ── 3. Wekelijkse foto herinnering (zondag 20:00) ────────────────────────
  if (dayOfWeek === 0 && localHour === 20 && currentMinUTC < 15) {
    const { data: fotoSettings } = await supabase
      .from("settings")
      .select("user_id, notifications");

    const fotoUsers = (fotoSettings ?? [])
      .filter((s) => {
        const n = s.notifications as Record<string, unknown>;
        return n?.foto === true;
      })
      .map((s) => s.user_id as string);

    if (fotoUsers.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", fotoUsers);

      (profiles ?? []).forEach(({ id, email }) => {
        if (!email) return;
        emails.push({ userId: id as string, to: email, build: (brand) => photoReminderEmail({ brand, siteUrl }) });
        webPushes.push({ userId: id as string, title: "Tijd voor je foto-update", body: "Leg je voortgang van deze week vast.", url: "/dossier?tab=foto-updates", tag: "foto" });
      });
    }
  }

  // ── 5. Afspraak herinnering (4 uur vóór de afspraaktijd zelf) ────────────
  // Was voorheen "dag ervoor om 18:00 vast tijdstip" — matcht nu op het uur
  // van de afspraak zelf, 4 uur vooruit vanaf nu (zelfde hour-only precisie
  // als de andere tijdgebonden secties hierboven, die ook alleen op het uur
  // matchen, niet op de exacte minuut).
  //
  // Alleen het tijdstip in de mail — titel, locatie en behandelaar kunnen
  // medisch van aard zijn ("MRI knie", "Orthopedie") en staan in de app.
  if (currentMinUTC < 15) {
    const { data: appointments } = await supabase
      .from("appointments")
      .select("user_id, time")
      .eq("date", in4HoursDateStr)
      .eq("reminder_enabled", true);

    const dueAppts = (appointments ?? []).filter((a) => {
      const timeStr = a.time as string | null;
      if (!timeStr) return false;
      const [hh] = timeStr.split(":").map(Number);
      return hh === in4HoursHour;
    });

    if (dueAppts.length > 0) {
      const apptUserIds = [...new Set(dueAppts.map((a) => a.user_id as string))];

      const { data: apptSettings } = await supabase
        .from("settings")
        .select("user_id, notifications")
        .in("user_id", apptUserIds);

      const enabledApptUsers = new Set(
        (apptSettings ?? [])
          .filter((s) => {
            const n = s.notifications as Record<string, unknown>;
            return n?.afspraken !== false;
          })
          .map((s) => s.user_id as string)
      );

      const filteredAppts = dueAppts.filter((a) => enabledApptUsers.has(a.user_id as string));

      if (filteredAppts.length > 0) {
        const enabledIds = [...new Set(filteredAppts.map((a) => a.user_id as string))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", enabledIds);

        const emailByUserId = new Map<string, string | null>(
          (profiles ?? []).map((p) => [p.id as string, p.email as string | null])
        );

        for (const appt of filteredAppts) {
          const email: string | null = emailByUserId.get(appt.user_id as string) ?? null;
          if (!email) continue;
          const time = appt.time ? (appt.time as string).slice(0, 5) : null;
          // 4 uur vooruit kan na middernacht vallen (bv. 21:00 → afspraak om 01:00).
          const day = in4HoursDateStr === today ? "vandaag" : "morgen";
          emails.push({
            userId: appt.user_id as string,
            to: email,
            build: (brand) => appointmentReminderEmail({ brand, siteUrl, day, time }),
          });
          webPushes.push({ userId: appt.user_id as string, title: "Afspraak " + day, body: time ? `Je hebt ${day} om ${time} een afspraak.` : `Je hebt ${day} een afspraak.`, url: "/dagboek", tag: "afspraak" });
        }
      }
    }
  }

  // ── 6. Doel deadline herinnering (dag ervoor om 09:00) ───────────────────
  if (localHour === 9 && currentMinUTC < 15) {
    const { data: expiredGoals } = await supabase
      .from("goals")
      .select("user_id")
      .eq("target_date", tomorrowStr)
      .eq("completed", false);

    if (expiredGoals && expiredGoals.length > 0) {
      const goalUserIds = [...new Set(expiredGoals.map((g) => g.user_id as string))];
      goalUserIds.forEach((userId) => webPushes.push({ userId, title: "Je deadline nadert", body: "Een van je doelen loopt morgen af.", url: "/doelstellingen", tag: "doel" }));
      const { data: tokens } = await supabase
        .from("push_tokens")
        .select("token")
        .in("user_id", goalUserIds);

      // Zonder doeltitel: een pushbericht staat op het vergrendelscherm en
      // loopt via Firebase (VS) — de titel kan medisch van aard zijn.
      (tokens ?? []).forEach(({ token }) => {
        notifications.push({
          token,
          title: "Je deadline nadert",
          body:  "Een van je doelen loopt morgen af. Geef het nog één keer alles!",
          route: "/doelstellingen",
        });
      });
    }
  }

  // ── Testmodus: stuur naar alle tokens in de DB ──────────────────────────
  if (testMode) {
    const { data: allTokens } = await supabase
      .from("push_tokens")
      .select("token");

    (allTokens ?? []).forEach(({ token }: { token: string }) => {
      notifications.push({
        token,
        title: "REVA test notificatie ✅",
        body:  "Push notificaties werken correct!",
        route: "/",
      });
    });
  }

  // ── Verstuur alle push-notificaties via FCM v1 ───────────────────────────
  let sent = 0;
  const errors: string[] = [];

  for (const { token, title, body, route } of notifications) {
    const ok = await sendFCM(sa.project_id, accessToken, token, title, body, route);
    if (ok) {
      sent++;
    } else {
      errors.push(`token=${token.slice(0, 10)}…`);
    }
  }

  console.info(`[push] sent=${sent} errors=${errors.length} total=${notifications.length}`);

  // ── Pushmeldingen webapp via /api/push/send ───────────────────────────────
  let webPushSent = 0;
  const pushSecret = Deno.env.get("PUSH_DISPATCH_SECRET");
  if (webPushes.length > 0 && pushSecret) {
    try {
      const res = await fetch(`${siteUrl}/api/push/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-push-secret": pushSecret },
        body: JSON.stringify({ pushes: webPushes }),
      });
      const json = await res.json().catch(() => ({}));
      webPushSent = json.sent ?? 0;
      if (!res.ok) console.error("[webpush] dispatch mislukt:", res.status);
    } catch (err) {
      console.error("[webpush] dispatch fout:", err);
    }
  } else if (webPushes.length > 0) {
    console.info("[webpush] PUSH_DISPATCH_SECRET niet ingesteld — webpush overgeslagen");
  }
  console.info(`[webpush] sent=${webPushSent} total=${webPushes.length}`);

  // ── Verstuur alle e-mails via Resend ──────────────────────────────────────
  let emailsSent = 0;
  const emailErrors: string[] = [];

  if (emails.length > 0 && !resendApiKey) {
    console.error("[email] RESEND_API_KEY niet ingesteld — e-mails worden overgeslagen");
    emailErrors.push("RESEND_API_KEY niet ingesteld");
  } else if (resendApiKey) {
    const brands = await loadBrands(supabase, [...new Set(emails.map((e) => e.userId))], siteUrl);
    for (const { userId, to, build } of emails) {
      const ok = await sendReminderEmail(resendApiKey, to, build(brands.get(userId) ?? { kind: "reva" }));
      if (ok) {
        emailsSent++;
      } else {
        emailErrors.push(`to=${to}`);
      }
    }
  }

  console.info(`[email] sent=${emailsSent} errors=${emailErrors.length} total=${emails.length}`);

  // Alleen aantallen, geen adressen. Mislukte pushberichten niet: verlopen
  // apparaat-tokens zijn normaal en zouden alleen ruis geven.
  if (emailErrors.length > 0) {
    await reportToSentry("Herinneringsmails niet verstuurd", "warning", {
      mislukt: emailErrors.length, verstuurd: emailsSent, totaal: emails.length,
      resendKeyOntbreekt: !resendApiKey,
    });
  }

  return new Response(
    JSON.stringify({
      sent, errors: errors.slice(0, 5),
      emailsSent, emailErrors: emailErrors.slice(0, 5),
      webPushSent,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
