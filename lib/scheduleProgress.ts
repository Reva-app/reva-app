// ─── Fase-timing Engine ─────────────────────────────────────────────────────
// Vertaalt week_range_label (bv. "Week 3-6" of "Week 20+") + started_at van
// de actieve fase naar een zachte "voor/op schema"-inschatting. Bewust
// GEEN "je loopt achter"-oordeel: bij een overschrijding van de bovengrens
// wordt "extra tijd nemen is normaal" geframed, nooit een verwijt. Voor
// open einde fases ("Week 20+") wordt nooit een bovengrens-overschrijding
// geclaimd, want die bestaat per definitie niet.

export type PhaseTimingStatus = "ahead" | "on_track" | "extra_tijd" | "onbekend";

export interface PhaseTimingEstimate {
  status: PhaseTimingStatus;
  weeksInPhase: number | null;
  message: string | null;
  /** Geschatte resterende weken tot het einde van deze fase, alleen bekend bij een gesloten bovengrens. */
  weeksRemaining: number | null;
}

function parseWeekRange(label: string | null): { min: number; max: number | null } | null {
  if (!label) return null;
  const match = label.match(/^Week\s*(\d+)(?:\s*-\s*(\d+)|\s*(\+))?$/i);
  if (!match) return null;
  const min = parseInt(match[1]!, 10);
  const max = match[3] ? null : match[2] ? parseInt(match[2], 10) : min;
  return { min, max };
}

export function estimatePhaseTiming(weekRangeLabel: string | null, startedAt: string | null, now: Date): PhaseTimingEstimate {
  const range = parseWeekRange(weekRangeLabel);
  if (!range || !startedAt) {
    return { status: "onbekend", weeksInPhase: null, message: null, weeksRemaining: null };
  }

  const started = new Date(startedAt);
  if (Number.isNaN(started.getTime())) {
    return { status: "onbekend", weeksInPhase: null, message: null, weeksRemaining: null };
  }

  const weeksInPhase = Math.floor((now.getTime() - started.getTime()) / (7 * 24 * 60 * 60 * 1000));

  if (weeksInPhase < range.min) {
    const diff = range.min - weeksInPhase;
    return {
      status: "ahead",
      weeksInPhase,
      weeksRemaining: range.max !== null ? Math.max(0, range.max - weeksInPhase) : null,
      message: `Je loopt ongeveer ${diff} ${diff === 1 ? "week" : "weken"} voor op het gebruikelijke tempo van deze fase.`,
    };
  }

  if (range.max !== null && weeksInPhase > range.max) {
    return {
      status: "extra_tijd",
      weeksInPhase,
      weeksRemaining: null,
      message: "Deze fase duurt bij jou iets langer dan gebruikelijk. Dat is heel normaal, blijf in gesprek met je behandelaar over de voortgang.",
    };
  }

  return {
    status: "on_track",
    weeksInPhase,
    weeksRemaining: range.max !== null ? Math.max(0, range.max - weeksInPhase) : null,
    message: "Je zit op het gebruikelijke tempo voor deze fase.",
  };
}
