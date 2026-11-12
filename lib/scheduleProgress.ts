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

  // Weeklabels ("Week 6-12", "Week 12+") tellen vanaf het begin van het
  // traject; de verwachte duur van déze fase is dus het verschil.
  if (range.max === null) {
    return {
      status: "on_track",
      weeksInPhase,
      weeksRemaining: null,
      message: "Dit is de laatste fase: je bouwt verder op wat je hebt opgebouwd, in je eigen tempo.",
    };
  }

  const duration = Math.max(1, range.max - range.min);
  if (weeksInPhase > duration + 1) {
    return {
      status: "extra_tijd",
      weeksInPhase,
      weeksRemaining: null,
      message: "Deze fase duurt bij jou iets langer dan gebruikelijk. Dat is heel normaal, blijf in gesprek met je behandelaar over de voortgang.",
    };
  }

  const remaining = Math.max(0, duration - weeksInPhase);
  return {
    status: "on_track",
    weeksInPhase,
    weeksRemaining: remaining,
    message: remaining > 0
      ? `Deze fase duurt meestal nog ongeveer ${remaining} ${remaining === 1 ? "week" : "weken"}.`
      : "Je zit op het gebruikelijke tempo voor deze fase.",
  };
}
