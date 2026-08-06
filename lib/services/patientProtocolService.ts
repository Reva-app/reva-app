import { createClient } from "@/lib/supabaseClient";
import { mondayOfWeek } from "@/lib/dateUtils";

function logErr(fn: string, error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return;
  console.error(`[${fn}] Supabase error — message: "${error.message}" | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`);
}

/**
 * Lost patients.id op vanuit de ingelogde gebruiker (auth.users.id). De
 * patiënt-app werkt vandaag overal met userId, maar de protocol-tabellen
 * (migratie 049/050) zijn native patient_id-gescopeerd. Elke ingelogde
 * gebruiker heeft altijd een patients-rij (ensure_personal_organization,
 * migratie 020), dus dit geeft nooit null voor een echt ingelogde patiënt.
 */
export async function loadOwnPatientId(userId: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("patients").select("id").eq("user_id", userId).maybeSingle();
  if (error) { logErr("loadOwnPatientId", error); return null; }
  return data?.id ?? null;
}

export interface PatientWelcomeState {
  patientId: string;
  welcomedAt: string | null;
  firstName: string | null;
}

/**
 * Voor het eenmalige "Welkom [Naam]"-moment op het dashboard na afronding
 * van de intake (zie components/dashboard/WelcomeHero.tsx, migratie 089).
 */
export async function loadOwnPatientWelcomeState(userId: string): Promise<PatientWelcomeState | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("patients")
    .select("id, welcomed_at, first_name")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) { logErr("loadOwnPatientWelcomeState", error); return null; }
  if (!data) return null;
  return { patientId: data.id, welcomedAt: data.welcomed_at, firstName: data.first_name };
}

export async function markOwnPatientWelcomed(patientId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_own_patient_welcomed", { p_patient_id: patientId });
  if (error) logErr("markOwnPatientWelcomed", error);
}

/**
 * Operatiezijde uit de intake (migratie 106/109) — het enige veld uit
 * patient_intakes dat rechtstreeks aan de patiënt getoond wordt, via een
 * gerichte RPC. De rest van de intake (AI-samenvatting, aandachtspunten,
 * therapeut-observaties) blijft bewust dossier-only, zie migratie 088/109.
 */
export async function loadOwnIntakeBodySide(): Promise<"left" | "right" | "both" | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("load_own_intake_body_side");
  if (error) { logErr("loadOwnIntakeBodySide", error); return null; }
  return (data as "left" | "right" | "both" | null) ?? null;
}

export interface PatientIntakeSummary {
  mobilityAid: string | null;
  weightBearingStatus: string | null;
  romDegrees: number | null;
  returnToSportGoal: boolean | null;
  sportType: string | null;
  returnToWorkGoal: boolean | null;
  goalTimeframeMonths: number | null;
}

/**
 * Veilige subset van patient_intakes voor het eigen dashboard (zie migratie
 * 111) — expliciet zonder ai_summary/therapist_observations, die blijven
 * dossier-only voor staff (migratie 088).
 */
export async function loadOwnIntakeSummary(): Promise<PatientIntakeSummary | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("load_own_intake_summary");
  if (error) { logErr("loadOwnIntakeSummary", error); return null; }
  const row = (data as Record<string, unknown>[] | null)?.[0];
  if (!row) return null;
  return {
    mobilityAid: (row.mobility_aid as string | null) ?? null,
    weightBearingStatus: (row.weight_bearing_status as string | null) ?? null,
    romDegrees: (row.rom_degrees as number | null) ?? null,
    returnToSportGoal: (row.return_to_sport_goal as boolean | null) ?? null,
    sportType: (row.sport_type as string | null) ?? null,
    returnToWorkGoal: (row.return_to_work_goal as boolean | null) ?? null,
    goalTimeframeMonths: (row.goal_timeframe_months as number | null) ?? null,
  };
}

export interface PatientProtocolCriterionView {
  id: string;
  description: string;
  met: boolean;
}

export interface PatientProtocolMilestoneView {
  id: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
}

export interface PatientProtocolEducationView {
  id: string;
  title: string;
  body: string | null;
}

export interface PatientProtocolExerciseView {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  prescribedSets: number | null;
  prescribedReps: number | null;
  prescribedDurationSeconds: number | null;
  prescribedLoadText: string | null;
  prescriptionNote: string | null;
  mediaPath: string | null;
}

