import { createClient } from "@/lib/supabaseClient";
import { mondayOfWeek } from "@/lib/dateUtils";
import { resolveAvatarUrl } from "@/lib/services/portalService";

function logErr(fn: string, error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return;
  console.error(`[${fn}] Supabase error — message: "${error.message}" | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`);
}

/**
 * Rollen die protocollen/oefeningenbibliotheek mogen bouwen/beheren — moet in
 * sync blijven met can_manage_org_protocols() in migratie 048.
 */
export const MANAGE_PROTOCOLS_ROLES = ["organization_owner", "therapist"];

export type ProtocolScope = "reva" | "organization";

export const INJURY_CATEGORY_LABELS: Record<string, string> = {
  acl: "Voorste kruisband (ACL)",
  total_knee_replacement: "Totale knieprothese",
  total_hip_replacement: "Totale heupprothese",
  meniscus: "Meniscusoperatie",
  rotator_cuff: "Rotator cuff schouderoperatie",
  ankle_ligament: "Enkelbandletsel (chronisch/operatief)",
  low_back_pain: "Lage rugklachten",
  ankle_sprain: "Enkelverzwikking (acuut)",
  hamstring_strain: "Hamstringblessure",
  groin_strain: "Liesblessure (adductoren)",
  mcl_sprain: "Kniebandletsel (MCL)",
  concussion: "Hersenschudding",
  pelvic_instability: "Bekkeninstabiliteit",
  pelvic_floor_dysfunction: "Bekkenbodemklachten",
  rectus_diastasis: "Diastase recti (buikwandscheiding)",
  shoulder_dislocation: "Schouderluxatie",
  calf_strain: "Kuitblessure",
  patellofemoral_pain: "Lopersknie (patellofemoraal)",
  shin_splints: "Scheenbeenvliesklachten",
  plantar_fasciitis: "Hielspoor (fasciitis plantaris)",
  achilles_tendinopathy: "Achillespees-tendinopathie",
  elbow_tendinopathy: "Elleboogklachten (tennis-/golferselleboog)",
  neck_pain_chronic: "Chronische nekklachten",
  knee_osteoarthritis: "Knieartrose",
  hip_osteoarthritis: "Heupartrose",
  shoulder_chronic_pain: "Bevroren schouder (frozen shoulder)",
  muscle_strain_general: "Spierverrekking, algemeen",
  tendinopathy_general: "Peesklachten, algemeen",
  custom: "Overig / op maat",
};

export const EXERCISE_TYPE_LABELS: Record<string, string> = {
  kracht: "Kracht",
  conditie: "Conditie",
  mobiliteit: "Mobiliteit",
  stabiliteit: "Stabiliteit",
  rekken: "Rekken",
  anders: "Anders",
};

// ─── Types: bibliotheek/sjabloonlaag ────────────────────────────────────────

export interface PortalProtocolCard {
  id: string;
  scope: ProtocolScope;
  name: string;
  description: string | null;
  injuryCategory: string;
  archived: boolean;
  /** Alleen relevant voor scope 'reva' — zie migratie 053. */
  clinicallyReviewed: boolean;
  phaseCount: number;
  createdAt: string;
  createdBy: string | null;
  createdByName: string | null;
}

export interface PortalProtocolInput {
  name: string;
  description: string;
  injuryCategory: string;
}

export interface PortalProtocolCriterion {
  id: string;
  description: string;
  sortOrder: number;
}

export interface PortalProtocolMilestone {
  id: string;
  title: string;
  sortOrder: number;
}

export interface PortalProtocolEducationItem {
  id: string;
  title: string;
  body: string | null;
  sortOrder: number;
}

export interface PortalProtocolScheduleExercise {
  id: number;
  exerciseId: string;
  exerciseTitle: string;
  sortOrder: number;
  prescribedSets: number | null;
  prescribedReps: number | null;
  prescribedDurationSeconds: number | null;
  prescribedLoadText: string | null;
  prescriptionNote: string | null;
}

/**
 * Een fase koppelt een herbruikbaar bibliotheekschema (schedule_library) via
 * protocol_phase_schedule_links — `id` hieronder is het koppeling-id (voor
 * herschikken/loskoppelen van déze fase), `scheduleLibraryId` verwijst naar
 * het onderliggende, herbruikbare schema (voor "bewerk dit schema" in de
 * Bibliotheek-pagina).
 */
export interface PortalProtocolSchedule {
  id: string;
  scheduleLibraryId: string;
  title: string;
  frequencyPerWeek: number;
  sortOrder: number;
  exercises: PortalProtocolScheduleExercise[];
}

export interface PortalProtocolPhase {
  id: string;
  name: string;
  description: string | null;
  therapistNotes: string | null;
  weekRangeLabel: string | null;
  sortOrder: number;
  forbiddenActivities: string[];
  criteria: PortalProtocolCriterion[];
  milestones: PortalProtocolMilestone[];
  educationItems: PortalProtocolEducationItem[];
  schedules: PortalProtocolSchedule[];
}

export interface PortalProtocolDetail {
  id: string;
  scope: ProtocolScope;
  organizationId: string | null;
  name: string;
  description: string | null;
  injuryCategory: string;
  archived: boolean;
  clinicallyReviewed: boolean;
  createdAt: string;
  createdBy: string | null;
  createdByName: string | null;
  phases: PortalProtocolPhase[];
}

export interface PortalExerciseLibraryItem {
  id: string;
  scope: ProtocolScope;
  title: string;
  exerciseType: string;
  description: string | null;
  instructions: string | null;
  defaultSets: number | null;
  defaultReps: number | null;
  defaultDurationSeconds: number | null;
  defaultLoadText: string | null;
  tags: string[];
  archived: boolean;
  mediaPath: string | null;
  mediaType: string | null;
  createdAt: string;
  createdBy: string | null;
  createdByName: string | null;
}

export interface PortalExerciseUsage {
  scheduleId: string;
  scheduleTitle: string;
  scheduleScope: ProtocolScope;
}

export interface PortalExerciseLibraryInput {
  title: string;
  exerciseType: string;
  description: string;
  instructions: string;
  defaultSets: number | null;
  defaultReps: number | null;
  defaultDurationSeconds: number | null;
  defaultLoadText: string;
  tags: string[];
  mediaPath: string | null;
  mediaType: string | null;
}

// ─── Protocollen: overzicht + bouwen ────────────────────────────────────────

/** Herbruikbare naam-resolver voor created_by-kolommen (protocols, oefeningen, etc.). */
async function resolveCreatorNames(
  supabase: ReturnType<typeof createClient>, ids: (string | null)[]
): Promise<Map<string, string | null>> {
  const distinctIds = [...new Set(ids.filter((v): v is string => !!v))];
  if (distinctIds.length === 0) return new Map();
  const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", distinctIds);
  if (error) logErr("resolveCreatorNames", error);
  return new Map((data ?? []).map((p) => [p.id as string, p.full_name as string | null]));
}

export async function loadRevaProtocols(): Promise<PortalProtocolCard[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("protocols")
    .select("id, scope, name, description, injury_category, archived, clinically_reviewed, created_at, created_by, protocol_phases(count)")
    .eq("scope", "reva")
    .order("name");
  if (error) { logErr("loadRevaProtocols", error); return []; }
  const rows = (data ?? []) as unknown as {
    id: string; scope: ProtocolScope; name: string; description: string | null;
    injury_category: string; archived: boolean; clinically_reviewed: boolean; created_at: string; created_by: string | null;
    protocol_phases: { count: number }[] | null;
  }[];
  const nameMap = await resolveCreatorNames(supabase, rows.map((r) => r.created_by));
  return rows.map((r) => ({
    id: r.id, scope: r.scope, name: r.name, description: r.description,
    injuryCategory: r.injury_category, archived: r.archived, clinicallyReviewed: r.clinically_reviewed,
    phaseCount: r.protocol_phases?.[0]?.count ?? 0, createdAt: r.created_at,
    createdBy: r.created_by, createdByName: r.created_by ? nameMap.get(r.created_by) ?? null : null,
  }));
}

export async function loadOrgProtocols(organizationId: string): Promise<PortalProtocolCard[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("protocols")
    .select("id, scope, name, description, injury_category, archived, clinically_reviewed, created_at, created_by, protocol_phases(count)")
    .eq("scope", "organization")
    .eq("organization_id", organizationId)
    .order("name");
  if (error) { logErr("loadOrgProtocols", error); return []; }
  const rows = (data ?? []) as unknown as {
    id: string; scope: ProtocolScope; name: string; description: string | null;
    injury_category: string; archived: boolean; clinically_reviewed: boolean; created_at: string; created_by: string | null;
    protocol_phases: { count: number }[] | null;
  }[];
  const nameMap = await resolveCreatorNames(supabase, rows.map((r) => r.created_by));
  return rows.map((r) => ({
    id: r.id, scope: r.scope, name: r.name, description: r.description,
    injuryCategory: r.injury_category, archived: r.archived, clinicallyReviewed: r.clinically_reviewed,
    phaseCount: r.protocol_phases?.[0]?.count ?? 0, createdAt: r.created_at,
    createdBy: r.created_by, createdByName: r.created_by ? nameMap.get(r.created_by) ?? null : null,
  }));
}

