import { createClient } from "@/lib/supabaseClient";

function logErr(fn: string, error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return;
  console.error(`[${fn}] Supabase error — message: "${error.message}" | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`);
}

/** Moet in sync blijven met can_view_audit_log() in migratie 066. */
export const VIEW_AUDIT_LOG_ROLES = ["organization_owner"];

export type AuditAction = "insert" | "update" | "delete" | "export";

export const AUDIT_TABLE_LABELS: Record<string, string> = {
  checkins: "Check-in",
  appointments: "Afspraak",
  training_exercises: "Trainingsoefening",
  training_schemas: "Trainingsschema",
  training_logs: "Traininglog",
  medication_logs: "Medicatielog",
  medication_schedules: "Medicatieschema",
  goals: "Doel",
  milestones: "Mijlpaal",
  dossier_documents: "Dossierdocument",
  dossier_photo_updates: "Dossierfoto",
  dossier_contacts: "Contactpersoon",
  patients: "Patiëntdossier",
  patient_protocols: "Herstelplan",
  patients_csv_export: "Patiëntenexport (CSV)",
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  insert: "Aangemaakt",
  update: "Gewijzigd",
  delete: "Verwijderd",
  export: "Geëxporteerd",
};

/**
 * Zuiver technische/plumbing-velden die in geen enkele tabel iets zeggen aan
 * een fysiotherapeut die het activiteitenlog leest (interne id's, timestamps
 * die al bovenaan de detailkaart staan). Worden overal verborgen, ongeacht
 * tabel — vandaar één gedeelde set i.p.v. per-tabel configuratie.
 */
export const AUDIT_HIDDEN_FIELDS = new Set([
  "id", "user_id", "patient_id", "organization_id", "created_at", "updated_at", "completed_at",
]);

/** Dutch labels voor kolommen die over de geauditeerde tabellen heen voorkomen. */
export const AUDIT_FIELD_LABELS: Record<string, string> = {
  // checkins
  date: "Datum", day_score: "Dagscore", pain_score: "Pijnscore", mobility_score: "Mobiliteit",
  energy_score: "Energie", sleep_score: "Slaap", mood_score: "Stemming", swelling: "Zwelling",
  note: "Notitie", training_done: "Training gedaan", medication_used: "Medicatie gebruikt",
  // appointments
  title: "Titel", appointment_type: "Type afspraak", time: "Tijd", location: "Locatie",
  provider_name: "Behandelaar", preparation: "Voorbereiding", bring_items: "Mee te nemen",
  notes_before: "Notities vooraf", outcome_after: "Uitkomst achteraf", follow_up_action: "Vervolgactie",
  reminder_enabled: "Herinnering aan", status: "Status",
  // training_exercises / schemas / logs
  exercise_type: "Categorie", description: "Omschrijving", repetitions: "Herhalingen",
  load_or_time: "Belasting/tijd", location_label: "Locatie", duration: "Duur",
  exercise_ids: "Gekoppelde oefeningen", schema_id: "Trainingsschema", completed_exercise_ids: "Voltooide oefeningen",
  duration_minutes: "Duur (minuten)", completed: "Voltooid", reflection: "Reflectie",
  // medication_logs / schedules
  medication_name: "Medicatienaam", dosage: "Dosering", quantity: "Hoeveelheid", reason: "Reden",
  effect: "Effect", name_other: "Naam (anders)", times: "Tijdstippen", active: "Actief",
  // goals / milestones
  goal_type: "Type doel", icon: "Icoon", target_date: "Streefdatum", phase: "Fase",
  reflection_text: "Reflectie", sort_order: "Volgorde",
  // dossier_documents / photo_updates / contacts
  file_name: "Bestandsnaam", file_url: "Bestand", file_type: "Bestandstype",
  provider_type: "Type afzender", week_number: "Weeknummer", image_url: "Afbeelding",
  image_name: "Afbeeldingsnaam", role: "Rol", organization: "Organisatie", phone: "Telefoonnummer", email: "E-mailadres",
  // patients
  first_name: "Voornaam", last_name: "Achternaam", gender: "Geslacht", date_of_birth: "Geboortedatum",
  surgery_date: "Operatiedatum", treatment_start_date: "Startdatum behandeling", location_id: "Locatie",
  assigned_therapist_id: "Behandelend therapeut", protocol_id: "Herstelplan (oud)", injury_type: "Blessuretype",
  invited_at: "Uitgenodigd op",
  // patient_protocols
  source_protocol_id: "Op basis van herstelplan", injury_category: "Blessuretype", assigned_by: "Toegewezen door",
  assigned_at: "Toegewezen op", name: "Naam",
};