export interface PatientProtocolScheduleView {
  id: string;
  title: string;
  frequencyPerWeek: number;
  completedThisWeek: number;
  exercises: PatientProtocolExerciseView[];
}

export interface PatientProtocolPhaseView {
  id: string;
  name: string;
  description: string | null;
  forbiddenActivities: string[];
  weekRangeLabel: string | null;
  startedAt: string | null;
  criteria: PatientProtocolCriterionView[];
  milestones: PatientProtocolMilestoneView[];
  educationItems: PatientProtocolEducationView[];
  schedules: PatientProtocolScheduleView[];
}

export interface PatientActiveProtocol {
  patientProtocolId: string;
  name: string;
  currentPhase: PatientProtocolPhaseView | null;
}

export interface PatientProtocolTimelinePhase {
  id: string;
  name: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  weekRangeLabel: string | null;
  milestonesTotal: number;
  milestonesCompleted: number;
}

/**
 * Alle fases van het actieve herstelplan (niet alleen de huidige), voor een
 * fase-geankerde tijdlijn op de Training-pagina. RLS staat dit al toe zonder
 * aanpassing — patient_protocol_phases is gescoped op de patiënt zelf, niet
 * op fase-status (zie migratie 049). Bewust lichtgewicht: geen
 * criteria/schema's/oefeningen per fase, alleen wat een tijdlijn nodig heeft
 * (naam, status, mijlpaal-voortgang). Voor de details van de actieve fase
 * blijft loadMyActiveProtocol() de bron.
 */
export async function loadMyProtocolTimeline(patientId: string): Promise<PatientProtocolTimelinePhase[]> {
  const supabase = createClient();

  const { data: assignment, error: assignmentError } = await supabase
    .from("patient_protocols")
    .select("id")
    .eq("patient_id", patientId)
    .in("status", ["active", "paused"])
    .maybeSingle();
  if (assignmentError) logErr("loadMyProtocolTimeline(assignment)", assignmentError);
  if (!assignment) return [];

  const { data: phases, error: phasesError } = await supabase
    .from("patient_protocol_phases")
    .select("id, name, status, started_at, completed_at, week_range_label")
    .eq("patient_protocol_id", assignment.id)
    .order("sort_order");
  if (phasesError) { logErr("loadMyProtocolTimeline(phases)", phasesError); return []; }
  if (!phases || phases.length === 0) return [];

  const phaseIds = phases.map((p) => p.id as string);
  const { data: milestones, error: milestonesError } = await supabase
    .from("patient_protocol_phase_milestones")
    .select("phase_id, completed")
    .in("phase_id", phaseIds);
  if (milestonesError) logErr("loadMyProtocolTimeline(milestones)", milestonesError);

  const milestoneCountsByPhase = new Map<string, { total: number; completed: number }>();
  for (const m of milestones ?? []) {
    const key = m.phase_id as string;
    const counts = milestoneCountsByPhase.get(key) ?? { total: 0, completed: 0 };
    counts.total += 1;
    if (m.completed) counts.completed += 1;
    milestoneCountsByPhase.set(key, counts);
  }

  return phases.map((p) => ({
    id: p.id, name: p.name, status: p.status, startedAt: p.started_at, completedAt: p.completed_at,
    weekRangeLabel: p.week_range_label,
    milestonesTotal: milestoneCountsByPhase.get(p.id)?.total ?? 0,
    milestonesCompleted: milestoneCountsByPhase.get(p.id)?.completed ?? 0,
  }));
}

export interface PatientRecentMilestone {
  id: string;
  title: string;
  completedAt: string;
  phaseName: string;
}

/**
 * Recent behaalde mijlpalen over het HELE herstelplan (niet alleen de
 * actieve fase, zoals de mijlpaal-voortgangsbalk op het dashboard al toont)
 * — voor een "recent behaald"-overzicht. Bewust géén aparte nieuwe
 * mijlpaal-tabel: hergebruikt patient_protocol_phase_milestones, dezelfde
 * bron als de rest van de protocol-UI.
 */