export async function createProtocol(
  organizationId: string,
  input: PortalProtocolInput
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("protocols")
    .insert({
      scope: "organization",
      organization_id: organizationId,
      name: input.name.trim(),
      description: input.description.trim() || null,
      injury_category: input.injuryCategory,
      created_by: userData.user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) { logErr("createProtocol", error); return { id: null, error: "Aanmaken van het herstelplan is niet gelukt." }; }
  return { id: data.id, error: null };
}

export async function updateProtocol(protocolId: string, input: PortalProtocolInput): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("protocols")
    .update({
      name: input.name.trim(),
      description: input.description.trim() || null,
      injury_category: input.injuryCategory,
    })
    .eq("id", protocolId);
  if (error) { logErr("updateProtocol", error); return { error: "Bijwerken van het herstelplan is niet gelukt." }; }
  return { error: null };
}

export async function updateProtocolArchived(protocolId: string, archived: boolean): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("protocols").update({ archived }).eq("id", protocolId);
  if (error) { logErr("updateProtocolArchived", error); return { error: "Bijwerken van het herstelplan is niet gelukt." }; }
  return { error: null };
}

/**
 * protocols.id wordt vanuit patient_protocols.source_protocol_id met ON
 * DELETE SET NULL gerefereerd (migratie 049) — patiënten die dit herstelplan
 * al toegewezen hadden gekregen behouden hun volledige, losgekoppelde kopie
 * (patient_protocols is altijd al een deep copy, zie assign_protocol_to_patient),
 * ze verliezen alleen de "gebaseerd op"-verwijzing. Verwijderen van het
 * sjabloon zelf is dus altijd veilig, ook als het ooit is toegewezen.
 */
export async function deleteProtocol(protocolId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("protocols").delete().eq("id", protocolId);
  if (error) { logErr("deleteProtocol", error); return { error: "Verwijderen van het herstelplan is niet gelukt." }; }
  return { error: null };
}

/**
 * Dupliceert een protocol (REVA → eigen organisatie, of eigen protocol
 * opnieuw) inclusief de volledige boom (fases → criteria/mijlpalen/educatie/
 * schema's/oefeningen). Oefeningen zelf worden NIET gedupliceerd — een
 * gedupliceerd schema verwijst gewoon naar dezelfde bibliotheekoefening
 * (die voor REVA-oefeningen toch al voor elke organisatie leesbaar is).
 */
export async function duplicateProtocol(
  protocolId: string,
  organizationId: string
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: source, error: sourceError } = await supabase
    .from("protocols")
    .select("name, description, injury_category")
    .eq("id", protocolId)
    .maybeSingle();
  if (sourceError || !source) {
    logErr("duplicateProtocol(source)", sourceError);
    return { id: null, error: "Herstelplan niet gevonden." };
  }

  const { data: newProtocol, error: insertError } = await supabase
    .from("protocols")
    .insert({
      scope: "organization",
      organization_id: organizationId,
      source_protocol_id: protocolId,
      name: `${source.name} (kopie)`,
      description: source.description,
      injury_category: source.injury_category,
      created_by: userData.user?.id ?? null,
    })
    .select("id")
    .single();
  if (insertError || !newProtocol) {
    logErr("duplicateProtocol(insert)", insertError);
    return { id: null, error: "Dupliceren van het herstelplan is niet gelukt." };
  }

  const { data: phases, error: phasesError } = await supabase
    .from("protocol_phases")
    .select("id, sort_order, name, description, therapist_notes, forbidden_activities")
    .eq("protocol_id", protocolId)
    .order("sort_order");
  if (phasesError) logErr("duplicateProtocol(phases)", phasesError);

  for (const phase of phases ?? []) {
    const { data: newPhase, error: newPhaseError } = await supabase
      .from("protocol_phases")
      .insert({
        protocol_id: newProtocol.id,
        sort_order: phase.sort_order,
        name: phase.name,
        description: phase.description,
        therapist_notes: phase.therapist_notes,
        forbidden_activities: phase.forbidden_activities,
      })
      .select("id")
      .single();
    if (newPhaseError || !newPhase) { logErr("duplicateProtocol(phase insert)", newPhaseError); continue; }

    const [criteriaRes, milestonesRes, educationRes, linksRes] = await Promise.all([
      supabase.from("protocol_phase_criteria").select("description, sort_order").eq("phase_id", phase.id),
      supabase.from("protocol_phase_milestones").select("title, sort_order").eq("phase_id", phase.id),
      supabase.from("protocol_phase_education_items").select("title, body, media_path, media_type, sort_order").eq("phase_id", phase.id),
      supabase.from("protocol_phase_schedule_links").select("schedule_id, frequency_per_week, sort_order").eq("phase_id", phase.id),
    ]);

    if (criteriaRes.data?.length) {
      await supabase.from("protocol_phase_criteria").insert(
        criteriaRes.data.map((c) => ({ phase_id: newPhase.id, description: c.description, sort_order: c.sort_order }))
      );
    }
    if (milestonesRes.data?.length) {
      await supabase.from("protocol_phase_milestones").insert(
        milestonesRes.data.map((m) => ({ phase_id: newPhase.id, title: m.title, sort_order: m.sort_order }))
      );
    }
    if (educationRes.data?.length) {
      await supabase.from("protocol_phase_education_items").insert(
        educationRes.data.map((e) => ({
          phase_id: newPhase.id, title: e.title, body: e.body, media_path: e.media_path, media_type: e.media_type, sort_order: e.sort_order,
        }))
      );
    }

    // Schema's zelf worden NIET gedupliceerd — net als bij oefeningen wijst
    // een gedupliceerd protocol gewoon naar dezelfde herbruikbare
    // bibliotheekschema's (schedule_library), via een nieuwe koppeling voor
    // de nieuwe fase.
    if (linksRes.data?.length) {
      await supabase.from("protocol_phase_schedule_links").insert(
        linksRes.data.map((l) => ({
          phase_id: newPhase.id, schedule_id: l.schedule_id, frequency_per_week: l.frequency_per_week, sort_order: l.sort_order,
        }))
      );
    }
  }

  return { id: newProtocol.id, error: null };
}

export async function loadProtocolDetail(protocolId: string): Promise<PortalProtocolDetail | null> {
  const supabase = createClient();

  const { data: protocol, error: protocolError } = await supabase
    .from("protocols")
    .select("id, scope, organization_id, name, description, injury_category, archived, clinically_reviewed, created_at, created_by")
    .eq("id", protocolId)
    .maybeSingle();
  if (protocolError) logErr("loadProtocolDetail(protocol)", protocolError);
  if (!protocol) return null;

  const creatorNameMap = await resolveCreatorNames(supabase, [protocol.created_by as string | null]);
  const createdByName = protocol.created_by ? creatorNameMap.get(protocol.created_by as string) ?? null : null;

  const { data: phaseRows, error: phasesError } = await supabase
    .from("protocol_phases")
    .select("id, sort_order, name, description, therapist_notes, week_range_label, forbidden_activities")
    .eq("protocol_id", protocolId)
    .order("sort_order");
  if (phasesError) logErr("loadProtocolDetail(phases)", phasesError);

  const phaseIds = (phaseRows ?? []).map((p) => p.id);

  const [criteriaRes, milestonesRes, educationRes, linkRes] = await Promise.all([
    phaseIds.length
      ? supabase.from("protocol_phase_criteria").select("id, phase_id, description, sort_order").in("phase_id", phaseIds).order("sort_order")
      : Promise.resolve({ data: [], error: null }),
    phaseIds.length
      ? supabase.from("protocol_phase_milestones").select("id, phase_id, title, sort_order").in("phase_id", phaseIds).order("sort_order")
      : Promise.resolve({ data: [], error: null }),
    phaseIds.length
      ? supabase.from("protocol_phase_education_items").select("id, phase_id, title, body, sort_order").in("phase_id", phaseIds).order("sort_order")
      : Promise.resolve({ data: [], error: null }),
    phaseIds.length
      ? supabase.from("protocol_phase_schedule_links").select("id, phase_id, schedule_id, frequency_per_week, sort_order, schedule_library(title)").in("phase_id", phaseIds).order("sort_order")
      : Promise.resolve({ data: [], error: null }),
  ]);

  const scheduleLibraryIds = [...new Set((linkRes.data ?? []).map((l) => l.schedule_id as string))];
  const { data: scheduleExerciseRows, error: scheduleExercisesError } = scheduleLibraryIds.length
    ? await supabase
        .from("schedule_library_exercises")
        .select("id, schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text, prescription_note, exercise_library(title)")
        .in("schedule_id", scheduleLibraryIds)
        .order("sort_order")
    : { data: [] as never[], error: null };
  if (scheduleExercisesError) logErr("loadProtocolDetail(scheduleExercises)", scheduleExercisesError);

  const criteriaByPhase = new Map<string, PortalProtocolCriterion[]>();
  for (const c of criteriaRes.data ?? []) {
    const list = criteriaByPhase.get(c.phase_id as string) ?? [];
    list.push({ id: c.id as string, description: c.description as string, sortOrder: c.sort_order as number });
    criteriaByPhase.set(c.phase_id as string, list);
  }

  const milestonesByPhase = new Map<string, PortalProtocolMilestone[]>();
  for (const m of milestonesRes.data ?? []) {
    const list = milestonesByPhase.get(m.phase_id as string) ?? [];
    list.push({ id: m.id as string, title: m.title as string, sortOrder: m.sort_order as number });
    milestonesByPhase.set(m.phase_id as string, list);
  }

  const educationByPhase = new Map<string, PortalProtocolEducationItem[]>();
  for (const e of educationRes.data ?? []) {
    const list = educationByPhase.get(e.phase_id as string) ?? [];
    list.push({ id: e.id as string, title: e.title as string, body: e.body as string | null, sortOrder: e.sort_order as number });
    educationByPhase.set(e.phase_id as string, list);
  }

  const scheduleExercisesBySchedule = new Map<string, PortalProtocolScheduleExercise[]>();
  for (const se of (scheduleExerciseRows ?? []) as unknown as {
    id: number; schedule_id: string; exercise_id: string; sort_order: number;
    prescribed_sets: number | null; prescribed_reps: number | null; prescribed_duration_seconds: number | null;
    prescribed_load_text: string | null; prescription_note: string | null;
    exercise_library: { title: string } | { title: string }[] | null;
  }[]) {
    const list = scheduleExercisesBySchedule.get(se.schedule_id) ?? [];
    const exerciseTitle = Array.isArray(se.exercise_library) ? (se.exercise_library[0]?.title ?? "") : (se.exercise_library?.title ?? "");
    list.push({
      id: se.id, exerciseId: se.exercise_id, exerciseTitle, sortOrder: se.sort_order,
      prescribedSets: se.prescribed_sets, prescribedReps: se.prescribed_reps,
      prescribedDurationSeconds: se.prescribed_duration_seconds,
      prescribedLoadText: se.prescribed_load_text, prescriptionNote: se.prescription_note,
    });
    scheduleExercisesBySchedule.set(se.schedule_id, list);
  }

  const schedulesByPhase = new Map<string, PortalProtocolSchedule[]>();
  for (const l of (linkRes.data ?? []) as unknown as {
    id: string; phase_id: string; schedule_id: string; frequency_per_week: number; sort_order: number;
    schedule_library: { title: string } | { title: string }[] | null;
  }[]) {
    const list = schedulesByPhase.get(l.phase_id) ?? [];
    const title = Array.isArray(l.schedule_library) ? (l.schedule_library[0]?.title ?? "") : (l.schedule_library?.title ?? "");
    list.push({
      id: l.id, scheduleLibraryId: l.schedule_id, title, frequencyPerWeek: l.frequency_per_week, sortOrder: l.sort_order,
      exercises: scheduleExercisesBySchedule.get(l.schedule_id) ?? [],
    });
    schedulesByPhase.set(l.phase_id, list);
  }

  const phases: PortalProtocolPhase[] = (phaseRows ?? []).map((p) => ({
    id: p.id, name: p.name, description: p.description, therapistNotes: p.therapist_notes,
    weekRangeLabel: p.week_range_label, sortOrder: p.sort_order, forbiddenActivities: p.forbidden_activities ?? [],
    criteria: criteriaByPhase.get(p.id) ?? [],
    milestones: milestonesByPhase.get(p.id) ?? [],
    educationItems: educationByPhase.get(p.id) ?? [],
    schedules: schedulesByPhase.get(p.id) ?? [],
  }));

  return {
    id: protocol.id, scope: protocol.scope, organizationId: protocol.organization_id,
    name: protocol.name, description: protocol.description, injuryCategory: protocol.injury_category,
    archived: protocol.archived, clinicallyReviewed: protocol.clinically_reviewed,
    createdAt: protocol.created_at,
    createdBy: protocol.created_by, createdByName, phases,
  };
}

