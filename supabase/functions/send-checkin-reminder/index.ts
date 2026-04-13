/**
 * send-checkin-reminder
 *
 * Supabase Edge Function — stuur een check-in herinnering via FCM.
 *
 * Wordt getriggerd door een Supabase cron job:
 *   Schedule: elke 15 minuten — de functie filtert zelf op de juiste users.
 *
 * Vereiste secrets (stel in via: supabase secrets set KEY=VALUE):
 *   FCM_SERVER_KEY   — Firebase Server Key (uit Firebase Console → Projectinstellingen → Cloud Messaging)
 *
 * Flow:
 *  1. Bepaal het huidige UTC-uur en de lokale tijdzones (we gebruiken een
 *     simpele benadering: stuur op het ingestelde uur in UTC+1/+2).
 *  2. Haal alle users op die:
 *     - check-in melding aan hebben staan (checkin_reminder_enabled = true)
 *     - vandaag nog geen check-in hebben ingevuld
 *     - een checkin_reminder_time hebben die overeenkomt met het huidige uur
 *  3. Haal de FCM tokens op voor die users.
 *  4. Stuur de notificaties via de FCM v1 API.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FCM_ENDPOINT = "https://fcm.googleapis.com/fcm/send";

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const fcmKey = Deno.env.get("FCM_SERVER_KEY");

  if (!fcmKey) {
    return new Response("FCM_SERVER_KEY niet ingesteld", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ── Bepaal huidig uur (UTC, we ronden op het kwartier) ──────────────────
  const now = new Date();
  // Format: "HH:MM" — vergelijk met checkin_reminder_time (bijv. "20:00")
  const currentHour = now.getUTCHours();

  // ── Zoek users die een herinnering moeten krijgen ──────────────────────
  const { data: settings, error: settingsErr } = await supabase
    .from("settings")
    .select("user_id, checkin_reminder_time")
    .eq("checkin_reminder_enabled", true)
    .not("checkin_reminder_time", "is", null);

  if (settingsErr) {
    console.error("Settings ophalen mislukt:", settingsErr.message);
    return new Response("DB fout", { status: 500 });
  }

  // Vandaag in ISO-formaat (YYYY-MM-DD)
  const today = now.toISOString().slice(0, 10);

  // Filter: reminder time overeenkomt met huidig uur (UTC+1 benadering)
  const targetUsers = (settings ?? []).filter((s) => {
    if (!s.checkin_reminder_time) return false;
    const [hh] = (s.checkin_reminder_time as string).split(":");
    // Vergelijk met CET (UTC+1) — simpele benadering
    const reminderHourUTC = (parseInt(hh, 10) - 1 + 24) % 24;
    return reminderHourUTC === currentHour;
  });

  if (targetUsers.length === 0) {
    return new Response(JSON.stringify({ sent: 0, skipped: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const userIds = targetUsers.map((s) => s.user_id as string);

  // ── Filter users die vandaag al een check-in hebben ────────────────────
  const { data: existingCheckIns } = await supabase
    .from("check_ins")
    .select("user_id")
    .in("user_id", userIds)
    .eq("date", today);

  const checkedInUserIds = new Set((existingCheckIns ?? []).map((c) => c.user_id));
  const pendingUserIds = userIds.filter((id) => !checkedInUserIds.has(id));

  if (pendingUserIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0, skipped: userIds.length }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Haal FCM tokens op ────────────────────────────────────────────────
  const { data: tokens, error: tokenErr } = await supabase
    .from("push_tokens")
    .select("token, platform")
    .in("user_id", pendingUserIds);

  if (tokenErr) {
    console.error("Tokens ophalen mislukt:", tokenErr.message);
    return new Response("DB fout", { status: 500 });
  }

  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0, skipped: pendingUserIds.length }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Stuur FCM notificaties ────────────────────────────────────────────
  let sent = 0;
  const errors: string[] = [];

  for (const { token } of tokens) {
    const body = {
      to: token,
      notification: {
        title: "Dagelijkse check-in",
        body: "Hoe gaat het vandaag met jouw herstel? Vul je check-in in.",
        sound: "default",
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      data: {
        route: "/check-in",
      },
      priority: "high",
    };

    const res = await fetch(FCM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `key=${fcmKey}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      sent++;
    } else {
      const text = await res.text();
      errors.push(text.slice(0, 100));
    }
  }

  console.info(`[send-checkin-reminder] sent=${sent} errors=${errors.length}`);

  return new Response(
    JSON.stringify({ sent, errors: errors.slice(0, 5) }),
    { headers: { "Content-Type": "application/json" } }
  );
});
