import { createClient } from "@/lib/supabaseClient";
import { emptyIntakeInput, type IntakeInput, type AttentionPoint, type SuggestedGoal } from "@/lib/intakeAnalysis";

function logErr(fn: string, error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return;
  console.error(`[${fn}] Supabase error — message: "${error.message}" | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`);
}

/** IntakeInput → kolommen van patient_intakes (gedeeld door aanmaken en afronden). */
function intakeToRow(intake: IntakeInput) {
  return {
    visit_reason: intake.visitReason || null,
    body_side: intake.bodySide || null,
    pregnancy_related: intake.pregnancyRelated,
    radiating_pain: intake.radiatingPain,
    height_cm: intake.heightCm,
    weight_kg: intake.weightKg,
    pain_score_now: intake.painScoreNow,
    pain_worst: intake.painWorst,
    swelling: intake.swelling || null,
    pain_location: intake.painLocation.trim() || null,
    night_pain: intake.nightPain,
    pain_triggers: intake.painTriggers.trim() || null,
    mobility_aid: intake.mobilityAid || null,
    weight_bearing_status: intake.weightBearingStatus || null,
    rom_degrees: intake.romDegrees,
    additional_procedures: intake.additionalProcedures.trim() || null,
    onset_mechanism: intake.onsetMechanism || null,
    injury_description: intake.injuryDescription.trim() || null,
    symptom_onset: intake.symptomOnset || null,
    symptom_course: intake.symptomCourse || null,
    previous_treatment_text: intake.previousTreatmentText.trim() || null,
    daily_impact: intake.dailyImpact || null,
    sleep_impact: intake.sleepImpact || null,
    occupation: intake.occupation.trim() || null,
    work_load: intake.workLoad || null,
    sport_frequency: intake.sportFrequency || null,
    sport_level: intake.sportLevel || null,
    medical_history: intake.medicalHistory.trim() || null,
    medication_text: intake.medicationText.trim() || null,
    imaging: intake.imaging,
    referral_source: intake.referralSource || null,
    red_flags: intake.redFlags,
    fear_of_movement: intake.fearOfMovement,
    return_to_sport_goal: intake.returnToSportGoal,
    sport_type: intake.sportType.trim() || null,
    return_to_work_goal: intake.returnToWorkGoal,
    goal_timeframe_months: intake.goalTimeframeMonths,
    patient_goal_text: intake.patientGoalText.trim() || null,
    patient_expectation: intake.patientExpectation.trim() || null,
    therapist_observations: intake.therapistObservations.trim() || null,
  };
}

/**
 * Door de therapeut goedgekeurde REVA Analyse-output, meegegeven bij het
 * afronden van de intake-wizard (zie components/portal/PatientWizard.tsx).
 */
export interface IntakeApprovedOutput {
  aiSummary: string;
  attentionPoints: AttentionPoint[];
  recommendedProtocolId: string | null;
  recommendationReasoning: string | null;
  stagedGoals: SuggestedGoal[];
}

/**
 * Legt de intake (migratie 088) vast bij het afronden van de PatientWizard.
 * stagedGoals wordt pas naar de echte goals-tabel gekopieerd zodra de
 * patiënt een eigen auth.users-rij heeft (zie copy_intake_goals_to_patient,
 * migratie 091) — op intake-tijd bestaat die nog niet.
 */
export async function createPatientIntake(
  organizationId: string,
  patientId: string,
  createdBy: string | null,
  intake: IntakeInput,
  approved: IntakeApprovedOutput
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("patient_intakes").insert({
    patient_id: patientId,
    organization_id: organizationId,
    created_by: createdBy,
    ...intakeToRow(intake),
    ai_summary: approved.aiSummary,
    ai_attention_points: approved.attentionPoints,
    ai_recommended_protocol_id: approved.recommendedProtocolId,
    ai_recommendation_reasoning: approved.recommendationReasoning,
    staged_goals: approved.stagedGoals,
    completed_at: new Date().toISOString(),
  });
  if (error) { logErr("createPatientIntake", error); return { error: "Vastleggen van de intake is niet gelukt." }; }
  return { error: null };
}

export interface PortalPatientIntake {
  id: string;
  visitReason: string | null;
  bodySide: string | null;
  pregnancyRelated: boolean;
  radiatingPain: boolean;
  heightCm: number | null;
  weightKg: number | null;
  painScoreNow: number | null;
  swelling: string | null;
  painLocation: string | null;
  mobilityAid: string | null;
  weightBearingStatus: string | null;
  romDegrees: number | null;
  additionalProcedures: string | null;
  symptomOnset: string | null;
  previousTreatmentText: string | null;
  dailyImpact: string | null;
  returnToSportGoal: boolean;
  sportType: string | null;
  returnToWorkGoal: boolean;
  goalTimeframeMonths: number | null;
  patientGoalText: string | null;
  therapistObservations: string | null;
  aiSummary: string | null;
  aiAttentionPoints: AttentionPoint[];
  aiRecommendedProtocolName: string | null;
  aiRecommendationReasoning: string | null;
  createdByName: string | null;
  completedAt: string | null;
  status: "requested" | "submitted" | "completed";
  filledBy: "therapist" | "patient";
  requestedAt: string | null;
  submittedAt: string | null;
  /** Alle velden als IntakeInput (o.a. voor de analyse en de nieuwe velden). */
  input: IntakeInput;
}