export async function loadRecentMilestones(patientId: string, limit = 3): Promise<PatientRecentMilestone[]> {
  const supabase = createClient();

  const { data: assignment, error: assignmentError } = await supabase
    .from("patient_protocols")
    .select("id")
    .eq("patient_id", patientId)
    .in("status", ["active", "paused"])
    .maybeSingle();
  if (assignmentError) logErr("loadRecentMilestones(assignment)", assignmentError);
  if (!assignment) return [];

  const { data: phases, error: phasesError } = await supabase
    .from("patient_protocol_phases")
    .select("id, name")
    .eq("patient_protocol_id", assignment.id);
  if (phasesError) { logErr("loadRecentMilestones(phases)", phasesError); return []; }
  if (!phases || phases.length === 0) return [];

  const phaseNameById = new Map(phases.map((p) => [p.id as string, p.name as string]));
  const { data: milestones, error: milestonesError } = await supabase
    .from("patient_protocol_phase_milestones")
    .select("id, title, completed_at, phase_id")
    .in("phase_id", phases.map((p) => p.id))
    .eq("completed", true)
    .order("completed_at", { ascending: false })
    .limit(limit);
  if (milestonesError) { logErr("loadRecentMilestones(milestones)", milestonesError); return []; }

  return (milestones ?? [])
    .filter((m) => m.completed_at)
    .map((m) => ({
      id: m.id, title: m.title, completedAt: m.completed_at as string,
      phaseName: phaseNameById.get(m.phase_id as string) ?? "",
    }));
}

