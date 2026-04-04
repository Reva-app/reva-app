// ─── Notification types ────────────────────────────────────────────────────────
// Single source of truth for all notification logic.
// All generators are pure functions: same inputs → same outputs.
// Read/logged state is persisted in the store; notifications are derived, never stored.
//
// To add a new type:
//   1. Add to NotificationType union
//   2. Write a generator function
//   3. Call it from generateAllNotifications()
//   4. Add rendering in NotificationPanel.tsx

import type {
  MedicatieSchema,
  CheckIn,
  Appointment,
  DagboekWorkout,
  TrainingSchema,
  FotoUpdate,
  Mijlpaal,
} from "./data";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "medicatie"
  | "checkin"
  | "afspraak"
  | "training"
  | "foto"
  | "mijlpaal";

export type NotificationStatus = "due" | "upcoming" | "info" | "motivatie";

export interface AppNotification {
  /** Stable, deterministic ID — unique per trigger */
  id: string;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  description: string;
  /** "HH:MM" — when relevant */
  scheduledAt?: string;
  /** "YYYY-MM-DD" */
  scheduledDate: string;
  /** Sorting priority: lower = more urgent */
  priority: number;

  // Medicatie-specific (kept for backward compat with InnameModal)
  relatedMedication?: string;
  relatedScheduleId?: string;

  // CTA config — consumed by the panel
  cta?: {
    label: string;
    /** "modal:checkin" | "navigate:/dagboek" | "action:innemen" */
    action: string;
  };
  ctaSecondary?: {
    label: string;
    action: string;
  };
}

// ─── Shared time helpers ───────────────────────────────────────────────────────

export function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function localTomorrow(d: Date): string {
  const t = new Date(d);
  t.setDate(t.getDate() + 1);
  return localDateStr(t);
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function displayNaam(naam: string, naamAnders: string): string {
  return naam === "Anders" && naamAnders.trim() ? naamAnders.trim() : naam;
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("nl-NL", {
    weekday: "long", day: "numeric", month: "long",
  });
}

// ─── Generator: Medicatie ─────────────────────────────────────────────────────

const MED_DUE_WINDOW     = 120; // show "due" for up to 2h after time
const MED_UPCOMING_WINDOW = 90; // warn 90 min before

function generateMedicatieNotificationsInternal(
  schemas: MedicatieSchema[],
  now: Date
): AppNotification[] {
  const todayStr  = localDateStr(now);
  const nowMin    = now.getHours() * 60 + now.getMinutes();
  const result: AppNotification[] = [];

  for (const schema of schemas) {
    if (!schema.actief) continue;
    const naam = displayNaam(schema.naam, schema.naamAnders);

    for (const time of schema.tijden) {
      const schMin = timeToMinutes(time);
      const diff   = schMin - nowMin;

      let status: NotificationStatus | null = null;
      if (diff < 0 && diff >= -MED_DUE_WINDOW)          status = "due";
      else if (diff >= 0 && diff <= MED_UPCOMING_WINDOW) status = "upcoming";
      if (!status) continue;

      result.push({
        id:                `med-${schema.id}-${todayStr}-${time}`,
        type:              "medicatie",
        status,
        priority:          status === "due" ? 1 : 2,
        title:             status === "due" ? `Tijd voor ${naam}` : `${naam} om ${time}`,
        description:       status === "due"
          ? `Gepland om ${time} · Volgens medicatieschema`
          : `Herinnering · Gepland om ${time}`,
        scheduledAt:       time,
        scheduledDate:     todayStr,
        relatedMedication: naam,
        relatedScheduleId: schema.id,
        cta:               { label: "Direct innemen", action: "action:innemen" },
        ctaSecondary:      { label: "Aanpassen", action: "action:aanpassen" },
      });
    }
  }

  return result;
}

// kept as named export for backward compat with existing TopBar import
export const generateMedicatieNotifications = generateMedicatieNotificationsInternal;

// ─── Generator: Check-in ──────────────────────────────────────────────────────

function generateCheckinNotifications(
  checkIns: CheckIn[],
  now: Date
): AppNotification[] {
  const hour    = now.getHours();
  const today   = localDateStr(now);
  if (hour < 18) return []; // only show after 18:00

  const hasToday = checkIns.some(c => c.date === today);
  if (hasToday) return [];

  return [{
    id:           `checkin-${today}`,
    type:         "checkin",
    status:       "info",
    priority:     3,
    title:        "Je check-in staat nog open",
    description:  "Hoe gaat het vandaag met je herstel? Vul je dagelijkse check-in in.",
    scheduledDate: today,
    cta:          { label: "Check-in invullen", action: "modal:checkin" },
  }];
}

// ─── Generator: Afspraken ─────────────────────────────────────────────────────

function generateAfspraakNotifications(
  appointments: Appointment[],
  now: Date
): AppNotification[] {
  const today    = localDateStr(now);
  const tomorrow = localTomorrow(now);
  const nowMin   = now.getHours() * 60 + now.getMinutes();
  const result: AppNotification[] = [];

  for (const apt of appointments) {
    // Today: within 2 hours
    if (apt.date === today) {
      const aptMin = timeToMinutes(apt.time);
      const diff   = aptMin - nowMin;
      if (diff > 0 && diff <= 120) {
        result.push({
          id:           `apt-soon-${apt.id}-${today}`,
          type:         "afspraak",
          status:       "due",
          priority:     0, // highest — appointment today
          title:        apt.title,
          description:  `Je afspraak begint over ${diff <= 60 ? `${diff} minuten` : "2 uur"} · ${apt.time}${apt.location ? ` · ${apt.location}` : ""}`,
          scheduledAt:  apt.time,
          scheduledDate: today,
          cta:          { label: "Bekijk in dagboek", action: "navigate:/dagboek" },
        });
      }
    }

    // Tomorrow: remind today (regardless of time)
    if (apt.date === tomorrow) {
      result.push({
        id:           `apt-morgen-${apt.id}`,
        type:         "afspraak",
        status:       "upcoming",
        priority:     2,
        title:        apt.title,
        description:  `Morgen heb je een afspraak gepland · ${apt.time}${apt.location ? ` · ${apt.location}` : ""}`,
        scheduledAt:  apt.time,
        scheduledDate: tomorrow,
        cta:          { label: "Bekijk in dagboek", action: "navigate:/dagboek" },
      });
    }
  }

  return result;
}

// ─── Generator: Training ──────────────────────────────────────────────────────

function generateTrainingNotifications(
  workouts: DagboekWorkout[],
  schemas: TrainingSchema[],
  now: Date
): AppNotification[] {
  const hour  = now.getHours();
  const today = localDateStr(now);
  if (hour < 17) return []; // only after 17:00

  const openToday = workouts.filter(w => w.date === today && !w.completed);
  if (openToday.length === 0) return [];

  const first  = openToday[0]!;
  const schema = schemas.find(s => s.id === first.schemaId);
  const naam   = schema ? schema.title : first.title;

  return [{
    id:           `training-${today}`,
    type:         "training",
    status:       "info",
    priority:     3,
    title:        `Training: ${naam}`,
    description:  "Je training van vandaag staat nog open. Klaar om te bewegen?",
    scheduledDate: today,
    cta:          { label: "Training openen", action: "navigate:/dagboek" },
  }];
}

// ─── Generator: Foto update ───────────────────────────────────────────────────

const FOTO_REMINDER_DAYS = 7;

function generateFotoNotifications(
  fotoUpdates: FotoUpdate[],
  now: Date
): AppNotification[] {
  const today = localDateStr(now);
  const sorted = [...fotoUpdates].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0];

  if (!latest) {
    return [{
      id:           `foto-eerste-${today}`,
      type:         "foto",
      status:       "info",
      priority:     5,
      title:        "Voeg een foto update toe",
      description:  "Documenteer je herstel met een eerste foto update.",
      scheduledDate: today,
      cta:          { label: "Foto toevoegen", action: "navigate:/dossier?tab=foto-updates" },
    }];
  }

  const diffDays = (now.getTime() - new Date(latest.date + "T12:00:00").getTime()) / 86400000;
  if (diffDays < FOTO_REMINDER_DAYS) return [];

  return [{
    id:           `foto-reminder-${today}`,
    type:         "foto",
    status:       "info",
    priority:     5,
    title:        "Tijd voor een nieuwe foto update",
    description:  `Laatste foto was ${Math.round(diffDays)} dagen geleden. Documenteer je voortgang.`,
    scheduledDate: today,
    cta:          { label: "Foto toevoegen", action: "navigate:/dossier?tab=foto-updates" },
  }];
}