/**
 * Leest de vastgelegde intake voor het Logboek-tabblad (patiënten/[id]) —
 * er bestond tot nu toe geen manier om de intake ná het aanmaken van de
 * patiënt nog terug te zien.
 */
export async function loadPatientIntake(patientId: string): Promise<PortalPatientIntake | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("patient_intakes")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) { logErr("loadPatientIntake", error); return null; }
  if (!data) return null;

  const [{ data: protocol }, { data: author }] = await Promise.all([
    data.ai_recommended_protocol_id
      ? supabase.from("protocols").select("name").eq("id", data.ai_recommended_protocol_id).maybeSingle()
      : Promise.resolve({ data: null as { name: string } | null }),
    data.created_by
      ? supabase.from("profiles").select("full_name").eq("id", data.created_by).maybeSingle()
      : Promise.resolve({ data: null as { full_name: string | null } | null }),
  ]);

  return {
    id: data.id as string,
    visitReason: data.visit_reason as string | null,
    bodySide: data.body_side as string | null,
    pregnancyRelated: !!data.pregnancy_related,
    radiatingPain: !!data.radiating_pain,
    heightCm: data.height_cm as number | null,
    weightKg: data.weight_kg as number | null,
    painScoreNow: data.pain_score_now as number | null,
    swelling: data.swelling as string | null,
    painLocation: data.pain_location as string | null,
    mobilityAid: data.mobility_aid as string | null,
    weightBearingStatus: data.weight_bearing_status as string | null,
    romDegrees: data.rom_degrees as number | null,
    additionalProcedures: data.additional_procedures as string | null,
    symptomOnset: data.symptom_onset as string | null,
    previousTreatmentText: data.previous_treatment_text as string | null,
    dailyImpact: data.daily_impact as string | null,
    returnToSportGoal: !!data.return_to_sport_goal,
    sportType: data.sport_type as string | null,
    returnToWorkGoal: !!data.return_to_work_goal,
    goalTimeframeMonths: data.goal_timeframe_months as number | null,
    patientGoalText: data.patient_goal_text as string | null,
    therapistObservations: data.therapist_observations as string | null,
    aiSummary: data.ai_summary as string | null,
    aiAttentionPoints: (data.ai_attention_points as AttentionPoint[] | null) ?? [],
    aiRecommendedProtocolName: protocol?.name ?? null,
    aiRecommendationReasoning: data.ai_recommendation_reasoning as string | null,
    createdByName: author?.full_name ?? null,
    completedAt: data.completed_at as string | null,
    status: (data.status as PortalPatientIntake["status"]) ?? "completed",
    filledBy: (data.filled_by as PortalPatientIntake["filledBy"]) ?? "therapist",
    requestedAt: (data.requested_at as string | null) ?? null,
    submittedAt: (data.submitted_at as string | null) ?? null,
    input: rowToIntakeInput(data as Record<string, unknown>),
  };
}

// ─── Zelf invullen door de patiënt (migratie 137) ───────────────────────────

/** Legt een lege intake klaar die de patiënt na het inloggen zelf invult. */
export async function requestPatientIntake(
  organizationId: string, patientId: string, createdBy: string | null
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("patient_intakes").insert({
    patient_id: patientId,
    organization_id: organizationId,
    created_by: createdBy,
    filled_by: "patient",
    status: "requested",
    requested_at: new Date().toISOString(),
    completed_at: null,
  });
  if (error) { logErr("requestPatientIntake", error); return { error: "Klaarzetten van de intake is niet gelukt." }; }
  return { error: null };
}

export interface MyPendingIntake {
  intakeId: string;
  organizationName: string | null;
  therapistName: string | null;
}

/** Patiënt: staat er een intake klaar om in te vullen? */
export async function loadMyPendingIntake(): Promise<MyPendingIntake | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("my_pending_intake");
  if (error) { logErr("loadMyPendingIntake", error); return null; }
  const row = (data as { intake_id: string; organization_name: string | null; therapist_name: string | null }[] | null)?.[0];
  return row ? { intakeId: row.intake_id, organizationName: row.organization_name, therapistName: row.therapist_name } : null;
}