export async function loadMyActiveProtocol(patientId: string): Promise<PatientActiveProtocol | null> {
  const supabase = createClient();

  const { data: assignment, error: assignmentError } = await supabase
    .from("patient_protocols")
    .select("id, name")
    .eq("patient_id", patientId)
    .in("status", ["active", "paused"])
    .maybeSingle();
  if (assignmentError) logErr("loadMyActiveProtocol(assignment)", assignmentError);
  if (!assignment) return null;

  const { data: phase, error: phaseError } = await supabase
    .from("patient_protocol_phases")
    .select("id, name, description, forbidden_activities, week_range_label, started_at")
    .eq("patient_protocol_id", assignment.id)
    .eq("status", "active")
    .maybeSingle();
  if (phaseError) logErr("loadMyActiveProtocol(phase)", phaseError);
  if (!phase) return { patientProtocolId: assignment.id, name: assignment.name, currentPhase: null };

  const [criteriaRes, milestonesRes, educationRes, scheduleRes] = await Promise.all([
    supabase.from("patient_protocol_phase_criteria").select("id, description, met").eq("phase_id", phase.id).order("sort_order"),
    supabase.from("patient_protocol_phase_milestones").select("id, title, completed, completed_at").eq("phase_id", phase.id).order("sort_order"),
    supabase.from("patient_protocol_phase_education_items").select("id, title, body").eq("phase_id", phase.id).order("sort_order"),
    supabase.from("patient_protocol_schedules").select("id, title, frequency_per_week").eq("phase_id", phase.id).order("sort_order"),
  ]);

  const scheduleIds = (scheduleRes.data ?? []).map((s) => s.id as string);
  // Kalenderweek sinds maandag — zelfde weekdefinitie als de Ma-Zo weekweergave
  // op de Training-pagina (TrainingWeekOverview), niet een rollend 7-dagenvenster.
  const weekStart = mondayOfWeek();

  const [scheduleExerciseRows, sessionLogRows] = await Promise.all([
    scheduleIds.length
      ? supabase.from("patient_protocol_schedule_exercises")
          .select("id, schedule_id, title, description, instructions, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text, prescription_note, media_path")
          .in("schedule_id", scheduleIds).order("sort_order")
      : Promise.resolve({ data: [], error: null }),
    scheduleIds.length
      ? supabase.from("patient_protocol_session_logs").select("schedule_id").eq("patient_id", patientId).in("schedule_id", scheduleIds).gte("date", weekStart)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const completedThisWeekBySchedule = new Map<string, number>();
  for (const log of sessionLogRows.data ?? []) {
    const key = log.schedule_id as string;
    completedThisWeekBySchedule.set(key, (completedThisWeekBySchedule.get(key) ?? 0) + 1);
  }

  const exercisesBySchedule = new Map<string, PatientProtocolExerciseView[]>();
  for (const ex of (scheduleExerciseRows.data ?? []) as unknown as {
    id: string; schedule_id: string; title: string; description: string | null; instructions: string | null;
    prescribed_sets: number | null; prescribed_reps: number | null; prescribed_duration_seconds: number | null;
    prescribed_load_text: string | null; prescription_note: string | null; media_path: string | null;
  }[]) {
    const list = exercisesBySchedule.get(ex.schedule_id) ?? [];
    list.push({
      id: ex.id, title: ex.title, description: ex.description, instructions: ex.instructions,
      prescribedSets: ex.prescribed_sets, prescribedReps: ex.prescribed_reps, prescribedDurationSeconds: ex.prescribed_duration_seconds,
      prescribedLoadText: ex.prescribed_load_text, prescriptionNote: ex.prescription_note, mediaPath: ex.media_path,
    });
    exercisesBySchedule.set(ex.schedule_id, list);
  }

  const schedules: PatientProtocolScheduleView[] = (scheduleRes.data ?? []).map((s) => ({
    id: s.id as string, title: s.title as string, frequencyPerWeek: s.frequency_per_week as number,
    completedThisWeek: completedThisWeekBySchedule.get(s.id as string) ?? 0,
    exercises: exercisesBySchedule.get(s.id as string) ?? [],
  }));

  return {
    patientProtocolId: assignment.id,
    name: assignment.name,
    currentPhase: {
      id: phase.id, name: phase.name, description: phase.description, forbiddenActivities: phase.forbidden_activities ?? [],
      weekRangeLabel: phase.week_range_label, startedAt: phase.started_at,
      criteria: (criteriaRes.data ?? []).map((c) => ({ id: c.id, description: c.description, met: c.met })),
      milestones: (milestonesRes.data ?? []).map((m) => ({ id: m.id, title: m.title, completed: m.completed, completedAt: m.completed_at })),
      educationItems: (educationRes.data ?? []).map((e) => ({ id: e.id, title: e.title, body: e.body })),
      schedules,
    },
  };
}

export interface PatientExerciseLogInput {
  scheduleExerciseId: string;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  painScore: number | null;
}

/** Logt één uitgevoerde sessie van een trainingsschema, met per-oefening cijfers. */
export async function logProtocolSession(
  patientId: string,
  scheduleId: string,
  exerciseLogs: PatientExerciseLogInput[],
  reflection?: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: session, error: sessionError } = await supabase
    .from("patient_protocol_session_logs")
    .insert({ patient_id: patientId, schedule_id: scheduleId, reflection: reflection?.trim() || null })
    .select("id")
    .single();
  if (sessionError || !session) {
    logErr("logProtocolSession(session)", sessionError);
    return { error: "Loggen van de sessie is niet gelukt." };
  }

  if (exerciseLogs.length > 0) {
    const { error: exercisesError } = await supabase.from("patient_protocol_exercise_logs").insert(
      exerciseLogs.map((e) => ({
        patient_id: patientId,
        session_log_id: session.id,
        schedule_exercise_id: e.scheduleExerciseId,
        sets: e.sets,
        reps: e.reps,
        weight_kg: e.weightKg,
        duration_seconds: e.durationSeconds,
        pain_score: e.painScore,
      }))
    );
    if (exercisesError) {
      logErr("logProtocolSession(exercises)", exercisesError);
      return { error: "Loggen van de oefeningen is niet gelukt." };
    }
  }

  return { error: null };
}

export interface ProtocolSessionLogSummary {
  id: string;
  date: string;
  scheduleId: string;
  reflection: string | null;
}

/** Gelogde sessies binnen een datumbereik — gebruikt door zowel het weekoverzicht op de Training-pagina als het maandoverzicht op Afspraken. */
export async function loadSessionLogsInRange(patientId: string, startDate: string, endDate: string): Promise<ProtocolSessionLogSummary[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("patient_protocol_session_logs")
    .select("id, date, schedule_id, reflection")
    .eq("patient_id", patientId)
    .gte("date", startDate)
    .lte("date", endDate);
  if (error) { logErr("loadSessionLogsInRange", error); return []; }
  return (data ?? []).map((r) => ({ id: r.id as string, date: r.date as string, scheduleId: r.schedule_id as string, reflection: r.reflection as string | null }));
}

export interface ExerciseProgressPoint {
  date: string;
  weightKg: number | null;
  reps: number | null;
  sets: number | null;
}

export async function loadExerciseProgressHistory(scheduleExerciseId: string): Promise<ExerciseProgressPoint[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("patient_protocol_exercise_logs")
    .select("date, weight_kg, reps, sets")
    .eq("schedule_exercise_id", scheduleExerciseId)
    .order("date", { ascending: true });
  if (error) { logErr("loadExerciseProgressHistory", error); return []; }
  return (data ?? []).map((r) => ({ date: r.date, weightKg: r.weight_kg, reps: r.reps, sets: r.sets }));
}
