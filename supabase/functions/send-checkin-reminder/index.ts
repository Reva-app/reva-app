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
 *   FCM_SERVER_KEY — Firebase Server Key
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FCM_ENDPOINT = "https://fcm.googleapis.com/fcm/send";

Deno.serve(async () => {
  const supabaseUrl     = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const fcmKey          = Deno.env.get("FCM_SERVER_KEY");

  if (!fcmKey) {
    return new Response("FCM_SERVER_KEY niet ingesteld", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now        = new Date();
  const today      = now.toISOString().slice(0, 10);
  const currentHourUTC = now.getUTCHours();
  const currentMinUTC  = now.getUTCMinutes();
  // CET = UTC+1, CEST = UTC+2 (simpele benadering: gebruik UTC+1)
  const localHour  = (currentHourUTC + 1) % 24;
  const dayOfWeek  = now.getUTCDay(); // 0=zondag

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
    // Filter op users waarvan het reminder-uur overeenkomt met nu
    const checkinUserIds = settings
      .filter((s) => {
        const [hh] = (s.checkin_reminder_time as string).split(":");
        return parseInt(hh, 10) === localHour && currentMinUTC < 15;
      })
      .map((s) => s.user_id as string);

    if (checkinUserIds.length > 0) {
      // Verwijder users die vandaag al een check-in hebben
      const { data: existing } = await supabase
        .from("check_ins")
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
            title: "Dagelijkse check-in",
            body: "Hoe gaat het vandaag met jouw herstel? Vul je check-in in.",
            route: "/check-in",
          });
        });
      }
    }
  }

  // ── 2. Medicatie herinneringen ───────────────────────────────────────────
  // Haal alle actieve schema's op met hun tijden
  const { data: schemas } = await supabase
    .from("medication_schedules")
    .select("user_id, medication_name, times")
    .eq("active", true);

  if (schemas && schemas.length > 0) {
    // Groepeer per user
    const medUserMap = new Map<string, string[]>();
    for (const s of schemas) {
      const times = (s.times as string[] | null) ?? [];
      for (const t of times) {
        const [hh, mm] = t.split(":").map(Number);
        // Match als uur klopt én we binnen de eerste 15 minuten zitten
        if (hh === localHour && currentMinUTC < 15) {
          if (!medUserMap.has(s.user_id)) medUserMap.set(s.user_id, []);
          medUserMap.get(s.user_id)!.push(s.medication_name as string);
        }
      }
    }

    if (medUserMap.size > 0) {
      // Check welke users medicatie-notificaties aan hebben
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
            title: "Medicatie herinnering",
            body: `Tijd voor: ${meds.join(", ")}`,
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
          title: "Wekelijkse foto update",
          body: "Leg jouw herstelvoortgang vast met een nieuwe foto.",
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
      // Stuur alleen als user geplande schema's heeft
      const { data: trainingSchemas } = await supabase
        .from("training_schemas")
        .select("user_id")
        .in("user_id", trainingUsers)
        .eq("status", "gepland");

      const activeTrainers = [...new Set((trainingSchemas ?? []).map((s) => s.user_id as string))];

      if (activeTrainers.length > 0) {
        const { data: tokens } = await supabase
          .from("push_tokens")
          .select("token")
          .in("user_id", activeTrainers);

        (tokens ?? []).forEach(({ token }) => {
          notifications.push({
            token,
            title: "Training vandaag",
            body: "Je hebt een gepland trainingsschema. Vergeet niet te trainen!",
            route: "/training",
          });
        });
      }
    }
  }

  // ── 5. Afspraak herinnering (dag ervoor om 18:00) ────────────────────────
  if (localHour === 18 && currentMinUTC < 15) {
    // Haal alle afspraken op voor morgen waarbij herinnering aan staat
    const { data: appointments } = await supabase
      .from("appointments")
      .select("user_id, title, time")
      .eq("date", tomorrowStr)
      .eq("reminder_enabled", true);

    if (appointments && appointments.length > 0) {
      // Check welke users afspraak-notificaties aan hebben
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
          // Pak de eerste afspraak van morgen voor deze user
          const appt = filteredAppts.find((a) => a.user_id === user_id);
          const tijdLabel = appt?.time ? ` om ${(appt.time as string).slice(0, 5)}` : "";
          notifications.push({
            token,
            title: "Afspraak morgen",
            body: `${appt?.title ?? "Afspraak"}${tijdLabel} — vergeet je niet voor te bereiden.`,
            route: "/afspraken",
          });
        });
      }
    }
  }

  // ── 6. Doel deadline herinnering (dag ervoor om 09:00) ───────────────────
  if (localHour === 9 && currentMinUTC < 15) {
    // Doelen waarvan de deadline morgen is en die nog niet voltooid zijn
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
            // Valt onder het algemene notificatie-veld "mijlpalen" of "doelen"
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
            title: "Doel deadline morgen",
            body: `"${goal?.title ?? "Jouw doel"}" heeft morgen zijn deadline. Nog op tijd!`,
            route: "/doelstellingen",
          });
        });
      }
    }
  }

  // ── Verstuur alle notificaties ───────────────────────────────────────────
  let sent = 0;
  const errors: string[] = [];

  for (const { token, title, body, route } of notifications) {
    const res = await fetch(FCM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `key=${fcmKey}`,
      },
      body: JSON.stringify({
        to: token,
        notification: { title, body, sound: "default" },
        data: { route },
        priority: "high",
      }),
    });

    if (res.ok) {
      sent++;
    } else {
      const text = await res.text();
      errors.push(text.slice(0, 100));
    }
  }

  console.info(`[push] sent=${sent} errors=${errors.length} total=${notifications.length}`);

  return new Response(
    JSON.stringify({ sent, errors: errors.slice(0, 5) }),
    { headers: { "Content-Type": "application/json" } }
  );
});