/** Losse titel-update voor de autosave-titel op de herstelplan-detailpagina — zelfde reden als updateExerciseTitle/updateScheduleTitle. */
export async function updateProtocolName(protocolId: string, name: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("protocols").update({ name: name.trim() }).eq("id", protocolId);
  if (error) { logErr("updateProtocolName", error); return { error: "Bijwerken van de titel is niet gelukt." }; }
  return { error: null };
}

// ─── Fases ──────────────────────────────────────────────────────────────────

export interface PortalProtocolPhaseInput {
  name: string;
  description: string;
  therapistNotes: string;
  weekRangeLabel: string;
  forbiddenActivities: string[];
}

export async function createProtocolPhase(
  protocolId: string,
  input: PortalProtocolPhaseInput,
  sortOrder: number
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("protocol_phases")
    .insert({
      protocol_id: protocolId, sort_order: sortOrder, name: input.name.trim(),
      description: input.description.trim() || null, therapist_notes: input.therapistNotes.trim() || null,
      week_range_label: input.weekRangeLabel.trim() || null,
      forbidden_activities: input.forbiddenActivities,
    })
    .select("id")
    .single();
  if (error) { logErr("createProtocolPhase", error); return { id: null, error: "Aanmaken van de fase is niet gelukt." }; }
  return { id: data.id, error: null };
}

export async function updateProtocolPhase(phaseId: string, input: PortalProtocolPhaseInput): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("protocol_phases")
    .update({
      name: input.name.trim(), description: input.description.trim() || null,
      therapist_notes: input.therapistNotes.trim() || null, week_range_label: input.weekRangeLabel.trim() || null,
      forbidden_activities: input.forbiddenActivities,
    })
    .eq("id", phaseId);
  if (error) { logErr("updateProtocolPhase", error); return { error: "Bijwerken van de fase is niet gelukt." }; }
  return { error: null };
}

/** Losse naam-update voor de autosave-titel op de fase-detailpagina — zelfde reden als updateProtocolName/updateScheduleTitle/updateExerciseTitle. */
export async function updateProtocolPhaseName(phaseId: string, name: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("protocol_phases").update({ name: name.trim() }).eq("id", phaseId);
  if (error) { logErr("updateProtocolPhaseName", error); return { error: "Bijwerken van de titel is niet gelukt." }; }
  return { error: null };
}

export async function deleteProtocolPhase(phaseId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("protocol_phases").delete().eq("id", phaseId);
  if (error) { logErr("deleteProtocolPhase", error); return { error: "Verwijderen van de fase is niet gelukt." }; }
  return { error: null };
}

/** Zet sort_order opnieuw op basis van de gegeven volgorde — voor de chevron-omhoog/omlaag-knoppen in de bouwer. */
export async function reorderProtocolPhases(orderedIds: string[]): Promise<{ error: string | null }> {
  const supabase = createClient();
  const results = await Promise.all(
    orderedIds.map((id, index) => supabase.from("protocol_phases").update({ sort_order: index }).eq("id", id))
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) { logErr("reorderProtocolPhases", failed.error); return { error: "Herschikken van de fases is niet gelukt." }; }
  return { error: null };
}

// ─── Criteria ───────────────────────────────────────────────────────────────

export async function createProtocolPhaseCriterion(
  phaseId: string, description: string, sortOrder: number
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("protocol_phase_criteria")
    .insert({ phase_id: phaseId, description: description.trim(), sort_order: sortOrder })
    .select("id")
    .single();
  if (error) { logErr("createProtocolPhaseCriterion", error); return { id: null, error: "Toevoegen van het criterium is niet gelukt." }; }
  return { id: data.id, error: null };
}

export async function updateProtocolPhaseCriterion(id: string, description: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("protocol_phase_criteria").update({ description: description.trim() }).eq("id", id);
  if (error) { logErr("updateProtocolPhaseCriterion", error); return { error: "Bijwerken van het criterium is niet gelukt." }; }
  return { error: null };
}

export async function deleteProtocolPhaseCriterion(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("protocol_phase_criteria").delete().eq("id", id);
  if (error) { logErr("deleteProtocolPhaseCriterion", error); return { error: "Verwijderen van het criterium is niet gelukt." }; }
  return { error: null };
}

// ─── Mijlpalen ──────────────────────────────────────────────────────────────

export async function createProtocolPhaseMilestone(
  phaseId: string, title: string, sortOrder: number
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("protocol_phase_milestones")
    .insert({ phase_id: phaseId, title: title.trim(), sort_order: sortOrder })
    .select("id")
    .single();
  if (error) { logErr("createProtocolPhaseMilestone", error); return { id: null, error: "Toevoegen van de mijlpaal is niet gelukt." }; }
  return { id: data.id, error: null };
}

export async function updateProtocolPhaseMilestone(id: string, title: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("protocol_phase_milestones").update({ title: title.trim() }).eq("id", id);
  if (error) { logErr("updateProtocolPhaseMilestone", error); return { error: "Bijwerken van de mijlpaal is niet gelukt." }; }
  return { error: null };
}

export async function deleteProtocolPhaseMilestone(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("protocol_phase_milestones").delete().eq("id", id);
  if (error) { logErr("deleteProtocolPhaseMilestone", error); return { error: "Verwijderen van de mijlpaal is niet gelukt." }; }
  return { error: null };
}

// ─── Educatie ───────────────────────────────────────────────────────────────

export async function createProtocolPhaseEducationItem(
  phaseId: string, title: string, body: string, sortOrder: number
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("protocol_phase_education_items")
    .insert({ phase_id: phaseId, title: title.trim(), body: body.trim() || null, sort_order: sortOrder })
    .select("id")
    .single();
  if (error) { logErr("createProtocolPhaseEducationItem", error); return { id: null, error: "Toevoegen van de educatie is niet gelukt." }; }
  return { id: data.id, error: null };
}

export async function updateProtocolPhaseEducationItem(id: string, title: string, body: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("protocol_phase_education_items")
    .update({ title: title.trim(), body: body.trim() || null })
    .eq("id", id);
  if (error) { logErr("updateProtocolPhaseEducationItem", error); return { error: "Bijwerken van de educatie is niet gelukt." }; }
  return { error: null };
}

export async function deleteProtocolPhaseEducationItem(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("protocol_phase_education_items").delete().eq("id", id);
  if (error) { logErr("deleteProtocolPhaseEducationItem", error); return { error: "Verwijderen van de educatie is niet gelukt." }; }
  return { error: null };
}

