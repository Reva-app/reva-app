import { createClient } from "@/lib/supabaseClient";

export type InsightAction = "applied" | "dismissed" | "opened";

/** Leesbare naam per soort voorstel (regel), voor de Analyse-pagina. */
export const INSIGHT_RULE_LABELS: Record<string, string> = {
  "inzicht-stil": "Even contact opnemen (geen check-ins)",
  "inzicht-geen-checkins": "Nog geen check-ins",
  "inzicht-pijn": "Belasting bespreken (pijn)",
  "inzicht-zwelling": "Zwelling navragen",
  "inzicht-dagscore": "Kort inchecken (dagscore)",
  "inzicht-trouw": "Trainingsschema haalbaar maken",
  "inzicht-opbouw": "Klaar voor opbouw (overzicht)",
  "inzicht-fase": "Door naar de volgende fase (overzicht)",
  "inzicht-notitie": "Notitie van de patiënt lezen",
  "inzicht-geen-plan": "Herstelplan kiezen",
  "inzicht-plan": "Voorstellen voor het herstelplan",
  "inzicht-hertest": "Test opnieuw afnemen",
  "plan-opbouw": "Oefening opbouwen",
  "plan-opbouw-alles": "Meerdere oefeningen opbouwen",
  "plan-pijn": "Oefening lichter (pijn)",
  "plan-pijn-alles": "Hele training lichter (pijn)",
  "plan-sets": "Oefening lichter (sets niet gehaald)",
  "plan-skip": "Vaak overgeslagen oefening",
  "plan-fase-klaar": "Volgende fase starten",
  "plan-fase-check": "Fasedoelen nalopen",
};

/** Soort voorstel uit het voorstel-id: "pijn:2026-11-09" → "inzicht-pijn". */
export function insightRule(source: "inzicht" | "plan", suggestionId: string): string {
  const [head, second] = suggestionId.split(":");
  return `${source}-${head}${second === "alles" || suggestionId.includes(":alles:") ? "-alles" : ""}`.slice(0, 40);
}

export async function loadDismissedSuggestions(patientId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("insight_feedback")
    .select("suggestion_id")
    .eq("patient_id", patientId)
    .in("action", ["dismissed", "applied"]);
  if (error) { console.error("[loadDismissedSuggestions]", error.message); return []; }
  return (data ?? []).map((r) => r.suggestion_id as string);
}

export async function recordInsightFeedback(patientId: string, suggestionId: string, rule: string, action: InsightAction): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("insight_feedback").insert({
    patient_id: patientId,
    suggestion_id: suggestionId.slice(0, 400),
    rule: rule.slice(0, 40),
    action,
  });
  if (error) console.error("[recordInsightFeedback]", error.message);
}

export interface InsightRuleStat { rule: string; applied: number; dismissed: number; opened: number }

export async function loadInsightStats(organizationId: string, days = 90): Promise<InsightRuleStat[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("insight_feedback_stats", { p_organization_id: organizationId, p_days: days });
  if (error) { console.error("[loadInsightStats]", error.message); return []; }
  return (data ?? []) as InsightRuleStat[];
}
