/**
 * Tevredenheid bij afsluiting (migratie 148): de patiënt beoordeelt na het
 * afronden van de behandeling het herstel en de begeleiding. Alleen voor
 * de praktijk zelf.
 */
import { createClient } from "@/lib/supabaseClient";

export interface PatientFeedback {
  satisfaction: number | null;
  recommend: number | null;
  comment: string | null;
  declined: boolean;
  createdAt: string;
  dischargedOn: string | null;
}

function map(r: Record<string, unknown>): PatientFeedback {
  return {
    satisfaction: r.satisfaction as number | null,
    recommend: r.recommend as number | null,
    comment: r.comment as string | null,
    declined: r.declined as boolean,
    createdAt: r.created_at as string,
    dischargedOn: r.discharged_on as string | null,
  };
}

/** Patiënt: is de behandeling afgesloten en is er voor deze afsluiting al gereageerd? */
export async function loadMyDischargeFeedbackState(patientId: string): Promise<{ dischargedAt: string | null; answered: boolean }> {
  const supabase = createClient();
  const { data: p } = await supabase.from("patients").select("discharged_at").eq("id", patientId).maybeSingle();
  const dischargedAt = (p?.discharged_at as string | null) ?? null;
  if (!dischargedAt) return { dischargedAt: null, answered: false };
  const { data: f } = await supabase.from("patient_feedback").select("id").eq("patient_id", patientId).eq("discharged_on", dischargedAt.slice(0, 10)).limit(1);
  return { dischargedAt, answered: (f ?? []).length > 0 };
}

export async function submitPatientFeedback(patientId: string, input: { satisfaction: number | null; recommend: number | null; comment: string; declined: boolean }): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("patient_feedback").insert({
    patient_id: patientId,
    satisfaction: input.declined ? null : input.satisfaction,
    recommend: input.declined ? null : input.recommend,
    comment: input.comment.trim() || null,
    declined: input.declined,
  });
  if (error) { console.error("[submitPatientFeedback]", error.message); return { error: "Versturen is niet gelukt. Probeer het later nog eens." }; }
  return { error: null };
}

/** Behandelaar: alle reacties van een patiënt (nieuwste eerst). */
export async function loadPatientFeedback(patientId: string): Promise<PatientFeedback[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("patient_feedback").select("*").eq("patient_id", patientId).order("created_at", { ascending: false });
  if (error) { console.error("[loadPatientFeedback]", error.message); return []; }
  return (data ?? []).map(map);
}
