// ─── Mappers: DB rows ↔ App types ────────────────────────────────────────────
// Converts snake_case DB rows to camelCase app types and vice versa.

import type {
  Profile, CheckIn, Appointment, MedicatieLog, MedicatieSchema,
  Doel, Mijlpaal, TrainingOefening, TrainingSchema, TrainingLog,
  DagboekWorkout, DossierDocument, FotoUpdate, Contactpersoon,
} from "@/lib/data";
import type { NotificationSettings } from "@/lib/data";
import type {
  DbProfile, DbSettings, DbCheckIn, DbAppointment,
  DbTrainingExercise, DbTrainingSchema, DbTrainingLog, DbDiaryWorkout,
  DbMedicationLog, DbMedicationSchedule,
  DbGoal, DbMilestone,
  DbDossierDocument, DbDossierPhotoUpdate, DbDossierContact,
} from "./types";

// ─── Profile ──────────────────────────────────────────────────────────────────

export function dbToProfile(p: DbProfile, s: DbSettings | null): Profile {
  return {
    naam:                    p.full_name ?? "",
    email:                   p.email ?? "",
    profielfoto:             p.avatar_url ?? "",
    authProvider:            (p.auth_provider as Profile["authProvider"]) ?? "email",
    geboortedatum:           s?.birth_date ?? "",
    blessureDatum:           s?.injury_date ?? "",
    operatieDatum:           s?.surgery_date ?? "",
    blessureType:            s?.injury_type ?? "",
    blessureTypeAnders:      s?.injury_type_other ?? "",
    situatieOmschrijving:    s?.injury_description ?? "",
    zorgverzekeraar:         s?.insurer_name ?? "",
    zorgverzekeraaarAnders:  s?.insurer_other ?? "",
    polisnummer:             s?.policy_number ?? "",
    aanvullendeVerzekeringen: s?.supplementary_insurances ?? [],
    aantalFysio:             s?.physio_sessions_total ?? "",
  };
}

export function profileToDb(profile: Partial<Profile>): Partial<DbProfile> {
  const result: Partial<DbProfile> = {};
  if (profile.naam       !== undefined) result.full_name    = profile.naam;
  if (profile.email      !== undefined) result.email        = profile.email;
  if (profile.profielfoto !== undefined) result.avatar_url  = profile.profielfoto;
  if (profile.authProvider !== undefined) result.auth_provider = profile.authProvider;
  return result;
}

export function profileToSettings(profile: Partial<Profile>): Partial<DbSettings> {
  const result: Partial<DbSettings> = {};
  if (profile.geboortedatum            !== undefined) result.birth_date               = profile.geboortedatum            || null as unknown as string;
  if (profile.blessureDatum            !== undefined) result.injury_date              = profile.blessureDatum            || null as unknown as string;
  if (profile.operatieDatum            !== undefined) result.surgery_date             = profile.operatieDatum            || null as unknown as string;
  if (profile.blessureType             !== undefined) result.injury_type              = profile.blessureType             || null as unknown as string;
  if (profile.blessureTypeAnders       !== undefined) result.injury_type_other        = profile.blessureTypeAnders       || null as unknown as string;
  if (profile.situatieOmschrijving     !== undefined) result.injury_description       = profile.situatieOmschrijving     || null as unknown as string;
  if (profile.zorgverzekeraar          !== undefined) result.insurer_name             = profile.zorgverzekeraar          || null as unknown as string;
  if (profile.zorgverzekeraaarAnders   !== undefined) result.insurer_other            = profile.zorgverzekeraaarAnders   || null as unknown as string;
  if (profile.polisnummer              !== undefined) result.policy_number            = profile.polisnummer              || null as unknown as string;
  if (profile.aanvullendeVerzekeringen !== undefined) result.supplementary_insurances = profile.aanvullendeVerzekeringen;
  if (profile.aantalFysio              !== undefined) result.physio_sessions_total    = profile.aantalFysio              || null as unknown as string;
  return result;
}

// ─── Notification settings ────────────────────────────────────────────────────

/**
 * Maps the `notifications` JSONB blob + optional dedicated columns to NotificationSettings.
 * Dedicated columns (`checkin_reminder_enabled`, `checkin_reminder_time`) take precedence
 * over the JSONB blob when they are not null.
 */