// ─── Schema-bibliotheek (herbruikbaar, net als exercise_library) ───────────
// Zelfde Shopify-analogie als oefeningen: een schema is een "collectie" van
// oefeningen die je aan meerdere fases/protocollen kunt koppelen. Zie
// migratie 054 voor de tabellen (schedule_library, schedule_library_exercises,
// protocol_phase_schedule_links).

export interface PortalScheduleLibraryCard {
  id: string;
  scope: ProtocolScope;
  title: string;
  description: string | null;
  archived: boolean;
  exerciseCount: number;
  createdAt: string;
  createdBy: string | null;
  createdByName: string | null;
}

export interface PortalScheduleLibraryInput {
  title: string;
  description: string;
}

export interface PortalScheduleLibraryExercise {
  id: number;
  exerciseId: string;
  exerciseTitle: string;
  sortOrder: number;
  prescribedSets: number | null;
  prescribedReps: number | null;
  prescribedDurationSeconds: number | null;
  prescribedLoadText: string | null;
  prescriptionNote: string | null;
}

export interface PortalScheduleLibraryDetail {
  id: string;
  scope: ProtocolScope;
  organizationId: string | null;
  title: string;
  description: string | null;
  archived: boolean;
  createdAt: string;
  createdBy: string | null;
  createdByName: string | null;
  exercises: PortalScheduleLibraryExercise[];
}

export async function loadRevaSchedules(): Promise<PortalScheduleLibraryCard[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("schedule_library")
    .select("id, scope, title, description, archived, created_at, created_by, schedule_library_exercises(count)")
    .eq("scope", "reva")
    .order("title");
  if (error) { logErr("loadRevaSchedules", error); return []; }
  const rows = (data ?? []) as unknown as {
    id: string; scope: ProtocolScope; title: string; description: string | null; archived: boolean; created_at: string; created_by: string | null;
    schedule_library_exercises: { count: number }[] | null;
  }[];
  const nameMap = await resolveCreatorNames(supabase, rows.map((r) => r.created_by));
  return rows.map((r) => ({
    id: r.id, scope: r.scope, title: r.title, description: r.description, archived: r.archived,
    exerciseCount: r.schedule_library_exercises?.[0]?.count ?? 0, createdAt: r.created_at,
    createdBy: r.created_by, createdByName: r.created_by ? nameMap.get(r.created_by) ?? null : null,
  }));
}

export async function loadOrgSchedules(organizationId: string): Promise<PortalScheduleLibraryCard[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("schedule_library")
    .select("id, scope, title, description, archived, created_at, created_by, schedule_library_exercises(count)")
    .eq("scope", "organization")
    .eq("organization_id", organizationId)
    .order("title");
  if (error) { logErr("loadOrgSchedules", error); return []; }
  const rows = (data ?? []) as unknown as {
    id: string; scope: ProtocolScope; title: string; description: string | null; archived: boolean; created_at: string; created_by: string | null;
    schedule_library_exercises: { count: number }[] | null;
  }[];
  const nameMap = await resolveCreatorNames(supabase, rows.map((r) => r.created_by));
  return rows.map((r) => ({
    id: r.id, scope: r.scope, title: r.title, description: r.description, archived: r.archived,
    exerciseCount: r.schedule_library_exercises?.[0]?.count ?? 0, createdAt: r.created_at,
    createdBy: r.created_by, createdByName: r.created_by ? nameMap.get(r.created_by) ?? null : null,
  }));
}

export async function createScheduleLibraryItem(
  organizationId: string, input: PortalScheduleLibraryInput
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("schedule_library")
    .insert({
      scope: "organization", organization_id: organizationId, title: input.title.trim(), description: input.description.trim() || null,
      created_by: userData.user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) { logErr("createScheduleLibraryItem", error); return { id: null, error: "Aanmaken van het schema is niet gelukt." }; }
  return { id: data.id, error: null };
}

export async function updateScheduleLibraryItem(scheduleId: string, input: PortalScheduleLibraryInput): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("schedule_library")
    .update({ title: input.title.trim(), description: input.description.trim() || null })
    .eq("id", scheduleId);
  if (error) { logErr("updateScheduleLibraryItem", error); return { error: "Bijwerken van het schema is niet gelukt." }; }
  return { error: null };
}

export async function updateScheduleLibraryArchived(scheduleId: string, archived: boolean): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("schedule_library").update({ archived }).eq("id", scheduleId);
  if (error) { logErr("updateScheduleLibraryArchived", error); return { error: "Bijwerken van het schema is niet gelukt." }; }
  return { error: null };
}

/**
 * Verwijdert een schema. Ook gebruikt om een net aangemaakt, nog leeg
 * conceptschema op te ruimen als de gebruiker wegnavigeert zonder iets in
 * te vullen (zie schemas/[id]/page.tsx). schedule_library.id wordt vanuit
 * protocol_phase_schedule_links met ON DELETE RESTRICT gerefereerd
 * (migratie 054) — een schema dat nog in een herstelplan wordt gebruikt
 * kan hierdoor niet stilzwijgend verdwijnen; de Postgres-foreignkeyfout
 * (23503) wordt hier omgezet naar een begrijpelijke melding.
 */
export async function deleteScheduleLibraryItem(scheduleId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("schedule_library").delete().eq("id", scheduleId);
  if (error) {
    logErr("deleteScheduleLibraryItem", error);
    if (error.code === "23503") {
      return { error: "Dit schema wordt nog gebruikt in een herstelplan en kan daarom niet verwijderd worden. Verwijder eerst de koppeling in het herstelplan." };
    }
    return { error: "Verwijderen van het schema is niet gelukt." };
  }
  return { error: null };
}

/** Dupliceert een schema (REVA → eigen organisatie) inclusief zijn oefeningen. Oefeningen zelf worden niet gedupliceerd, alleen de koppeling. */
export async function duplicateScheduleLibraryItem(
  scheduleId: string, organizationId: string
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: source, error: sourceError } = await supabase
    .from("schedule_library").select("title, description").eq("id", scheduleId).maybeSingle();
  if (sourceError || !source) { logErr("duplicateScheduleLibraryItem(source)", sourceError); return { id: null, error: "Schema niet gevonden." }; }

  const { data: newSchedule, error: insertError } = await supabase
    .from("schedule_library")
    .insert({
      scope: "organization", organization_id: organizationId, source_schedule_id: scheduleId, title: `${source.title} (kopie)`, description: source.description,
      created_by: userData.user?.id ?? null,
    })
    .select("id")
    .single();
  if (insertError || !newSchedule) { logErr("duplicateScheduleLibraryItem(insert)", insertError); return { id: null, error: "Dupliceren van het schema is niet gelukt." }; }

  const { data: exercises } = await supabase
    .from("schedule_library_exercises")
    .select("exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text, prescription_note")
    .eq("schedule_id", scheduleId);
  if (exercises?.length) {
    await supabase.from("schedule_library_exercises").insert(
      exercises.map((e) => ({ ...e, schedule_id: newSchedule.id }))
    );
  }

  return { id: newSchedule.id, error: null };
}

export async function loadScheduleLibraryDetail(scheduleId: string): Promise<PortalScheduleLibraryDetail | null> {
  const supabase = createClient();
  const { data: schedule, error: scheduleError } = await supabase
    .from("schedule_library").select("id, scope, organization_id, title, description, archived, created_at, created_by").eq("id", scheduleId).maybeSingle();
  if (scheduleError) logErr("loadScheduleLibraryDetail(schedule)", scheduleError);
  if (!schedule) return null;
  const nameMap = await resolveCreatorNames(supabase, [schedule.created_by]);

  const { data: exerciseRows, error: exercisesError } = await supabase
    .from("schedule_library_exercises")
    .select("id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text, prescription_note, exercise_library(title)")
    .eq("schedule_id", scheduleId)
    .order("sort_order");
  if (exercisesError) logErr("loadScheduleLibraryDetail(exercises)", exercisesError);

  const exercises: PortalScheduleLibraryExercise[] = ((exerciseRows ?? []) as unknown as {
    id: number; exercise_id: string; sort_order: number; prescribed_sets: number | null; prescribed_reps: number | null;
    prescribed_duration_seconds: number | null; prescribed_load_text: string | null; prescription_note: string | null;
    exercise_library: { title: string } | { title: string }[] | null;
  }[]).map((e) => ({
    id: e.id, exerciseId: e.exercise_id, sortOrder: e.sort_order,
    exerciseTitle: Array.isArray(e.exercise_library) ? (e.exercise_library[0]?.title ?? "") : (e.exercise_library?.title ?? ""),
    prescribedSets: e.prescribed_sets, prescribedReps: e.prescribed_reps, prescribedDurationSeconds: e.prescribed_duration_seconds,
    prescribedLoadText: e.prescribed_load_text, prescriptionNote: e.prescription_note,
  }));

  return {
    id: schedule.id, scope: schedule.scope, organizationId: schedule.organization_id,
    title: schedule.title, description: schedule.description, archived: schedule.archived,
    createdAt: schedule.created_at, createdBy: schedule.created_by,
    createdByName: schedule.created_by ? nameMap.get(schedule.created_by) ?? null : null,
    exercises,
  };
}

/** Losse titel-update voor de autosave-titel op de schema-detailpagina — zelfde reden als updateExerciseTitle. */
export async function updateScheduleTitle(scheduleId: string, title: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("schedule_library").update({ title: title.trim() }).eq("id", scheduleId);
  if (error) { logErr("updateScheduleTitle", error); return { error: "Bijwerken van de titel is niet gelukt." }; }
  return { error: null };
}