/** Patiënt: dient de eigen intake in (alleen met tweestapsverificatie). */
export async function submitMyIntake(
  intake: IntakeInput, injury: { injuryType: string; injuryDate: string; surgeryDate: string }
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.rpc("submit_my_intake", { p: { ...intake, ...injury } });
  if (error) { logErr("submitMyIntake", error); return { error: "Versturen is niet gelukt. Probeer het opnieuw." }; }
  return { error: null };
}

/**
 * Fysio rondt een door de patiënt ingevulde intake af: analyse en doelen
 * vastleggen, status 'completed'. Doelen gaan daarna direct naar de
 * patiënt (die heeft op dat moment al een account).
 */
export async function completeSubmittedIntake(
  intakeId: string, patientId: string, approved: IntakeApprovedOutput
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("patient_intakes").update({
    ai_summary: approved.aiSummary,
    ai_attention_points: approved.attentionPoints,
    ai_recommended_protocol_id: approved.recommendedProtocolId,
    ai_recommendation_reasoning: approved.recommendationReasoning,
    staged_goals: approved.stagedGoals,
    goals_copied_at: null,
    status: "completed",
    completed_at: new Date().toISOString(),
  }).eq("id", intakeId);
  if (error) { logErr("completeSubmittedIntake", error); return { error: "Afronden van de intake is niet gelukt." }; }
  if (approved.stagedGoals.length > 0) {
    const { error: goalsError } = await supabase.rpc("copy_intake_goals_to_patient", { p_patient_id: patientId });
    if (goalsError) logErr("completeSubmittedIntake(goals)", goalsError);
  }
  return { error: null };
}

/** Rij uit patient_intakes → IntakeInput, zodat de analyse opnieuw kan draaien. */
export function rowToIntakeInput(r: Record<string, unknown>): IntakeInput {
  const str = (k: string) => (r[k] as string | null) ?? "";
  const num = (k: string) => (r[k] as number | null) ?? null;
  return {
    ...emptyIntakeInput,
    visitReason: str("visit_reason") as IntakeInput["visitReason"],
    bodySide: str("body_side") as IntakeInput["bodySide"],
    pregnancyRelated: !!r.pregnancy_related,
    radiatingPain: !!r.radiating_pain,
    heightCm: num("height_cm"),
    weightKg: num("weight_kg") !== null ? Number(r.weight_kg) : null,
    painScoreNow: num("pain_score_now"),
    painWorst: num("pain_worst"),
    swelling: str("swelling") as IntakeInput["swelling"],
    painLocation: str("pain_location"),
    nightPain: (r.night_pain as boolean | null) ?? null,
    painTriggers: str("pain_triggers"),
    mobilityAid: str("mobility_aid") as IntakeInput["mobilityAid"],
    weightBearingStatus: str("weight_bearing_status") as IntakeInput["weightBearingStatus"],
    romDegrees: num("rom_degrees"),
    additionalProcedures: str("additional_procedures"),
    onsetMechanism: str("onset_mechanism") as IntakeInput["onsetMechanism"],
    injuryDescription: str("injury_description"),
    symptomOnset: str("symptom_onset") as IntakeInput["symptomOnset"],
    symptomCourse: str("symptom_course") as IntakeInput["symptomCourse"],
    previousTreatmentText: str("previous_treatment_text"),
    dailyImpact: str("daily_impact") as IntakeInput["dailyImpact"],
    sleepImpact: str("sleep_impact") as IntakeInput["sleepImpact"],
    occupation: str("occupation"),
    workLoad: str("work_load") as IntakeInput["workLoad"],
    sportFrequency: str("sport_frequency") as IntakeInput["sportFrequency"],
    sportLevel: str("sport_level") as IntakeInput["sportLevel"],
    medicalHistory: str("medical_history"),
    medicationText: str("medication_text"),
    imaging: ((r.imaging as string[] | null) ?? []) as IntakeInput["imaging"],
    referralSource: str("referral_source") as IntakeInput["referralSource"],
    redFlags: ((r.red_flags as string[] | null) ?? []) as IntakeInput["redFlags"],
    fearOfMovement: (r.fear_of_movement as boolean | null) ?? null,
    returnToSportGoal: !!r.return_to_sport_goal,
    sportType: str("sport_type"),
    returnToWorkGoal: !!r.return_to_work_goal,
    goalTimeframeMonths: num("goal_timeframe_months"),
    patientGoalText: str("patient_goal_text"),
    patientExpectation: str("patient_expectation"),
    therapistObservations: str("therapist_observations"),
  };
}

/** Herstelplan gekozen buiten het afrondvenster om: intake telt dan ook als afgerond. */
export async function markIntakeCompleted(intakeId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("patient_intakes")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", intakeId).eq("status", "submitted");
  if (error) logErr("markIntakeCompleted", error);
}