// ─── Generator: Mijlpaal ─────────────────────────────────────────────────────

function generateMijlpaalNotifications(
  mijlpalen: Mijlpaal[],
  now: Date
): AppNotification[] {
  const today = localDateStr(now);

  // Recent bereikt (vandaag)
  const vandaagBehaald = mijlpalen.filter(
    m => m.completed && m.completedAt?.slice(0, 10) === today
  );

  if (vandaagBehaald.length > 0) {
    const m = vandaagBehaald[0]!;
    return [{
      id:           `mijlpaal-behaald-${m.id}`,
      type:         "mijlpaal",
      status:       "motivatie",
      priority:     4,
      title:        "Mijlpaal behaald!",
      description:  `Sterk bezig. Je hebt "${m.title}" bereikt.`,
      scheduledDate: today,
      cta:          { label: "Bekijk doelstellingen", action: "navigate:/doelstellingen" },
    }];
  }

  return [];
}

// ─── Master generator ─────────────────────────────────────────────────────────

export interface AllNotificationsInput {
  medicatieSchemas: MedicatieSchema[];
  checkIns: CheckIn[];
  appointments: Appointment[];
  dagboekWorkouts: DagboekWorkout[];
  trainingSchemas: TrainingSchema[];
  fotoUpdates: FotoUpdate[];
  mijlpalen: Mijlpaal[];
}

export function generateAllNotifications(
  input: AllNotificationsInput,
  now: Date
): AppNotification[] {
  const all: AppNotification[] = [
    ...generateAfspraakNotifications(input.appointments, now),
    ...generateMedicatieNotificationsInternal(input.medicatieSchemas, now),
    ...generateTrainingNotifications(input.dagboekWorkouts, input.trainingSchemas, now),
    ...generateCheckinNotifications(input.checkIns, now),
    ...generateMijlpaalNotifications(input.mijlpalen, now),
    ...generateFotoNotifications(input.fotoUpdates, now),
  ];

  // Sort: by priority asc, then by scheduledAt
  return all.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const aMin = a.scheduledAt ? timeToMinutes(a.scheduledAt) : 0;
    const bMin = b.scheduledAt ? timeToMinutes(b.scheduledAt) : 0;
    return aMin - bMin;
  });
}