export interface PortalScheduleExerciseInput {
  exerciseId: string;
  prescribedSets: number | null;
  prescribedReps: number | null;
  prescribedDurationSeconds: number | null;
  prescribedLoadText: string;
  prescriptionNote: string;
}

function scheduleExerciseInputToRow(input: PortalScheduleExerciseInput) {
  return {
    exercise_id: input.exerciseId,
    prescribed_sets: input.prescribedSets,
    prescribed_reps: input.prescribedReps,
    prescribed_duration_seconds: input.prescribedDurationSeconds,
    prescribed_load_text: input.prescribedLoadText.trim() || null,
    prescription_note: input.prescriptionNote.trim() || null,
  };
}

export async function addExerciseToScheduleLibrary(
  scheduleId: string, input: PortalScheduleExerciseInput, sortOrder: number
): Promise<{ id: number | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("schedule_library_exercises")
    .insert({ schedule_id: scheduleId, sort_order: sortOrder, ...scheduleExerciseInputToRow(input) })
    .select("id")
    .single();
  if (error) { logErr("addExerciseToScheduleLibrary", error); return { id: null, error: "Toevoegen van de oefening is niet gelukt." }; }
  return { id: data.id, error: null };
}

/**
 * Voegt meerdere oefeningen tegelijk toe aan een schema (de "Producten
 * toevoegen"-achtige multi-select-flow) — geen aparte bulk-RPC nodig gezien
 * de verwachte batchgrootte (enkele tot ~15 oefeningen per keer); roept de
 * bestaande single-insert gewoon in een Promise.all-lus aan en verzamelt
 * per-item fouten, zodat een gedeeltelijke mislukking niet de hele batch
 * laat falen of stil wordt genegeerd.
 */
export async function addExercisesToScheduleLibrary(
  scheduleId: string, inputs: PortalScheduleExerciseInput[], startSortOrder: number
): Promise<{ addedCount: number; errors: string[] }> {
  const results = await Promise.all(
    inputs.map((input, i) => addExerciseToScheduleLibrary(scheduleId, input, startSortOrder + i))
  );
  const errors = results.filter((r) => r.error).map((r) => r.error as string);
  const addedCount = results.filter((r) => !r.error).length;
  return { addedCount, errors };
}

export async function updateScheduleLibraryExercise(id: number, input: PortalScheduleExerciseInput): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("schedule_library_exercises").update(scheduleExerciseInputToRow(input)).eq("id", id);
  if (error) { logErr("updateScheduleLibraryExercise", error); return { error: "Bijwerken van de oefening is niet gelukt." }; }
  return { error: null };
}

export async function removeExerciseFromScheduleLibrary(id: number): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("schedule_library_exercises").delete().eq("id", id);
  if (error) { logErr("removeExerciseFromScheduleLibrary", error); return { error: "Verwijderen van de oefening is niet gelukt." }; }
  return { error: null };
}

/** Zet sort_order opnieuw op basis van de gegeven volgorde — voor slepen in de schema-bouwer. */
export async function reorderScheduleLibraryExercises(orderedIds: number[]): Promise<{ error: string | null }> {
  const supabase = createClient();
  const results = await Promise.all(
    orderedIds.map((id, index) => supabase.from("schedule_library_exercises").update({ sort_order: index }).eq("id", id))
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) { logErr("reorderScheduleLibraryExercises", failed.error); return { error: "Herschikken van de oefeningen is niet gelukt." }; }
  return { error: null };
}

// ─── Fase ↔ schema-koppeling ────────────────────────────────────────────────

export async function linkScheduleToPhase(
  phaseId: string, scheduleId: string, frequencyPerWeek: number, sortOrder: number
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("protocol_phase_schedule_links")
    .insert({ phase_id: phaseId, schedule_id: scheduleId, frequency_per_week: frequencyPerWeek, sort_order: sortOrder })
    .select("id")
    .single();
  if (error) { logErr("linkScheduleToPhase", error); return { id: null, error: "Koppelen van het schema is niet gelukt." }; }
  return { id: data.id, error: null };
}

export async function updatePhaseScheduleLink(linkId: string, frequencyPerWeek: number): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("protocol_phase_schedule_links").update({ frequency_per_week: frequencyPerWeek }).eq("id", linkId);
  if (error) { logErr("updatePhaseScheduleLink", error); return { error: "Bijwerken van de frequentie is niet gelukt." }; }
  return { error: null };
}

export async function unlinkScheduleFromPhase(linkId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("protocol_phase_schedule_links").delete().eq("id", linkId);
  if (error) { logErr("unlinkScheduleFromPhase", error); return { error: "Loskoppelen van het schema is niet gelukt." }; }
  return { error: null };
}

export interface PortalScheduleUsage {
  protocolId: string;
  protocolName: string;
  protocolScope: ProtocolScope;
}

/** Welke herstelplannen (protocols) dit schema gebruiken — via een of meer fases — voor de "Gebruikt in herstelplannen"-kaart op de schema-detailpagina. */
export async function loadScheduleUsage(scheduleId: string): Promise<PortalScheduleUsage[]> {
  const supabase = createClient();
  const { data: links, error: linksError } = await supabase
    .from("protocol_phase_schedule_links")
    .select("phase_id")
    .eq("schedule_id", scheduleId);
  if (linksError) { logErr("loadScheduleUsage(links)", linksError); return []; }
  const phaseIds = [...new Set((links ?? []).map((l) => l.phase_id as string))];
  if (phaseIds.length === 0) return [];

  const { data: phases, error: phasesError } = await supabase
    .from("protocol_phases")
    .select("protocol_id")
    .in("id", phaseIds);
  if (phasesError) { logErr("loadScheduleUsage(phases)", phasesError); return []; }
  const protocolIds = [...new Set((phases ?? []).map((p) => p.protocol_id as string))];
  if (protocolIds.length === 0) return [];

  const { data: protocols, error: protocolsError } = await supabase
    .from("protocols")
    .select("id, name, scope")
    .in("id", protocolIds)
    .order("name");
  if (protocolsError) { logErr("loadScheduleUsage(protocols)", protocolsError); return []; }
  return (protocols ?? []).map((p) => ({ protocolId: p.id, protocolName: p.name, protocolScope: p.scope as ProtocolScope }));
}

// ─── Oefeningenbibliotheek ──────────────────────────────────────────────────

export async function loadExerciseLibrary(organizationId: string): Promise<PortalExerciseLibraryItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("exercise_library")
    .select("id, scope, title, exercise_type, description, instructions, default_sets, default_reps, default_duration_seconds, default_load_text, tags, archived, media_path, media_type, created_at, created_by")
    .or(`scope.eq.reva,organization_id.eq.${organizationId}`)
    .order("title");
  if (error) { logErr("loadExerciseLibrary", error); return []; }
  const rows = data ?? [];
  const nameMap = await resolveCreatorNames(supabase, rows.map((r) => r.created_by));
  return rows.map((r) => ({
    id: r.id, scope: r.scope, title: r.title, exerciseType: r.exercise_type,
    description: r.description, instructions: r.instructions,
    defaultSets: r.default_sets, defaultReps: r.default_reps, defaultDurationSeconds: r.default_duration_seconds,
    defaultLoadText: r.default_load_text, tags: r.tags ?? [], archived: r.archived,
    mediaPath: r.media_path, mediaType: r.media_type, createdAt: r.created_at,
    createdBy: r.created_by, createdByName: r.created_by ? nameMap.get(r.created_by) ?? null : null,
  }));
}

/** Eén oefening met volledige detail, voor de detailpagina — los van loadExerciseLibrary zodat niet de hele bibliotheek opgehaald hoeft te worden. RLS regelt zichtbaarheid al (REVA of eigen organisatie). */
export async function loadExerciseLibraryDetail(exerciseId: string): Promise<PortalExerciseLibraryItem | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("exercise_library")
    .select("id, scope, title, exercise_type, description, instructions, default_sets, default_reps, default_duration_seconds, default_load_text, tags, archived, media_path, media_type, created_at, created_by")
    .eq("id", exerciseId)
    .maybeSingle();
  if (error) logErr("loadExerciseLibraryDetail", error);
  if (!data) return null;
  const nameMap = await resolveCreatorNames(supabase, [data.created_by]);
  return {
    id: data.id, scope: data.scope, title: data.title, exerciseType: data.exercise_type,
    description: data.description, instructions: data.instructions,
    defaultSets: data.default_sets, defaultReps: data.default_reps, defaultDurationSeconds: data.default_duration_seconds,
    defaultLoadText: data.default_load_text, tags: data.tags ?? [], archived: data.archived,
    mediaPath: data.media_path, mediaType: data.media_type, createdAt: data.created_at,
    createdBy: data.created_by, createdByName: data.created_by ? nameMap.get(data.created_by) ?? null : null,
  };
}

