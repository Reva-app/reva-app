/**
 * Data voor Analyse en Rapporten (migratie 147, portal_report_data).
 * Eén aanroep per periode; de rapporten (lib/reports) rekenen verder.
 */
import { createClient } from "@/lib/supabaseClient";

export interface ReportPatient {
  id: string;
  name: string;
  status: string;
  created_on: string;
  discharged_on: string | null;
  discharge_outcome: string | null;
  injury_type: string | null;
  location: string | null;
  therapist_id: string | null;
  therapist: string | null;
  has_account: boolean;
  invited_on: string | null;
  first_checkin: string | null;
  last_checkin: string | null;
  checkins: number;
  avg_day: number | null;
  pain_first: number | null;
  pain_last: number | null;
  sessions: number;
  prescribed_per_week: number;
  plan: string | null;
}

export interface ReportDay {
  day: string;
  checkins: number;
  avg_day: number | null;
  avg_pain: number | null;
  sessions: number;
  new_patients: number;
  discharged: number;
}

export interface ReportPhase {
  patient_id: string;
  plan: string;
  phase: string;
  sort_order: number;
  started_on: string;
  completed_on: string | null;
}

interface ResultPoint { on: string; v: number | null; l: number | null; r: number | null }

export interface ReportTest {
  patient_id: string;
  name: string;
  unit: string;
  category: string;
  higher_is_better: boolean;
  bilateral: boolean;
  involved_side: "left" | "right" | null;
  results: number;
  first: ResultPoint;
  last: ResultPoint;
}

export interface ReportFeedback {
  patient_id: string;
  satisfaction: number | null;
  recommend: number | null;
  comment: string | null;
  created_on: string;
  declined: boolean;
}

export interface ReportData {
  from: string;
  to: string;
  /** Gezet als de cijfers alleen over één behandelaar gaan. */
  therapist: string | null;
  patients: ReportPatient[];
  daily: ReportDay[];
  phases: ReportPhase[];
  tests: ReportTest[];
  /** Tevredenheid bij afsluiting (migratie 148); leeg zolang die niet gedraaid is. */
  feedback?: ReportFeedback[];
}

export async function loadReportData(organizationId: string, from: string, to: string, therapistId: string | null = null): Promise<ReportData | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("portal_report_data", {
    p_organization_id: organizationId, p_from: from, p_to: to, p_therapist: therapistId,
  });
  if (error) { console.error("[loadReportData]", error.message); return null; }
  return data as ReportData | null;
}

// ─── Periode ────────────────────────────────────────────────────────────────

export type ReportPeriod = 7 | 30 | 90 | 365;
export const REPORT_PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 7, label: "Laatste 7 dagen" },
  { value: 30, label: "Laatste 30 dagen" },
  { value: 90, label: "Laatste 90 dagen" },
  { value: 365, label: "Laatste 12 maanden" },
];

export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Huidige periode en de periode ervoor (voor de vergelijking). */
export function periodRange(days: ReportPeriod, now = new Date()): { from: string; to: string; prevFrom: string; prevTo: string } {
  const to = new Date(now);
  const from = new Date(now); from.setDate(from.getDate() - (days - 1));
  const prevTo = new Date(from); prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return { from: isoDay(from), to: isoDay(to), prevFrom: isoDay(prevFrom), prevTo: isoDay(prevTo) };
}
