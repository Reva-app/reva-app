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