/** Welke schema's (schedule_library) deze oefening gebruiken — voor de "Gebruikt in schema's"-kaart op de detailpagina. */
export async function loadExerciseUsage(exerciseId: string): Promise<PortalExerciseUsage[]> {
  const supabase = createClient();
  const { data: links, error: linksError } = await supabase
    .from("schedule_library_exercises")
    .select("schedule_id")
    .eq("exercise_id", exerciseId);
  if (linksError) { logErr("loadExerciseUsage(links)", linksError); return []; }
  const scheduleIds = [...new Set((links ?? []).map((l) => l.schedule_id as string))];
  if (scheduleIds.length === 0) return [];
  const { data: schedules, error: schedulesError } = await supabase
    .from("schedule_library")
    .select("id, title, scope")
    .in("id", scheduleIds)
    .order("title");
  if (schedulesError) { logErr("loadExerciseUsage(schedules)", schedulesError); return []; }
  return (schedules ?? []).map((s) => ({ scheduleId: s.id, scheduleTitle: s.title, scheduleScope: s.scope as ProtocolScope }));
}

/** Losse titel-update voor de autosave-titel op de detailpagina (onBlur) — los van updateOrgExercise zodat een titelwijziging nooit per ongeluk nog niet-opgeslagen wijzigingen in andere velden meestuurt. */
export async function updateExerciseTitle(exerciseId: string, title: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("exercise_library").update({ title: title.trim() }).eq("id", exerciseId);
  if (error) { logErr("updateExerciseTitle", error); return { error: "Bijwerken van de titel is niet gelukt." }; }
  return { error: null };
}

/** Losse media-update, direct aangeroepen bij upload/verwijderen op de detailpagina (zelfde reden als updateExerciseTitle). */
export async function updateExerciseMedia(
  exerciseId: string, mediaPath: string | null, mediaType: string | null
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("exercise_library").update({ media_path: mediaPath, media_type: mediaType }).eq("id", exerciseId);
  if (error) { logErr("updateExerciseMedia", error); return { error: "Bijwerken van de media is niet gelukt." }; }
  return { error: null };
}

export async function createOrgExercise(
  organizationId: string, input: PortalExerciseLibraryInput, explicitId?: string
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("exercise_library")
    .insert({
      ...(explicitId ? { id: explicitId } : {}),
      scope: "organization", organization_id: organizationId,
      title: input.title.trim(), exercise_type: input.exerciseType,
      description: input.description.trim() || null, instructions: input.instructions.trim() || null,
      default_sets: input.defaultSets, default_reps: input.defaultReps, default_duration_seconds: input.defaultDurationSeconds,
      default_load_text: input.defaultLoadText.trim() || null, tags: input.tags,
      media_path: input.mediaPath, media_type: input.mediaType,
      created_by: userData.user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) { logErr("createOrgExercise", error); return { id: null, error: "Aanmaken van de oefening is niet gelukt." }; }
  return { id: data.id, error: null };
}

/**
 * Slaat een REVA-standaardoefening op als eigen kopie — met de (eventueel
 * door de gebruiker aangepaste) formulierwaarden, niet de originele REVA-
 * waarden. Wordt pas aangeroepen bij een echte "Opslaan"-klik, nooit bij het
 * enkel openen van de bewerk-modal — voorheen ontstond de kopie al bij het
 * klikken op de rij, wat rommel achterliet als iemand daarna annuleerde.
 * `explicitId` moet meegegeven worden als de gebruiker al een afbeelding
 * heeft geüpload vóór het opslaan — die upload heeft dit id al als pad
 * gebruikt (zie ExerciseFormModal's `pendingId`), dus de rij moet met
 * exact datzelfde id worden aangemaakt.
 */
export async function createOrgExerciseFromSource(
  organizationId: string, sourceExerciseId: string, input: PortalExerciseLibraryInput, explicitId?: string
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("exercise_library")
    .insert({
      ...(explicitId ? { id: explicitId } : {}),
      scope: "organization", organization_id: organizationId, source_exercise_id: sourceExerciseId,
      title: input.title.trim(), exercise_type: input.exerciseType,
      description: input.description.trim() || null, instructions: input.instructions.trim() || null,
      default_sets: input.defaultSets, default_reps: input.defaultReps, default_duration_seconds: input.defaultDurationSeconds,
      default_load_text: input.defaultLoadText.trim() || null, tags: input.tags,
      media_path: input.mediaPath, media_type: input.mediaType,
      created_by: userData.user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) { logErr("createOrgExerciseFromSource", error); return { id: null, error: "Aanmaken van de kopie is niet gelukt." }; }
  return { id: data.id, error: null };
}

export async function updateOrgExercise(exerciseId: string, input: PortalExerciseLibraryInput): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("exercise_library")
    .update({
      title: input.title.trim(), exercise_type: input.exerciseType,
      description: input.description.trim() || null, instructions: input.instructions.trim() || null,
      default_sets: input.defaultSets, default_reps: input.defaultReps, default_duration_seconds: input.defaultDurationSeconds,
      default_load_text: input.defaultLoadText.trim() || null, tags: input.tags,
      media_path: input.mediaPath, media_type: input.mediaType,
    })
    .eq("id", exerciseId);
  if (error) { logErr("updateOrgExercise", error); return { error: "Bijwerken van de oefening is niet gelukt." }; }
  return { error: null };
}

/**
 * Upload media (afbeelding of video) voor een oefening naar de private
 * `protocol-media`-bucket, org-scope pad (`${organizationId}/${exerciseId}/...`)
 * — zelfde bucket/padconventie als de REVA-scope illustraties (migratie 051),
 * maar dan schrijfbaar voor organisatieleden i.p.v. alleen platform-admins.
 * `exerciseId` moet vooraf al bekend zijn (bv. een net aangemaakte conceptrij).
 */
export async function uploadExerciseMedia(
  organizationId: string, exerciseId: string, file: File
): Promise<{ mediaPath: string | null; mediaType: string | null; error: string | null }> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${organizationId}/${exerciseId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("protocol-media")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) {
    logErr("uploadExerciseMedia", error);
    return { mediaPath: null, mediaType: null, error: "Uploaden van de media is niet gelukt." };
  }
  return { mediaPath: path, mediaType: file.type.startsWith("video/") ? "video" : "image", error: null };
}

/** Dupliceert een oefening (REVA → eigen organisatie), zodat de kopie los bewerkt kan worden zonder de REVA-bron aan te passen. */
export async function duplicateExerciseLibraryItem(
  exerciseId: string, organizationId: string
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: source, error: sourceError } = await supabase
    .from("exercise_library")
    .select("title, exercise_type, description, instructions, default_sets, default_reps, default_duration_seconds, default_load_text, tags, media_path, media_type")
    .eq("id", exerciseId)
    .maybeSingle();
  if (sourceError || !source) { logErr("duplicateExerciseLibraryItem(source)", sourceError); return { id: null, error: "Oefening niet gevonden." }; }

  const { data: newExercise, error: insertError } = await supabase
    .from("exercise_library")
    .insert({
      scope: "organization", organization_id: organizationId, source_exercise_id: exerciseId,
      title: `${source.title} (kopie)`, exercise_type: source.exercise_type,
      description: source.description, instructions: source.instructions,
      default_sets: source.default_sets, default_reps: source.default_reps, default_duration_seconds: source.default_duration_seconds,
      default_load_text: source.default_load_text, tags: source.tags ?? [],
      media_path: source.media_path, media_type: source.media_type,
      created_by: userData.user?.id ?? null,
    })
    .select("id")
    .single();
  if (insertError || !newExercise) { logErr("duplicateExerciseLibraryItem(insert)", insertError); return { id: null, error: "Dupliceren van de oefening is niet gelukt." }; }
  return { id: newExercise.id, error: null };
}

export async function updateExerciseArchived(exerciseId: string, archived: boolean): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("exercise_library").update({ archived }).eq("id", exerciseId);
  if (error) { logErr("updateExerciseArchived", error); return { error: "Bijwerken van de oefening is niet gelukt." }; }
  return { error: null };
}

/**
 * exercise_library.id wordt vanuit schedule_library_exercises met ON DELETE
 * RESTRICT gerefereerd (migratie 048) — een oefening die in een schema wordt
 * gebruikt mag niet stilzwijgend verdwijnen. Foreign-key-violation (23503)
 * wordt hier omgezet naar een vriendelijke melding i.p.v. de rauwe Postgres-
 * foutmelding door te geven.
 */
export async function deleteOrgExercise(exerciseId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("exercise_library").delete().eq("id", exerciseId);
  if (error) {
    logErr("deleteOrgExercise", error);
    if (error.code === "23503") {
      return { error: "Deze oefening wordt nog gebruikt in een of meer schema's en kan niet verwijderd worden. Archiveer de oefening in plaats daarvan, of verwijder hem eerst uit de schema's." };
    }
    return { error: "Verwijderen van de oefening is niet gelukt." };
  }
  return { error: null };
}

// ─── Patiëntspecifieke protocolkopie (toewijzen + therapeut-aanzicht) ──────
// Zie migratie 049: assign_protocol_to_patient kopieert de volledige boom in
// één transactie en doet zijn eigen autorisatiecheck (can_manage_org_patients),
// los van de strengere can_manage_org_protocols-rolgate die geldt voor het
// bouwen van protocollen zelf.

export interface PortalPatientProtocolCriterion {
  id: string;
  description: string;
  met: boolean;
}

export interface PortalPatientProtocolMilestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
  reflectionText: string | null;
  painScore: number | null;
}

export interface PortalPatientProtocolEducationItem {
  id: string;
  title: string;
  body: string | null;
}

export interface PortalPatientProtocolScheduleExercise {
  id: string;
  title: string;
  sourceExerciseId: string | null;
  prescribedSets: number | null;
  prescribedReps: number | null;
  prescribedDurationSeconds: number | null;
  prescribedLoadText: string | null;
  prescriptionNote: string | null;
  mediaPath: string | null;
}

