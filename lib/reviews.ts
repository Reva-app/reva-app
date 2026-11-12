/**
 * Reviews op een natuurlijk moment vragen, alleen aan praktijkeigenaren
 * (de klanten van REVA). Patiënten en behandelaars vragen we bewust niet.
 *
 * Uitgangspunten:
 * - Alleen na echte waarde (weken actief gebruik met patiënten), nooit bij
 *   de eerste kennismaking.
 * - Iedereen die het verzoek ziet krijgt dezelfde keuze: een Google-review
 *   óf feedback aan ons. Geen selectie op tevredenheid ("review gating"):
 *   dat is in strijd met het reviewbeleid van Google.
 * - Zelden: hoogstens 3 keer per persoon, minstens 45 dagen ertussen, en
 *   nooit meer na "Niet meer vragen" of na het schrijven van een review.
 */
import { createClient } from "@/lib/supabaseClient";

export const GOOGLE_REVIEW_URL = "https://g.page/r/CSeUluPTzzgiEBM/review";

export type ReviewAudience = "owner";
export type ReviewEvent = "shown" | "review" | "feedback" | "later" | "never";

interface ReviewHistoryRow { event: ReviewEvent; created_at: string }

const DAY = 86_400_000;

export async function loadReviewHistory(): Promise<ReviewHistoryRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("review_prompts").select("event, created_at").order("created_at", { ascending: false }).limit(50);
  if (error) { console.error("[loadReviewHistory]", error.message); return []; }
  return (data ?? []) as ReviewHistoryRow[];
}

export async function recordReviewEvent(audience: ReviewAudience, trigger: string, event: ReviewEvent): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("review_prompts").insert({ audience, trigger: trigger.slice(0, 40), event });
  if (error) console.error("[recordReviewEvent]", error.message);
}

/** Nooit vragen aan het REVA-team zelf (platformbeheer) of aan demo-accounts. */
export async function isReviewExcluded(email: string | null | undefined): Promise<boolean> {
  if (email?.toLowerCase().endsWith("@demo.reva-app.nl")) return true;
  const supabase = createClient();
  const { data } = await supabase.rpc("is_platform_admin");
  return data === true;
}

/** Mag het verzoek (weer) getoond worden? */
export function mayAsk(history: ReviewHistoryRow[], now: number): boolean {
  if (history.some((h) => h.event === "never" || h.event === "review")) return false;
  if (history.filter((h) => h.event === "shown").length >= 3) return false;
  const last = history[0];
  if (!last) return true;
  const days = (now - new Date(last.created_at).getTime()) / DAY;
  const wait = last.event === "feedback" ? 90 : last.event === "later" ? 30 : 45;
  return days >= wait;
}

/** Praktijkeigenaar: na een paar weken echt gebruik met patiënten. */
export function ownerReviewTrigger(input: { daysSinceJoin: number; patientCount: number }): string | null {
  return input.daysSinceJoin >= 45 && input.patientCount >= 5 ? "praktijk-in-gebruik" : null;
}