export function dbToNotificationSettings(
  raw: Record<string, unknown>,
  row?: Pick<DbSettings, "checkin_reminder_enabled" | "checkin_reminder_time"> | null
): NotificationSettings {
  return {
    checkin:    row?.checkin_reminder_enabled   ?? (raw.checkin    as boolean | undefined) ?? true,
    afspraken:  (raw.afspraken  as boolean | undefined) ?? true,
    medicatie:  (raw.medicatie  as boolean | undefined) ?? true,
    training:   (raw.training   as boolean | undefined) ?? false,
    foto:       (raw.foto       as boolean | undefined) ?? false,
    mijlpalen:  (raw.mijlpalen  as boolean | undefined) ?? true,
    checkinTijd: row?.checkin_reminder_time ?? (raw.checkinTijd as string | undefined) ?? "20:00",
  };
}

// ─── CheckIn ─────────────────────────────────────────────────────────────────

export function dbToCheckIn(row: DbCheckIn): CheckIn {
  return {
    id:              row.id,
    date:            row.date,
    dagscore:        row.day_score,
    pijn:            row.pain_score ?? 0,
    mobiliteit:      row.mobility_score ?? 0,
    energie:         row.energy_score ?? 0,
    slaap:           row.sleep_score ?? 0,
    stemming:        row.mood_score ?? 0,
    zwelling:        row.swelling ?? false,
    notitie:         row.note ?? undefined,
    trainingGedaan:  row.training_done ?? false,
    medicatieGebruikt: row.medication_used ?? false,
  };
}

export function checkInToDb(ci: CheckIn, userId: string): Omit<DbCheckIn, "created_at" | "updated_at"> {
  return {
    id:              ci.id,
    user_id:         userId,
    date:            ci.date,
    day_score:       ci.dagscore,
    pain_score:      ci.pijn || null,
    mobility_score:  ci.mobiliteit || null,
    energy_score:    ci.energie || null,
    sleep_score:     ci.slaap || null,
    mood_score:      ci.stemming || null,
    swelling:        ci.zwelling,
    note:            ci.notitie ?? null,
    training_done:   ci.trainingGedaan,
    medication_used: ci.medicatieGebruikt,
  };
}

// ─── Appointment ─────────────────────────────────────────────────────────────

export function dbToAppointment(row: DbAppointment): Appointment {
  return {
    id:           row.id,
    title:        row.title,
    type:         (row.appointment_type as Appointment["type"]) ?? "ziekenhuis",
    date:         row.date,
    time:         row.time ?? "",
    location:     row.location ?? "",
    behandelaar:  row.provider_name ?? "",
    voorbereiding: row.preparation ?? undefined,
    meenemen:     row.bring_items ?? undefined,
    notities:     row.notes_before ?? undefined,
    uitkomst:     row.outcome_after ?? undefined,
    vervolgactie: row.follow_up_action ?? undefined,
    herinnering:  row.reminder_enabled,
  };
}

export function appointmentToDb(apt: Appointment, userId: string): Omit<DbAppointment, "created_at" | "updated_at" | "status"> {
  return {
    id:               apt.id,
    user_id:          userId,
    title:            apt.title,
    appointment_type: apt.type,
    date:             apt.date,
    time:             apt.time || null,
    location:         apt.location || null,
    provider_name:    apt.behandelaar || null,
    preparation:      apt.voorbereiding ?? null,
    bring_items:      apt.meenemen ?? null,
    notes_before:     apt.notities ?? null,
    outcome_after:    apt.uitkomst ?? null,
    follow_up_action: apt.vervolgactie ?? null,
    reminder_enabled: apt.herinnering,
  };
}

// ─── Training exercise ────────────────────────────────────────────────────────