export interface PortalPatientProtocolSchedule {
  id: string;
  title: string;
  frequencyPerWeek: number;
  /** Aantal gelogde sessies sinds maandag van de huidige kalenderweek. */
  completedThisWeek: number;
  exercises: PortalPatientProtocolScheduleExercise[];
}

export interface PortalPatientProtocolPhase {
  id: string;
  name: string;
  description: string | null;
  therapistNotes: string | null;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  forbiddenActivities: string[];
  transitionPainScore: number | null;
  transitionNote: string | null;
  criteria: PortalPatientProtocolCriterion[];
  milestones: PortalPatientProtocolMilestone[];
  educationItems: PortalPatientProtocolEducationItem[];
  schedules: PortalPatientProtocolSchedule[];
}

export interface PortalPatientProtocolAssignment {
  id: string;
  name: string;
  status: string;
  assignedAt: string;
  phases: PortalPatientProtocolPhase[];
}

export interface PortalPatientSessionNote {
  id: string;
  date: string;
  scheduleId: string;
  reflection: string;
}

/** Notities bij gelogde protocol-sessies (patient_protocol_session_logs.reflection), voor de fysiotherapeut. */
export async function loadPatientSessionNotes(patientId: string, limit = 10): Promise<PortalPatientSessionNote[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("patient_protocol_session_logs")
    .select("id, date, schedule_id, reflection")
    .eq("patient_id", patientId)
    .not("reflection", "is", null)
    .order("date", { ascending: false })
    .limit(limit);
  if (error) { logErr("loadPatientSessionNotes", error); return []; }
  return (data ?? [])
    .filter((r) => (r.reflection as string | null)?.trim())
    .map((r) => ({ id: r.id as string, date: r.date as string, scheduleId: r.schedule_id as string, reflection: r.reflection as string }));
}

