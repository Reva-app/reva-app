import { createClient } from "@/lib/supabaseClient";
import type { IntakeInput, AttentionPoint, SuggestedGoal } from "@/lib/intakeAnalysis";

function logErr(fn: string, error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return;
  console.error(`[${fn}] Supabase error — message: "${error.message}" | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`);
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
    visit_reason: intake.visitReason || null,
    body_side: intake.bodySide || null,
    pregnancy_related: intake.pregnancyRelated,
    radiating_pain: intake.radiatingPain,
    height_cm: intake.heightCm,
    weight_kg: intake.weightKg,
    pain_score_now: intake.painScoreNow,
    swelling: intake.swelling || null,
    pain_location: intake.painLocation.trim() || null,
    mobility_aid: intake.mobilityAid || null,
    weight_bearing_status: intake.weightBearingStatus || null,
    rom_degrees: intake.romDegrees,
    additional_procedures: intake.additionalProcedures.trim() || null,
    symptom_onset: intake.symptomOnset || null,
    previous_treatment_text: intake.previousTreatmentText.trim() || null,
    daily_impact: intake.dailyImpact || null,
    return_to_sport_goal: intake.returnToSportGoal,
    sport_type: intake.sportType.trim() || null,
    return_to_work_goal: intake.returnToWorkGoal,
    goal_timeframe_months: intake.goalTimeframeMonths,
    patient_goal_text: intake.patientGoalText.trim() || null,
    therapist_observations: intake.therapistObservations.trim() || null,
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
    .select(`
      id, visit_reason, body_side, pregnancy_related, radiating_pain, height_cm, weight_kg, pain_score_now, swelling, pain_location,
      mobility_aid, weight_bearing_status, rom_degrees, additional_procedures, symptom_onset, previous_treatment_text,
      daily_impact, return_to_sport_goal, sport_type, return_to_work_goal, goal_timeframe_months, patient_goal_text,
      therapist_observations, ai_summary, ai_attention_points, ai_recommendation_reasoning, completed_at, created_by,
      ai_recommended_protocol_id
    `)
    .eq("patient_id", patientId)
    .order("completed_at", { ascending: false, nullsFirst: false })
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
  };
}