export function dbToTrainingOefening(row: DbTrainingExercise): TrainingOefening {
  return {
    id:          row.id,
    title:       row.title,
    type:        (row.exercise_type as TrainingOefening["type"]) ?? "Anders",
    description: row.description ?? "",
    repetitions: row.repetitions ?? "",
    loadOrTime:  row.load_or_time ?? "",
    location:    (row.location_label as TrainingOefening["location"]) ?? "Thuis",
    note:        row.note ?? "",
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

export function trainingOefeningToDb(o: TrainingOefening, userId: string): Omit<DbTrainingExercise, "created_at" | "updated_at"> {
  return {
    id:             o.id,
    user_id:        userId,
    title:          o.title,
    exercise_type:  o.type,
    description:    o.description,
    repetitions:    o.repetitions,
    load_or_time:   o.loadOrTime,
    location_label: o.location,
    note:           o.note,
  };
}

// ─── Training schema ──────────────────────────────────────────────────────────

export function dbToTrainingSchema(row: DbTrainingSchema): TrainingSchema {
  return {
    id:          row.id,
    title:       row.title,
    status:      (row.status as TrainingSchema["status"]) ?? "actief",
    duration:    row.duration ?? "",
    exerciseIds: [],
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

export function trainingSchemaToDb(s: TrainingSchema, userId: string): Omit<DbTrainingSchema, "created_at" | "updated_at"> {
  return {
    id:       s.id,
    user_id:  userId,
    title:    s.title,
    status:   s.status,
    duration: s.duration,
  };
}

// ─── Training log ─────────────────────────────────────────────────────────────

export function dbToTrainingLog(row: DbTrainingLog): TrainingLog {
  return {
    id:                    row.id,
    schemaId:              row.schema_id ?? undefined,
    title:                 row.title,
    date:                  row.date,
    completed:             row.completed,
    completedAt:           row.completed_at ?? undefined,
    reflection:            row.reflection ?? undefined,
    completedExerciseIds:  row.completed_exercise_ids ?? [],
    note:                  row.note ?? undefined,
    durationMinutes:       row.duration_minutes ?? undefined,
    createdAt:             row.created_at,
  };
}

export function trainingLogToDb(l: TrainingLog, userId: string): Omit<DbTrainingLog, "created_at" | "updated_at"> {
  return {
    id:                     l.id,
    user_id:                userId,
    schema_id:              l.schemaId || null,
    title:                  l.title || l.note || "Training",
    date:                   l.date,
    status:                 null,
    note:                   l.note || null,
    completed_exercise_ids: l.completedExerciseIds ?? [],
    duration_minutes:       l.durationMinutes ?? null,
    completed:              l.completed,
    completed_at:           l.completedAt ?? null,
    reflection:             l.reflection ?? null,
  };
}

// ─── Diary workout ────────────────────────────────────────────────────────────

export function dbToDagboekWorkout(row: DbDiaryWorkout): DagboekWorkout {
  return {
    id:          row.id,
    date:        row.date,
    title:       row.title,
    schemaId:    row.schema_id ?? undefined,
    completed:   row.completed,
    completedAt: row.completed_at ?? undefined,
    reflection:  row.reflection ?? undefined,
    createdAt:   row.created_at,
  };
}

export function dagboekWorkoutToDb(w: DagboekWorkout, userId: string): Omit<DbDiaryWorkout, "created_at" | "updated_at"> {
  return {
    id:           w.id,
    user_id:      userId,
    date:         w.date,
    title:        w.title,
    schema_id:    w.schemaId ?? null,
    completed:    w.completed,
    completed_at: w.completedAt ?? null,
    reflection:   w.reflection ?? null,
  };
}

// ─── Medication log ───────────────────────────────────────────────────────────

export function dbToMedicatieLog(row: DbMedicationLog): MedicatieLog {
  return {
    id:         row.id,
    date:       row.date,
    time:       row.time ?? "",
    naam:       row.medication_name,
    dosering:   row.dosage ?? "",
    hoeveelheid: row.quantity ?? "",
    reden:      row.reason ?? "",
    effect:     row.effect ?? undefined,
    notitie:    row.note ?? undefined,
  };
}

export function medicatieLogToDb(m: MedicatieLog, userId: string): Omit<DbMedicationLog, "created_at" | "updated_at"> {
  return {
    id:              m.id,
    user_id:         userId,
    date:            m.date,
    time:            m.time || null,
    medication_name: m.naam,
    dosage:          m.dosering || null,
    quantity:        m.hoeveelheid || null,
    reason:          m.reden || null,
    effect:          m.effect ?? null,
    note:            m.notitie ?? null,
  };
}

// ─── Medication schema ────────────────────────────────────────────────────────

export function dbToMedicatieSchema(row: DbMedicationSchedule): MedicatieSchema {
  return {
    id:          row.id,
    naam:        row.medication_name as MedicatieSchema["naam"],
    naamAnders:  row.name_other ?? "",
    dosering:    row.dosage ?? "",
    hoeveelheid: row.quantity ?? "",
    tijden:      [], // populated from medication_schedule_times at load time
    actief:      row.active,
    notitie:     row.note ?? "",
  };
}

export function medicatieSchemaToDb(s: MedicatieSchema, userId: string): Omit<DbMedicationSchedule, "created_at" | "updated_at"> {
  return {
    id:              s.id,
    user_id:         userId,
    medication_name: s.naam,
    name_other:      s.naamAnders || null,
    dosage:          s.dosering || null,
    quantity:        s.hoeveelheid || null,
    active:          s.actief,
    note:            s.notitie || null,
  };
}

// ─── Goal ─────────────────────────────────────────────────────────────────────

export function dbToDoel(row: DbGoal): Doel {
  return {
    id:          row.id,
    type:        row.goal_type as Doel["type"],
    icon:        row.icon ?? "",
    title:       row.title,
    description: row.description ?? "",
    targetDate:  row.target_date ?? "",
    completed:   row.completed,
    completedAt: row.completed_at ?? undefined,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

export function doelToDb(d: Doel, userId: string): Omit<DbGoal, "created_at" | "updated_at"> {
  return {
    id:          d.id,
    user_id:     userId,
    goal_type:   d.type,
    icon:        d.icon || null,
    title:       d.title,
    description: d.description || null,
    target_date: d.targetDate || null,
    completed:   d.completed,
    completed_at: d.completedAt ?? null,
  };
}

// ─── Milestone ────────────────────────────────────────────────────────────────

export function dbToMijlpaal(row: DbMilestone): Mijlpaal {
  return {
    id:              row.id,
    fase:            row.phase ?? "",
    title:           row.title,
    completed:       row.completed,
    completedAt:     row.completed_at ?? undefined,
    reflectionText:  row.reflection_text ?? undefined,
    painScore:       row.pain_score ?? undefined,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
  };
}

export function mijlpaalToDb(m: Mijlpaal, userId: string, sortOrder: number): Omit<DbMilestone, "created_at" | "updated_at"> {
  return {
    id:              m.id,
    user_id:         userId,
    phase:           m.fase || null,
    title:           m.title,
    completed:       m.completed,
    completed_at:    m.completedAt ?? null,
    reflection_text: m.reflectionText ?? null,
    pain_score:      m.painScore ?? null,
    sort_order:      sortOrder,
  };
}

// ─── Dossier document ─────────────────────────────────────────────────────────

export function dbToDossierDocument(row: DbDossierDocument): DossierDocument {
  return {
    id:                   row.id,
    title:                row.title,
    type:                 (row.file_type as DossierDocument["type"]) ?? "overig",
    date:                 row.date ?? "",
    zorgverlener:         row.provider_type ?? "",
    zorgverlenerAnders:   row.provider_name ?? undefined,
    omschrijving:         row.description ?? "",
    bestandsnaam:         row.file_name ?? undefined,
  };
}

export function dossierDocumentToDb(d: DossierDocument, userId: string): Omit<DbDossierDocument, "created_at" | "updated_at"> {
  return {
    id:            d.id,
    user_id:       userId,
    title:         d.title,
    file_name:     d.bestandsnaam ?? null,
    file_url:      null,
    file_type:     d.type,
    provider_type: d.zorgverlener || null,
    provider_name: d.zorgverlenerAnders ?? null,
    date:          d.date || null,
    description:   d.omschrijving || null,
  };
}

// ─── Foto update ──────────────────────────────────────────────────────────────

export function dbToFotoUpdate(row: DbDossierPhotoUpdate): FotoUpdate {
  return {
    id:     row.id,
    date:   row.date,
    notitie: row.note ?? undefined,
  };
}

export function fotoUpdateToDb(f: FotoUpdate, userId: string): Omit<DbDossierPhotoUpdate, "created_at" | "updated_at"> {
  return {
    id:          f.id,
    user_id:     userId,
    date:        f.date,
    week_number: null,
    image_url:   null,
    image_name:  null,
    note:        f.notitie ?? null,
  };
}

// ─── Contactpersoon ───────────────────────────────────────────────────────────

export function dbToContactpersoon(row: DbDossierContact): Contactpersoon {
  return {
    id:          row.id,
    naam:        row.name,
    functie:     row.role ?? "",
    organisatie: row.organization ?? "",
    telefoon:    row.phone ?? "",
    email:       row.email ?? "",
    notitie:     row.note ?? undefined,
  };
}

export function contactpersoonToDb(c: Contactpersoon, userId: string): Omit<DbDossierContact, "created_at" | "updated_at"> {
  return {
    id:           c.id,
    user_id:      userId,
    name:         c.naam,
    role:         c.functie || null,
    organization: c.organisatie || null,
    phone:        c.telefoon || null,
    email:        c.email || null,
    note:         c.notitie ?? null,
  };
}