export interface PortalPatientStaffNote {
  id: string;
  authorId: string | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
  note: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fysio-onderling logboek per patiënt (migratie 076) — meerdere vrije
 * notities, elk met eigen auteur, zichtbaar voor elk actief lid van de
 * organisatie. Bewust los van loadPatientSessionNotes() hierboven: dat zijn
 * patiënt-eigen reflecties bij trainingssessies, dit zijn staff-geschreven
 * notities die de patiënt zelf niet te zien krijgt.
 */
export async function loadPatientStaffNotes(patientId: string): Promise<PortalPatientStaffNote[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("patient_staff_notes")
    .select("id, author_id, note, created_at, updated_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) { logErr("loadPatientStaffNotes", error); return []; }

  const rows = data ?? [];
  const authorIds = [...new Set(rows.map((r) => r.author_id).filter((v): v is string => !!v))];
  const { data: profiles, error: profilesError } = authorIds.length > 0
    ? await supabase.from("profiles").select("id, full_name, avatar_url, avatar_path").in("id", authorIds)
    : { data: [] as { id: string; full_name: string | null; avatar_url: string | null; avatar_path: string | null }[], error: null };
  if (profilesError) logErr("loadPatientStaffNotes(profiles)", profilesError);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const avatarUrlById = new Map(
    await Promise.all(
      [...profileMap.entries()].map(async ([id, p]) => [id, await resolveAvatarUrl(supabase, p.avatar_path, p.avatar_url)] as const)
    )
  );

  return rows.map((r) => ({
    id: r.id as string,
    authorId: r.author_id as string | null,
    authorName: r.author_id ? profileMap.get(r.author_id as string)?.full_name ?? null : null,
    authorAvatarUrl: r.author_id ? avatarUrlById.get(r.author_id as string) ?? null : null,
    note: r.note as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }));
}

export async function addPatientStaffNote(
  patientId: string, organizationId: string, authorId: string, note: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("patient_staff_notes").insert({
    patient_id: patientId, organization_id: organizationId, author_id: authorId, note: note.trim(),
  });
  if (error) { logErr("addPatientStaffNote", error); return { error: "Toevoegen van de notitie is niet gelukt." }; }
  return { error: null };
}

export async function updatePatientStaffNote(noteId: string, note: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("patient_staff_notes").update({ note: note.trim() }).eq("id", noteId);
  if (error) { logErr("updatePatientStaffNote", error); return { error: "Bijwerken van de notitie is niet gelukt." }; }
  return { error: null };
}

export async function deletePatientStaffNote(noteId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("patient_staff_notes").delete().eq("id", noteId);
  if (error) { logErr("deletePatientStaffNote", error); return { error: "Verwijderen van de notitie is niet gelukt." }; }
  return { error: null };
}

export async function assignProtocolToPatient(patientId: string, protocolId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.rpc("assign_protocol_to_patient", { p_patient_id: patientId, p_protocol_id: protocolId });
  if (error) { logErr("assignProtocolToPatient", error); return { error: error.message || "Toewijzen van het herstelplan is niet gelukt." }; }
  return { error: null };
}

export async function loadPatientProtocolAssignment(patientId: string): Promise<PortalPatientProtocolAssignment | null> {
  const supabase = createClient();

  const { data: assignment, error: assignmentError } = await supabase
    .from("patient_protocols")
    .select("id, name, status, assigned_at")
    .eq("patient_id", patientId)
    .in("status", ["active", "paused"])
    .maybeSingle();
  if (assignmentError) logErr("loadPatientProtocolAssignment(assignment)", assignmentError);
  if (!assignment) return null;

  const { data: phaseRows, error: phasesError } = await supabase
    .from("patient_protocol_phases")
    .select("id, sort_order, name, description, therapist_notes, status, started_at, completed_at, forbidden_activities, transition_pain_score, transition_note")
    .eq("patient_protocol_id", assignment.id)
    .order("sort_order");
  if (phasesError) logErr("loadPatientProtocolAssignment(phases)", phasesError);

  const phaseIds = (phaseRows ?? []).map((p) => p.id);

  const [criteriaRes, milestonesRes, educationRes, scheduleRes] = await Promise.all([
    phaseIds.length ? supabase.from("patient_protocol_phase_criteria").select("id, phase_id, description, met").in("phase_id", phaseIds).order("sort_order") : Promise.resolve({ data: [], error: null }),
    phaseIds.length ? supabase.from("patient_protocol_phase_milestones").select("id, phase_id, title, completed, completed_at, reflection_text, pain_score").in("phase_id", phaseIds).order("sort_order") : Promise.resolve({ data: [], error: null }),
    phaseIds.length ? supabase.from("patient_protocol_phase_education_items").select("id, phase_id, title, body").in("phase_id", phaseIds).order("sort_order") : Promise.resolve({ data: [], error: null }),
    phaseIds.length ? supabase.from("patient_protocol_schedules").select("id, phase_id, title, frequency_per_week").in("phase_id", phaseIds).order("sort_order") : Promise.resolve({ data: [], error: null }),
  ]);

  const scheduleIds = (scheduleRes.data ?? []).map((s) => s.id as string);
  const weekStart = mondayOfWeek();
  const [{ data: scheduleExerciseRows }, { data: sessionLogRows }] = await Promise.all([
    scheduleIds.length
      ? supabase.from("patient_protocol_schedule_exercises")
          .select("id, schedule_id, title, source_exercise_id, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text, prescription_note, media_path")
          .in("schedule_id", scheduleIds).order("sort_order")
      : Promise.resolve({ data: [] as never[] }),
    // Zelfde weekdefinitie als patientProtocolService.ts's loadMyActiveProtocol
    // (kalenderweek sinds maandag, niet een rollend 7-dagenvenster) — zodat
    // het cijfer dat de praktijk ziet klopt met wat de patiënt zelf ziet.
    scheduleIds.length
      ? supabase.from("patient_protocol_session_logs").select("schedule_id").eq("patient_id", patientId).in("schedule_id", scheduleIds).gte("date", weekStart)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const completedThisWeekBySchedule = new Map<string, number>();
  for (const log of sessionLogRows ?? []) {
    const key = log.schedule_id as string;
    completedThisWeekBySchedule.set(key, (completedThisWeekBySchedule.get(key) ?? 0) + 1);
  }

  const criteriaByPhase = new Map<string, PortalPatientProtocolCriterion[]>();
  for (const c of criteriaRes.data ?? []) {
    const list = criteriaByPhase.get(c.phase_id as string) ?? [];
    list.push({ id: c.id as string, description: c.description as string, met: c.met as boolean });
    criteriaByPhase.set(c.phase_id as string, list);
  }

  const milestonesByPhase = new Map<string, PortalPatientProtocolMilestone[]>();
  for (const m of milestonesRes.data ?? []) {
    const list = milestonesByPhase.get(m.phase_id as string) ?? [];
    list.push({
      id: m.id as string, title: m.title as string, completed: m.completed as boolean,
      completedAt: m.completed_at as string | null, reflectionText: m.reflection_text as string | null, painScore: m.pain_score as number | null,
    });
    milestonesByPhase.set(m.phase_id as string, list);
  }

  const educationByPhase = new Map<string, PortalPatientProtocolEducationItem[]>();
  for (const e of educationRes.data ?? []) {
    const list = educationByPhase.get(e.phase_id as string) ?? [];
    list.push({ id: e.id as string, title: e.title as string, body: e.body as string | null });
    educationByPhase.set(e.phase_id as string, list);
  }

  const exercisesBySchedule = new Map<string, PortalPatientProtocolScheduleExercise[]>();
  for (const ex of (scheduleExerciseRows ?? []) as unknown as {
    id: string; schedule_id: string; title: string; source_exercise_id: string | null;
    prescribed_sets: number | null; prescribed_reps: number | null;
    prescribed_duration_seconds: number | null; prescribed_load_text: string | null; prescription_note: string | null;
    media_path: string | null;
  }[]) {
    const list = exercisesBySchedule.get(ex.schedule_id) ?? [];
    list.push({
      id: ex.id, title: ex.title, sourceExerciseId: ex.source_exercise_id,
      prescribedSets: ex.prescribed_sets, prescribedReps: ex.prescribed_reps,
      prescribedDurationSeconds: ex.prescribed_duration_seconds, prescribedLoadText: ex.prescribed_load_text,
      prescriptionNote: ex.prescription_note, mediaPath: ex.media_path,
    });
    exercisesBySchedule.set(ex.schedule_id, list);
  }

  const schedulesByPhase = new Map<string, PortalPatientProtocolSchedule[]>();
  for (const s of scheduleRes.data ?? []) {
    const list = schedulesByPhase.get(s.phase_id as string) ?? [];
    list.push({
      id: s.id as string, title: s.title as string, frequencyPerWeek: s.frequency_per_week as number,
      completedThisWeek: completedThisWeekBySchedule.get(s.id as string) ?? 0,
      exercises: exercisesBySchedule.get(s.id as string) ?? [],
    });
    schedulesByPhase.set(s.phase_id as string, list);
  }

  const phases: PortalPatientProtocolPhase[] = (phaseRows ?? []).map((p) => ({
    id: p.id, name: p.name, description: p.description, therapistNotes: p.therapist_notes,
    status: p.status, startedAt: p.started_at, completedAt: p.completed_at, forbiddenActivities: p.forbidden_activities ?? [],
    transitionPainScore: p.transition_pain_score, transitionNote: p.transition_note,
    criteria: criteriaByPhase.get(p.id) ?? [],
    milestones: milestonesByPhase.get(p.id) ?? [],
    educationItems: educationByPhase.get(p.id) ?? [],
    schedules: schedulesByPhase.get(p.id) ?? [],
  }));

  return { id: assignment.id, name: assignment.name, status: assignment.status, assignedAt: assignment.assigned_at, phases };
}

export interface PortalPatientScheduleExerciseInput {
  prescribedSets: number | null;
  prescribedReps: number | null;
  prescribedDurationSeconds: number | null;
  prescribedLoadText: string;
  prescriptionNote: string;
}

/**
 * Voegt oefeningen toe aan het schema van ÉÉN patiënt (patient_protocol_schedule_exercises)
 * — dit is de patiëntkopie uit assign_protocol_to_patient (migratie 054), niet
 * het sjabloon. In tegenstelling tot schedule_library_exercises (die een
 * live exercise_id-FK naar de bibliotheek heeft) is deze tabel volledig
 * gedenormaliseerd, dus de titel/omschrijving/instructies/media van de
 * gekozen bibliotheekoefening worden hier één keer gekopieerd — latere
 * wijzigingen aan de bibliotheekoefening raken deze rij dus niet meer,
 * exact zoals bij de initiële protocol-toewijzing.
 */
export async function addExercisesToPatientSchedule(
  scheduleId: string, exerciseIds: string[], startSortOrder: number
): Promise<{ addedCount: number; errors: string[] }> {
  if (exerciseIds.length === 0) return { addedCount: 0, errors: [] };
  const supabase = createClient();
  const { data: sourceExercises, error: sourceError } = await supabase
    .from("exercise_library")
    .select("id, title, description, instructions, media_path, media_type, default_sets, default_reps, default_duration_seconds, default_load_text")
    .in("id", exerciseIds);
  if (sourceError || !sourceExercises) {
    logErr("addExercisesToPatientSchedule(source)", sourceError);
    return { addedCount: 0, errors: ["Oefeningen ophalen uit de bibliotheek is niet gelukt."] };
  }

  const rows = sourceExercises.map((ex, i) => ({
    schedule_id: scheduleId,
    source_exercise_id: ex.id,
    sort_order: startSortOrder + i,
    title: ex.title,
    description: ex.description,
    instructions: ex.instructions,
    media_path: ex.media_path,
    media_type: ex.media_type,
    prescribed_sets: ex.default_sets,
    prescribed_reps: ex.default_reps,
    prescribed_duration_seconds: ex.default_duration_seconds,
    prescribed_load_text: ex.default_load_text,
  }));
  const { error: insertError } = await supabase.from("patient_protocol_schedule_exercises").insert(rows);
  if (insertError) {
    logErr("addExercisesToPatientSchedule(insert)", insertError);
    return { addedCount: 0, errors: [insertError.message] };
  }
  return { addedCount: rows.length, errors: [] };
}

export async function updatePatientScheduleExercise(
  id: string, input: PortalPatientScheduleExerciseInput
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("patient_protocol_schedule_exercises")
    .update({
      prescribed_sets: input.prescribedSets,
      prescribed_reps: input.prescribedReps,
      prescribed_duration_seconds: input.prescribedDurationSeconds,
      prescribed_load_text: input.prescribedLoadText.trim() || null,
      prescription_note: input.prescriptionNote.trim() || null,
    })
    .eq("id", id);
  if (error) { logErr("updatePatientScheduleExercise", error); return { error: "Bijwerken van de oefening is niet gelukt." }; }
  return { error: null };
}

export async function removeExerciseFromPatientSchedule(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("patient_protocol_schedule_exercises").delete().eq("id", id);
  if (error) { logErr("removeExerciseFromPatientSchedule", error); return { error: "Verwijderen van de oefening is niet gelukt." }; }
  return { error: null };
}

/** Zet sort_order opnieuw op basis van de gegeven volgorde — voor slepen in het herstelplan van een specifieke patiënt. */
export async function reorderPatientScheduleExercises(orderedIds: string[]): Promise<{ error: string | null }> {
  const supabase = createClient();
  const results = await Promise.all(
    orderedIds.map((id, index) => supabase.from("patient_protocol_schedule_exercises").update({ sort_order: index }).eq("id", id))
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) { logErr("reorderPatientScheduleExercises", failed.error); return { error: "Herschikken van de oefeningen is niet gelukt." }; }
  return { error: null };
}

export async function toggleCriterionMet(criterionId: string, met: boolean): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("patient_protocol_phase_criteria")
    .update({ met, met_at: met ? new Date().toISOString() : null })
    .eq("id", criterionId);
  if (error) { logErr("toggleCriterionMet", error); return { error: "Bijwerken van het criterium is niet gelukt." }; }
  return { error: null };
}

export async function updateMilestoneCompletion(
  milestoneId: string, completed: boolean
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("patient_protocol_phase_milestones")
    .update({ completed, completed_at: completed ? new Date().toISOString() : null })
    .eq("id", milestoneId);
  if (error) { logErr("updateMilestoneCompletion", error); return { error: "Bijwerken van de mijlpaal is niet gelukt." }; }
  return { error: null };
}

/**
 * Zet de huidige fase op 'completed' en de volgende op 'active' — twee
 * sequentiële updates zodat de partial-unique-index (max 1 actieve fase per
 * toewijzing) nooit tijdelijk twee actieve rijen ziet. painScoreNow/note zijn
 * de optionele faseovergang-check-in (migratie 108) — vastgelegd op de net
 * afgesloten fase, naast de al bestaande criteria-/mijlpaalafvinklijst.
 */
export async function advanceToNextPhase(
  currentPhaseId: string,
  nextPhaseId: string,
  painScoreNow?: number | null,
  note?: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error: completeError } = await supabase
    .from("patient_protocol_phases")
    .update({
      status: "completed", completed_at: new Date().toISOString(),
      transition_pain_score: painScoreNow ?? null, transition_note: note?.trim() || null,
    })
    .eq("id", currentPhaseId);
  if (completeError) { logErr("advanceToNextPhase(complete)", completeError); return { error: "Afronden van de fase is niet gelukt." }; }

  const { error: activateError } = await supabase
    .from("patient_protocol_phases")
    .update({ status: "active", started_at: new Date().toISOString() })
    .eq("id", nextPhaseId);
  if (activateError) { logErr("advanceToNextPhase(activate)", activateError); return { error: "Activeren van de volgende fase is niet gelukt." }; }

  return { error: null };
}

/**
 * Zet een per ongeluk afgeronde fase terug — de huidige actieve fase gaat
 * terug naar 'not_started' (nog nooit echt gestart, dus started_at wordt
 * geleegd), de vorige fase wordt weer 'active' met completed_at geleegd
 * (started_at blijft staan — dat was de eerste keer dat de fase echt begon).
 * Zelfde twee-staps-volgorde als advanceToNextPhase, in omgekeerde richting,
 * om dezelfde reden: nooit tijdelijk twee actieve fases tegelijk.
 */
export async function revertToPreviousPhase(
  currentPhaseId: string,
  previousPhaseId: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error: demoteError } = await supabase
    .from("patient_protocol_phases")
    .update({ status: "not_started", started_at: null })
    .eq("id", currentPhaseId);
  if (demoteError) { logErr("revertToPreviousPhase(demote)", demoteError); return { error: "Terugzetten van de huidige fase is niet gelukt." }; }

  const { error: reactivateError } = await supabase
    .from("patient_protocol_phases")
    .update({ status: "active", completed_at: null })
    .eq("id", previousPhaseId);
  if (reactivateError) { logErr("revertToPreviousPhase(reactivate)", reactivateError); return { error: "Heropenen van de vorige fase is niet gelukt." }; }

  return { error: null };
}