function formatAuditFieldLabel(key: string): string {
  return AUDIT_FIELD_LABELS[key] ?? key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Ja" : "Nee";
  if (typeof value === "string" && ISO_DATETIME_RE.test(value)) {
    return new Date(value).toLocaleString("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  if (typeof value === "string" && ISO_DATE_RE.test(value)) {
    return new Date(value).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
  }
  if (Array.isArray(value)) return value.length === 0 ? "—" : value.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export interface AuditFieldRow {
  key: string;
  label: string;
  oldValue: string | null;
  newValue: string;
}

/**
 * Velden waarvan de waarde zelf een uuid is die een mens niets zegt
 * (locatie/behandelaar) — deze worden via entry.refNames opgezocht naar een
 * leesbare naam i.p.v. de rauwe uuid te tonen.
 */
const AUDIT_REFERENCE_FIELDS = new Set(["location_id", "assigned_therapist_id"]);

function resolveAuditRawValue(key: string, raw: unknown, refNames?: Record<string, string>): unknown {
  if (typeof raw === "string" && AUDIT_REFERENCE_FIELDS.has(key)) {
    return refNames?.[raw] ?? raw;
  }
  return raw;
}

/**
 * Zet old_data/new_data om naar een leesbare rijenlijst i.p.v. een rauwe
 * JSON-dump: technische velden eruit (AUDIT_HIDDEN_FIELDS), Nederlandse
 * labels (AUDIT_FIELD_LABELS), locatie/behandelaar-uuid's omgezet naar namen
 * (entry.refNames, zie loadAuditLog), en bij een wijziging alleen de velden
 * die daadwerkelijk zijn veranderd.
 */
export function buildAuditFieldRows(entry: Pick<AuditLogEntry, "action" | "oldData" | "newData" | "refNames">): AuditFieldRow[] {
  const oldData = entry.oldData ?? {};
  const newData = entry.newData ?? {};
  const source = entry.action === "delete" ? oldData : newData;
  const keys = [...new Set([...Object.keys(oldData), ...Object.keys(newData)])]
    .filter((k) => !AUDIT_HIDDEN_FIELDS.has(k))
    .sort((a, b) => formatAuditFieldLabel(a).localeCompare(formatAuditFieldLabel(b), "nl"));

  const rows: AuditFieldRow[] = [];
  for (const key of keys) {
    const oldRaw = oldData[key];
    const newRaw = newData[key];
    if (entry.action === "update" && JSON.stringify(oldRaw) === JSON.stringify(newRaw)) continue;
    if (entry.action !== "update" && !(key in source)) continue;
    rows.push({
      key,
      label: formatAuditFieldLabel(key),
      oldValue: entry.action === "update" ? formatAuditValue(resolveAuditRawValue(key, oldRaw, entry.refNames)) : null,
      newValue: formatAuditValue(resolveAuditRawValue(key, entry.action === "delete" ? oldRaw : newRaw, entry.refNames)),
    });
  }
  return rows;
}

export interface AuditLogEntry {
  id: string;
  tableName: string;
  recordId: string | null;
  patientId: string | null;
  patientName: string | null;
  actorId: string | null;
  actorName: string | null;
  action: AuditAction;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: string;
  /** uuid → leesbare naam, voor locatie/behandelaar-velden binnen old_data/new_data van déze rij. */
  refNames: Record<string, string>;
}

export interface AuditLogFilters {
  patientId?: string;
  tableName?: string;
  action?: AuditAction;
  dateFrom?: string; // "YYYY-MM-DD"
  dateTo?: string;   // "YYYY-MM-DD"
}

// Pragmatisch plafond bij de huidige schaal (kleine praktijken, geen hoog
// volume) — geen server-side keyset-paginering, dat zou hier overkill zijn.
const AUDIT_LOG_LIMIT = 500;

export async function loadAuditLog(organizationId: string, filters?: AuditLogFilters): Promise<AuditLogEntry[]> {
  const supabase = createClient();
  let query = supabase
    .from("audit_log")
    .select("id, table_name, record_id, patient_id, actor_id, action, old_data, new_data, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(AUDIT_LOG_LIMIT);

  if (filters?.patientId) query = query.eq("patient_id", filters.patientId);
  if (filters?.tableName) query = query.eq("table_name", filters.tableName);
  if (filters?.action) query = query.eq("action", filters.action);
  if (filters?.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("created_at", filters.dateTo);

  const { data, error } = await query;
  if (error) { logErr("loadAuditLog", error); return []; }
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const patientIds = [...new Set(rows.map((r) => r.patient_id).filter((v): v is string => !!v))];
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter((v): v is string => !!v))];

  // location_id/assigned_therapist_id-waarden die binnen old_data/new_data
  // van elke rij voorkomen — verzameld zodat de detailkaart een naam kan
  // tonen i.p.v. de rauwe uuid (zie AUDIT_REFERENCE_FIELDS).
  const referencedLocationIds = new Set<string>();
  const referencedTherapistIds = new Set<string>();
  for (const r of rows) {
    for (const data of [r.old_data, r.new_data]) {
      const locId = (data as Record<string, unknown> | null)?.location_id;
      const therapistId = (data as Record<string, unknown> | null)?.assigned_therapist_id;
      if (typeof locId === "string") referencedLocationIds.add(locId);
      if (typeof therapistId === "string") referencedTherapistIds.add(therapistId);
    }
  }

  const [patientsRes, profilesRes, locationsRes] = await Promise.all([
    patientIds.length > 0
      ? supabase.from("patients").select("id, user_id, first_name, last_name").in("id", patientIds)
      : Promise.resolve({ data: [] as { id: string; user_id: string | null; first_name: string | null; last_name: string | null }[], error: null }),
    (actorIds.length > 0 || referencedTherapistIds.size > 0)
      ? supabase.from("profiles").select("id, full_name").in("id", [...new Set([...actorIds, ...referencedTherapistIds])])
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[], error: null }),
    referencedLocationIds.size > 0
      ? supabase.from("locations").select("id, name").in("id", [...referencedLocationIds])
      : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
  ]);
  if (patientsRes.error) logErr("loadAuditLog(patients)", patientsRes.error);
  if (profilesRes.error) logErr("loadAuditLog(profiles)", profilesRes.error);
  if (locationsRes.error) logErr("loadAuditLog(locations)", locationsRes.error);

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p.full_name]));
  const locationMap = new Map((locationsRes.data ?? []).map((l) => [l.id, l.name]));
  const patientMap = new Map(
    (patientsRes.data ?? []).map((p) => [
      p.id,
      (p.user_id ? profileMap.get(p.user_id) : null) ?? ([p.first_name, p.last_name].filter(Boolean).join(" ") || null),
    ])
  );

  return rows.map((r) => {
    const refNames: Record<string, string> = {};
    for (const data of [r.old_data, r.new_data]) {
      const locId = (data as Record<string, unknown> | null)?.location_id;
      const therapistId = (data as Record<string, unknown> | null)?.assigned_therapist_id;
      if (typeof locId === "string") { const n = locationMap.get(locId); if (n) refNames[locId] = n; }
      if (typeof therapistId === "string") { const n = profileMap.get(therapistId); if (n) refNames[therapistId] = n; }
    }
    return {
      id: r.id,
      tableName: r.table_name,
      recordId: r.record_id,
      patientId: r.patient_id,
      patientName: r.patient_id ? patientMap.get(r.patient_id) ?? null : null,
      actorId: r.actor_id,
      actorName: r.actor_id ? profileMap.get(r.actor_id) ?? null : null,
      action: r.action as AuditAction,
      oldData: r.old_data,
      newData: r.new_data,
      createdAt: r.created_at,
      refNames,
    };
  });
}
