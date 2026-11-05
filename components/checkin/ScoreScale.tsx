"use client";

interface ScoreScaleProps {
  /** Naam van de schaal voor schermlezers, bv. "Pijnscore". */
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
  color?: string;
}

/**
 * Rij scoreknoppen (1–5 of 1–10) voor de check-in. Een schaal van 10 staat
 * op telefoons (< 640px) in twee rijen van 5, zodat elke knop een
 * tikdoel van minimaal 44px houdt in plaats van ±29px.
 */
export function ScoreScale({ label, value, max, onChange, color = "#e8632a" }: ScoreScaleProps) {
  const cols = max > 5 ? "grid-cols-5 sm:grid-cols-10" : "grid-cols-5";
  return (
    <div role="radiogroup" aria-label={label} className={`grid ${cols} gap-1.5`}>
      {Array.from({ length: max }, (_, i) => i + 1).map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={v === value}
          aria-label={`${v} van ${max}`}
          onClick={() => onChange(v)}
          className="h-11 sm:h-9 touch:h-11 rounded-xl text-sm font-medium transition-all touch-press"
          style={{
            background: v <= value ? color : "#f3f0eb",
            color: v <= value ? "#ffffff" : "#6b7280",
          }}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
