/**
 * send-checkin-reminder
 *
 * Supabase Edge Function — verstuurt push notificaties voor:
 *  1. Dagelijkse check-in herinnering (op ingesteld tijdstip)
 *  2. Medicatie herinneringen (op ingesteld schema-tijdstip)
 *  3. Wekelijkse foto update herinnering (elke zondag om 19:00)
 *  4. Training herinnering (dagelijks om 09:00 als er geplande schema's zijn)
 *  5. Afspraak herinnering (dag ervoor om 18:00)
 *  6. Doel deadline herinnering (dag ervoor om 09:00)
 *
 * Schedule: elke 15 minuten via Supabase cron
 *
 * Vereiste secrets:
 *   FIREBASE_SERVICE_ACCOUNT — JSON string van Firebase service account key
 *                              (Firebase Console → Project Settings → Service Accounts → Generate new private key)
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
  const nlParts   = Object.fromEntries(nlFormatter.formatToParts(now).map((p) => [p.type, p.value]));
  const localHour = parseInt(nlParts.hour, 10);
  const today     = `${nlParts.year}-${nlParts.month}-${nlParts.day}`;
  const dayOfWeek = ["zo","ma","di","wo","do","vr","za"].indexOf(nlParts.weekday); // 0=zondag

  // Morgen als YYYY-MM-DD (voor afspraken & doelen herinneringen)
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const notifications: { token: string; title: string; body: string; route: string }[] = [];

  // ── 1. Check-in herinneringen ────────────────────────────────────────────
  const { data: settings } = await supabase
    .from("settings")
    .select("user_id, checkin_reminder_time, notifications")
    .eq("checkin_reminder_enabled", true)
    .not("checkin_reminder_time", "is", null);

  if (settings && settings.length > 0) {
    const checkinUserIds = settings
      .filter((s) => {
        const [hh] = (s.checkin_reminder_time as string).split(":");
        return parseInt(hh, 10) === localHour && currentMinUTC < 15;
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
        const { data: tokens } = await supabase
          .from("push_tokens")
          .select("token")
          .in("user_id", pending);

        (tokens ?? []).forEach(({ token }) => {
          notifications.push({
            token,
            title: "Hoe gaat het vandaag?",
            body:  "Neem even een moment voor je dagelijkse check-in en houd je herstel bij.",
            route: "/check-in",
          });
        });
      }
    }
  }

  // ── 2. Medicatie herinneringen ───────────────────────────────────────────
  const { data: schemas } = await supabase
    .from("medication_schedules")
    .select("user_id, medication_name, times")
    .eq("active", true);

  if (schemas && schemas.length > 0) {
    const medUserMap = new Map<string, string[]>();
    for (const s of schemas) {
      const times = (s.times as string[] | null) ?? [];
      for (const t of times) {
        const [hh] = t.split(":").map(Number);
        if (hh === localHour && currentMinUTC < 15) {
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
        const { data: tokens } = await supabase
          .from("push_tokens")
          .select("token, user_id")
          .in("user_id", enabledUsers);

        (tokens ?? []).forEach(({ token, user_id }) => {
          const meds = medUserMap.get(user_id as string) ?? [];
          notifications.push({
            token,
            title: "Tijd voor je medicatie",
            body:  `Vergeet niet je ${meds.join(" en ")} in te nemen.`,
            route: "/medicatie",
          });
        });
      }
    }
  }

  // ── 3. Wekelijkse foto herinnering (zondag 19:00) ────────────────────────
  if (dayOfWeek === 0 && localHour === 19 && currentMinUTC < 15) {
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
      const { data: tokens } = await supabase
        .from("push_tokens")
        .select("token")
        .in("user_id", fotoUsers);

      (tokens ?? []).forEach(({ token }) => {
        notifications.push({
          token,
          title: "Leg je voortgang vast",
          body:  "Maak je wekelijkse foto en zie hoe ver je al bent gekomen.",
          route: "/dossier?tab=foto-updates",
        });
      });
    }
  }

  // ── 4. Training herinnering (dagelijks 09:00) ────────────────────────────
  if (localHour === 9 && currentMinUTC < 15) {
    const { data: trainingSettings } = await supabase
      .from("settings")
      .select("user_id, notifications");

    const trainingUsers = (trainingSettings ?? [])
      .filter((s) => {
        const n = s.notifications as Record<string, unknown>;
        return n?.training === true;
      })
      .map((s) => s.user_id as string);

    if (trainingUsers.length > 0) {
      const { data: trainingSchemas } = await supabase
        .from("training_schemas")
        .select("user_id")
        .in("user_id", trainingUsers)
        .eq("status", "gepland");

      const activeTrainers = [
        ...new Set((trainingSchemas ?? []).map((s) => s.user_id as string)),
      ];

      if (activeTrainers.length > 0) {
        const { data: tokens } = await supabase
          .from("push_tokens")
          .select("token")
          .in("user_id", activeTrainers);

        (tokens ?? []).forEach(({ token }) => {
          notifications.push({
            token,
            title: "Training staat gepland",
            body:  "Je hebt vandaag een trainingsschema. Klaar om aan de slag te gaan?",
            route: "/training",
          });
        });
      }
    }
  }

  // ── 5. Afspraak herinnering (dag ervoor om 18:00) ────────────────────────
  if (localHour === 18 && currentMinUTC < 15) {
    const { data: appointments } = await supabase
      .from("appointments")
      .select("user_id, title, time")
      .eq("date", tomorrowStr)
      .eq("reminder_enabled", true);

    if (appointments && appointments.length > 0) {
      const apptUserIds = [...new Set(appointments.map((a) => a.user_id as string))];

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

      const filteredAppts = appointments.filter((a) =>
        enabledApptUsers.has(a.user_id as string)
      );

      if (filteredAppts.length > 0) {
        const enabledIds = [...new Set(filteredAppts.map((a) => a.user_id as string))];
        const { data: tokens } = await supabase
          .from("push_tokens")
          .select("token, user_id")
          .in("user_id", enabledIds);

        (tokens ?? []).forEach(({ token, user_id }) => {
          const appt = filteredAppts.find((a) => a.user_id === user_id);
          const tijdLabel = appt?.time
            ? ` om ${(appt.time as string).slice(0, 5)}`
            : "";
          notifications.push({
            token,
            title: "Afspraak morgen",
            body:  `${appt?.title ?? "Afspraak"}${tijdLabel}. Zorg dat je goed voorbereid bent.`,
            route: "/afspraken",
          });
        });
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

      const { data: goalSettings } = await supabase
        .from("settings")
        .select("user_id, notifications")
        .in("user_id", goalUserIds);

      const enabledGoalUsers = new Set(
        (goalSettings ?? [])
          .filter((s) => {
            const n = s.notifications as Record<string, unknown>;
            return n?.mijlpalen !== false;
          })
          .map((s) => s.user_id as string)
      );

      const filteredGoals = expiredGoals.filter((g) =>
        enabledGoalUsers.has(g.user_id as string)
      );

      if (filteredGoals.length > 0) {
        const enabledIds = [...new Set(filteredGoals.map((g) => g.user_id as string))];
        const { data: tokens } = await supabase
          .from("push_tokens")
          .select("token, user_id")
          .in("user_id", enabledIds);

        (tokens ?? []).forEach(({ token, user_id }) => {
          const goal = filteredGoals.find((g) => g.user_id === user_id);
          notifications.push({
            token,
            title: "Je deadline nadert",
            body:  `'${goal?.title ?? "Jouw doel"}' loopt morgen af. Geef het nog één keer alles!`,
            route: "/doelstellingen",
          });
        });
      }
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

  // ── Verstuur alle notificaties via FCM v1 ────────────────────────────────
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

  return new Response(
    JSON.stringify({ sent, errors: errors.slice(0, 5) }),
    { headers: { "Content-Type": "application/json" } }
  );
});
