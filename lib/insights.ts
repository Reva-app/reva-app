// ─── Gedeelde regel-gebaseerde inzicht-helpers ─────────────────────────────
// Eén canonieke plek voor trend/streak-berekeningen die anders in meerdere
// bestanden apart werden bijgehouden (app/(app)/page.tsx en lib/coach.ts
// hadden allebei een byte-identieke computeTrend()).

export type Trend = "stijgend" | "dalend" | "stabiel" | "onbekend";

/**
 * Vergelijkt de eerste helft met de tweede helft van een reeks scores
 * (bv. dagscores van de laatste 7 dagen) om een trajectory-trend te bepalen.
 * Voor periode-over-periode vergelijkingen (bv. "deze week" vs "vorige
 * week") is analyse/page.tsx's eigen trendOf() bedoeld — dat is een ander
 * vraagstuk (twee al-berekende gemiddeldes vergelijken) en blijft bewust
 * apart.
 */
export function computeTrend(scores: number[], threshold = 0.3): Trend {
  if (scores.length < 4) return "onbekend";
  const mid = Math.floor(scores.length / 2);
  const earlyAvg = scores.slice(0, mid).reduce((s, v) => s + v, 0) / mid;
  const lateAvg = scores.slice(mid).reduce((s, v) => s + v, 0) / (scores.length - mid);
  if (lateAvg > earlyAvg + threshold) return "stijgend";
  if (lateAvg < earlyAvg - threshold) return "dalend";
  return "stabiel";
}

export function average(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

/**
 * Telt hoeveel opeenvolgende items (nieuwste eerst) aan een voorwaarde
 * voldoen, vanaf het begin van de lijst — stopt bij het eerste item dat niet
 * voldoet. Zelfde patroon als de streak-tellers in analyse/page.tsx.
 */
export function countLeadingStreak<T>(itemsNewestFirst: T[], predicate: (item: T) => boolean): number {
  let streak = 0;
  for (const item of itemsNewestFirst) {
    if (predicate(item)) streak++;
    else break;
  }
  return streak;
}

/**
 * Deterministische "van de dag"-index in een array: stabiel gedurende de
 * hele kalenderdag, wisselt om middernacht. Gebruikt voor zowel de
 * motiverende quote-bank als de dagelijkse protocol-tip.
 */
export function dayOfYearIndex(length: number, date: Date = new Date()): number {
  if (length <= 0) return 0;
  const start = new Date(date.getFullYear(), 0, 0);
  const diffMs = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return dayOfYear % length;
}
