/**
 * send-checkin-reminder
 *
 * Supabase Edge Function — verstuurt meldingen voor:
 *  1. Dagelijkse check-in herinnering (op ingesteld tijdstip) — E-MAIL
 *  2. Medicatie herinneringen (op ingesteld schema-tijdstip) — E-MAIL
 *  3. Wekelijkse foto update herinnering (elke zondag om 20:00) — E-MAIL
 *  5. Afspraak herinnering (4 uur vóór de afspraaktijd zelf, incl. details) — E-MAIL
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
 *   CRON_SECRET              — willekeurige lange string. Moet als "x-cron-secret" header
 *                              worden meegestuurd door de caller (de cron job), anders 401.
 *                              Dit is nodig omdat de publieke anon-key op zichzelf al een
 *                              geldige JWT is en dus niet volstaat als autorisatiecheck.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// ─── E-mail helpers (Resend) ────────────────────────────────────────────────
// Zelfde REVA-huisstijl als lib/emailHtml.ts's inviteEmailHtml() — hier
// zelfstandig herhaald omdat deze Edge Function los draait van de Next.js-
// app en dus niet uit lib/ kan importeren.

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface ReminderEmailOptions {
  heading: string;
  bodyLines: string[];
  ctaLabel: string;
  ctaUrl: string;
}

function reminderEmailHtml({ heading, bodyLines, ctaLabel, ctaUrl }: ReminderEmailOptions): string {
  const accentColor = "#e8632a";
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f7f4; padding: 32px 16px;">
      <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e8e5df;">
        <div style="background: ${accentColor}; padding: 20px 32px; color: #ffffff; font-weight: 700; font-size: 15px; letter-spacing: 0.01em;">
          REVA
        </div>
        <div style="padding: 32px;">
          <h1 style="margin: 0 0 16px; font-size: 22px; color: #1a1a1a; line-height: 1.3;">${escapeHtml(heading)}</h1>
          ${bodyLines.map((line) => `<p style="margin: 0 0 14px; font-size: 14px; color: #4b5563; line-height: 1.6;">${escapeHtml(line)}</p>`).join("")}
          <div style="margin: 28px 0 8px;">
            <a href="${ctaUrl}" style="display: inline-block; background: ${accentColor}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 10px;">
              ${escapeHtml(ctaLabel)}
            </a>
          </div>
        </div>
        <div style="padding: 4px 32px 20px; font-size: 12px; color: #9ca3af;">
          REVA — vragen? Mail <a href="mailto:info@reva-app.nl" style="color: #9ca3af;">info@reva-app.nl</a>. Je ontvangt dit omdat deze melding aanstaat bij Instellingen → Meldingen.
        </div>
      </div>
    </div>
  `;
}

function reminderEmailText({ heading, bodyLines, ctaLabel, ctaUrl }: ReminderEmailOptions): string {
  return [heading, "", ...bodyLines, "", `${ctaLabel}: ${ctaUrl}`, "", "REVA — vragen? Mail info@reva-app.nl"].join("\n");
}

async function sendReminderEmail(resendApiKey: string, to: string, subject: string, options: ReminderEmailOptions): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "REVA <noreply@reva-app.nl>",
      to: [to],
      subject,
      html: reminderEmailHtml(options),
      text: reminderEmailText(options),
    }),
  });
  return res.ok;
}

// ─── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Autorisatiecheck: alleen de cron job mag deze functie triggeren.
  // Een geldige anon-key is op zichzelf al een geldige JWT — dat is dus geen
  // bruikbare autorisatiecheck. Vereis daarom een apart gedeeld geheim.
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) {
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
  const emails: { to: string; subject: string; options: ReminderEmailOptions }[] = [];

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
          .select("email")
          .in("id", pending);

        (profiles ?? []).forEach(({ email }) => {
          if (!email) return;
          emails.push({
            to: email,
            subject: "Hoe gaat het vandaag?",
            options: {
              heading: "Tijd voor je dagelijkse check-in",
              bodyLines: ["Neem even een moment voor je dagelijkse check-in en houd je herstel bij."],
              ctaLabel: "Check-in invullen",
              ctaUrl: `${siteUrl}/check-in`,
            },
          });
        });
      }
    }
  }

  // ── 2. Medicatie herinneringen ───────────────────────────────────────────
  // Tijden staan sinds migratie 005 in de genormaliseerde junction-tabel
  // medication_schedule_times, niet meer in het legacy times-jsonb-veld op
  // medication_schedules zelf (dat wordt door de app niet meer geschreven,
  // zie lib/db/mappers.ts medicatieSchemaToDb).
  const { data: schemas } = await supabase
    .from("medication_schedules")
    .select("user_id, medication_name, medication_schedule_times(time)")
    .eq("active", true);

  if (schemas && schemas.length > 0) {
    const medUserMap = new Map<string, string[]>();
    for (const s of schemas) {
      const times = ((s.medication_schedule_times as { time: string }[] | null) ?? []).map((t) => t.time);
      for (const t of times) {
        const [hh, mm] = t.split(":").map(Number);
        if (hh === localHour && Math.floor((mm || 0) / 15) === localMinuteBucket) {
          if (!medUserMap.has(s.user_id)) medUserMap.set(s.user_id, []);
          medUserMap.get(s.user_id)!.push(s.medication_name as string);
        }
      }
    }

    if (medUserMap.size > 0) {
      const { data: notifSettings } = await supabase
        .from("settings")
        .select("user_id, notifications")
        .in("user_id", [...medUserMap.keys()]);

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
          const meds = medUserMap.get(id as string) ?? [];
          emails.push({
            to: email,
            subject: "Tijd voor je medicatie",
            options: {
              heading: "Tijd voor je medicatie",
              bodyLines: [`Vergeet niet je ${meds.join(" en ")} in te nemen.`],
              ctaLabel: "Naar medicatie",
              ctaUrl: `${siteUrl}/medicatie`,
            },
          });
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
        .select("email")
        .in("id", fotoUsers);

      (profiles ?? []).forEach(({ email }) => {
        if (!email) return;
        emails.push({
          to: email,
          subject: "Leg je voortgang vast",
          options: {
            heading: "Leg je voortgang vast",
            bodyLines: ["Maak je wekelijkse foto en zie hoe ver je al bent gekomen."],
            ctaLabel: "Foto toevoegen",
            ctaUrl: `${siteUrl}/dossier?tab=foto-updates`,
          },
        });
      });
    }
  }

  // ── 5. Afspraak herinnering (4 uur vóór de afspraaktijd zelf) ────────────
  // Was voorheen "dag ervoor om 18:00 vast tijdstip" — matcht nu op het uur
  // van de afspraak zelf, 4 uur vooruit vanaf nu (zelfde hour-only precisie
  // als de andere tijdgebonden secties hierboven, die ook alleen op het uur
  // matchen, niet op de exacte minuut).
  if (currentMinUTC < 15) {
    const { data: appointments } = await supabase
      .from("appointments")
      .select("user_id, title, time, location, provider_name")
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
          const tijdLabel = appt.time ? (appt.time as string).slice(0, 5) : null;
          const bodyLines = [`Over ongeveer 4 uur heb je een afspraak: ${appt.title ?? "Afspraak"}.`];
          if (tijdLabel) bodyLines.push(`Tijd: ${tijdLabel}`);
          if (appt.location) bodyLines.push(`Locatie: ${appt.location}`);
          if (appt.provider_name) bodyLines.push(`Behandelaar: ${appt.provider_name}`);
          bodyLines.push("Zorg dat je goed voorbereid bent.");
          emails.push({
            to: email,
            subject: `Afspraak vandaag: ${appt.title ?? "Afspraak"}`,
            options: {
              heading: "Je afspraak komt eraan",
              bodyLines,
              ctaLabel: "Bekijk je afspraak",
              ctaUrl: `${siteUrl}/afspraken`,
            },
          });
        }
      }
    }
  }

  // ── 6. Doel deadline herinnering (dag ervoor om 09:00) ───────────────────
  if (localHour === 9 && currentMinUTC < 15) {
    const { data: expiredGoals } = await supabase
      .from("goals")
      .select("user_id, title")
      .eq("target_date", tomorrowStr)
      .eq("completed", false);

    if (expiredGoals && expiredGoals.length > 0) {
      const goalUserIds = [...new Set(expiredGoals.map((g) => g.user_id as string))];
      const { data: tokens } = await supabase
        .from("push_tokens")
        .select("token, user_id")
        .in("user_id", goalUserIds);

      (tokens ?? []).forEach(({ token, user_id }) => {
        const goal = expiredGoals.find((g) => g.user_id === user_id);
        notifications.push({
          token,
          title: "Je deadline nadert",
          body:  `'${goal?.title ?? "Jouw doel"}' loopt morgen af. Geef het nog één keer alles!`,
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

  // ── Verstuur alle e-mails via Resend ──────────────────────────────────────
  let emailsSent = 0;
  const emailErrors: string[] = [];

  if (emails.length > 0 && !resendApiKey) {
    console.error("[email] RESEND_API_KEY niet ingesteld — e-mails worden overgeslagen");
    emailErrors.push("RESEND_API_KEY niet ingesteld");
  } else if (resendApiKey) {
    for (const { to, subject, options } of emails) {
      const ok = await sendReminderEmail(resendApiKey, to, subject, options);
      if (ok) {
        emailsSent++;
      } else {
        emailErrors.push(`to=${to}`);
      }
    }
  }

  console.info(`[email] sent=${emailsSent} errors=${emailErrors.length} total=${emails.length}`);

  return new Response(
    JSON.stringify({
      sent, errors: errors.slice(0, 5),
      emailsSent, emailErrors: emailErrors.slice(0, 5),
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
