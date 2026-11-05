/**
 * Proefperiode (migratie 129). Moet in sync blijven met trial_grace_days()
 * en org_is_open() in de database — die is de echte grens, dit is alleen
 * voor de weergave.
 */
export const TRIAL_GRACE_DAYS = 3;
export const DEFAULT_TRIAL_DAYS = 30;

export type TrialState =
  | { kind: "none" }
  | { kind: "trial"; daysLeft: number }
  | { kind: "grace"; graceDaysLeft: number }
  | { kind: "expired" };

function todayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/** daysLeft = 0 betekent: vandaag is de laatste dag. */
export function trialState(status: string | null | undefined, trialEndsAt: string | null | undefined): TrialState {
  if (status !== "trial" || !trialEndsAt) return { kind: "none" };
  const daysLeft = daysBetween(todayLocal(), parseDate(trialEndsAt));
  if (daysLeft >= 0) return { kind: "trial", daysLeft };
  const graceDaysLeft = TRIAL_GRACE_DAYS + daysLeft;
  if (graceDaysLeft >= 0) return { kind: "grace", graceDaysLeft };
  return { kind: "expired" };
}

/** "YYYY-MM-DD" van vandaag + n dagen (lokale tijd). */
export function isoDatePlusDays(days: number, from?: string | null): string {
  const base = from ? parseDate(from) : todayLocal();
  const start = base < todayLocal() ? todayLocal() : base;
  start.setDate(start.getDate() + days);
  const mm = String(start.getMonth() + 1).padStart(2, "0");
  const dd = String(start.getDate()).padStart(2, "0");
  return `${start.getFullYear()}-${mm}-${dd}`;
}

export function dayLabel(n: number): string {
  return n === 1 ? "1 dag" : `${n} dagen`;
}
