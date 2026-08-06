"use client";

import { Scissors, Zap, Repeat, TrendingUp, HeartPulse, MoreHorizontal, type LucideIcon } from "lucide-react";
import { BLESSURE_TYPEN } from "@/lib/data";
import { VISIT_REASON_LABELS, hasLaterality, type VisitReason, type BodySide } from "@/lib/intakeAnalysis";
import { FieldLabel, inputStyle } from "./shared";

interface AanleidingStepProps {
  visitReason: VisitReason | "";
  onVisitReasonChange: (reason: VisitReason) => void;
  injuryType: string;
  onInjuryTypeChange: (value: string) => void;
  sportType: string;
  onSportTypeChange: (value: string) => void;
  bodySide: BodySide | "";
  onBodySideChange: (value: BodySide) => void;
  error?: string;
}

const BODY_SIDE_OPTIONS: { value: BodySide; label: string }[] = [
  { value: "left", label: "Links" },
  { value: "right", label: "Rechts" },
  { value: "both", label: "Beide zijden" },
];

const REASON_ICONS: Record<VisitReason, LucideIcon> = {
  surgery: Scissors,
  sports_injury: Zap,
  chronic_complaint: Repeat,
  overuse: TrendingUp,
  rehabilitation: HeartPulse,
  other: MoreHorizontal,
};

const REASON_ORDER: VisitReason[] = ["surgery", "sports_injury", "chronic_complaint", "overuse", "rehabilitation", "other"];

/** Vaste sporten waar fysiopraktijken het vaakst mee te maken krijgen (bv. via sportclubs) — "Anders" geeft een vrij tekstveld. */
const SPORT_OPTIONS = ["Voetbal", "Hardlopen", "Tennis", "Hockey", "Fitness/Krachttraining", "Basketbal", "Volleybal", "Anders"];

/** Welke operatie? — mapt direct op bestaande BLESSURE_TYPEN-waarden (lib/data.ts). */
const OPERATION_OPTIONS = [
  { value: "knieprothese", label: "Nieuwe knie" },
  { value: "heupprothese", label: "Nieuwe heup" },
  { value: "acl", label: "ACL" },
  { value: "meniscus", label: "Meniscus" },
  { value: "schouder", label: "Schouder" },
  { value: "rug", label: "Hernia" },
];

/**
 * Vier bewust verschillende "waar zit de klacht"-lijsten — één per
 * niet-operatieve aanleiding. Voorheen kreeg elke aanleiding dezelfde lijst,
 * waardoor bv. "Sportblessure → Knie" en "Revalidatie → Knee" op precies
 * dezelfde blessuretype/categorie uitkwamen, terwijl dit klinisch echt
 * andere trajecten zijn (acuut vs. overbelasting vs. chronisch/degeneratief
 * vs. algemene revalidatie). Zie migratie 097 voor de bijbehorende nieuwe
 * injury_category-waarden.
 */
const SPORT_LOCATION_OPTIONS = [
  { value: "knieband", label: "Knie" },
  { value: "enkel", label: "Enkel" },
  { value: "schouderluxatie", label: "Schouder" },
  { value: "hamstring", label: "Hamstring" },
  { value: "lies", label: "Lies" },
  { value: "kuitblessure", label: "Kuit" },
];

const OVERUSE_LOCATION_OPTIONS = [
  { value: "lopersknie", label: "Knie" },
  { value: "scheenbeenvliesklachten", label: "Onderbeen/scheenbeen" },
  { value: "hielspoor", label: "Hiel/voet" },
  { value: "achilles", label: "Achillespees" },
  { value: "elleboogklachten", label: "Elleboog" },
  { value: "schouder", label: "Schouder" },
];

const CHRONIC_LOCATION_OPTIONS = [
  { value: "rug", label: "Rug" },
  { value: "nekklachten", label: "Nek" },
  { value: "knieartrose", label: "Knie" },
  { value: "heupartrose", label: "Heup" },
  { value: "bevroren_schouder", label: "Schouder" },
];

/** Revalidatie: algemene, niet-specifieke lijst, inclusief bekken-/buikwandherstel na zwangerschap. */
const REHAB_LOCATION_OPTIONS = [
  { value: "knieband", label: "Knie" },
  { value: "enkel", label: "Enkel" },
  { value: "schouder", label: "Schouder" },
  { value: "hamstring", label: "Hamstring" },
  { value: "rug", label: "Rug" },
  { value: "spier", label: "Spier" },
  { value: "pees", label: "Pees" },
  { value: "achilles", label: "Achillespees" },
  { value: "patella", label: "Kniepees" },
  { value: "bekkeninstabiliteit", label: "Bekkeninstabiliteit" },
  { value: "bekkenbodemklachten", label: "Bekkenbodem" },
  { value: "diastase_recti", label: "Buikwand (diastase recti)" },
];

const LOCATION_OPTIONS_BY_REASON: Partial<Record<VisitReason, { value: string; label: string }[]>> = {
  sports_injury: SPORT_LOCATION_OPTIONS,
  overuse: OVERUSE_LOCATION_OPTIONS,
  chronic_complaint: CHRONIC_LOCATION_OPTIONS,
  rehabilitation: REHAB_LOCATION_OPTIONS,
};

function OptionCard({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl border px-3.5 py-3 text-sm font-medium transition-colors"
      style={{
        borderColor: selected ? "var(--brand-accent, #e8632a)" : "#e8e5df",
        background: selected ? "#fff3ee" : "#ffffff",
        color: selected ? "#1a1a1a" : "#374151",
      }}
    >
      {label}
    </button>
  );
}

function ReasonCard({ reason, selected, onClick }: { reason: VisitReason; selected: boolean; onClick: () => void }) {
  const Icon = REASON_ICONS[reason];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 text-left rounded-xl border px-4 py-3.5 transition-colors"
      style={{
        borderColor: selected ? "var(--brand-accent, #e8632a)" : "#e8e5df",
        background: selected ? "#fff3ee" : "#ffffff",
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: selected ? "var(--brand-accent, #e8632a)" : "#f8f7f4" }}
      >
        <Icon size={15} style={{ color: selected ? "#ffffff" : "#6b7280" }} />
      </div>
      <span className="text-sm font-medium" style={{ color: selected ? "#1a1a1a" : "#374151" }}>
        {VISIT_REASON_LABELS[reason]}
      </span>
    </button>
  );
}

export function AanleidingStep({
  visitReason, onVisitReasonChange, injuryType, onInjuryTypeChange, sportType, onSportTypeChange,
  bodySide, onBodySideChange, error,
}: AanleidingStepProps) {
  const locationOptions = visitReason ? LOCATION_OPTIONS_BY_REASON[visitReason] : undefined;
  const isKnownSport = SPORT_OPTIONS.slice(0, -1).includes(sportType);
  const showBodySide = injuryType !== "" && hasLaterality(injuryType);

  return (
    <div className="space-y-6">
      <div>
        <FieldLabel>Waarvoor komt de patiënt?</FieldLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
          {REASON_ORDER.map((reason) => (
            <ReasonCard
              key={reason}
              reason={reason}
              selected={visitReason === reason}
              onClick={() => {
                onVisitReasonChange(reason);
                onInjuryTypeChange(""); // vorige level-2 keuze vervalt bij een andere aanleiding
              }}
            />
          ))}
        </div>
      </div>

      {visitReason === "sports_injury" && (
        <div>
          <FieldLabel>Welke sport?</FieldLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2">
            {SPORT_OPTIONS.map((s) => (
              <OptionCard
                key={s} label={s}
                selected={s === "Anders" ? !isKnownSport && sportType !== "" : sportType === s}
                onClick={() => onSportTypeChange(s === "Anders" ? "" : s)}
              />
            ))}
          </div>
          {!isKnownSport && (
            <input
              type="text" value={sportType} onChange={(e) => onSportTypeChange(e.target.value)}
              placeholder="Welke sport?" className="w-full text-sm rounded-xl border px-3 py-2 mt-2.5 focus:outline-none" style={inputStyle}
            />
          )}
        </div>
      )}

      {visitReason === "surgery" && (
        <div>
          <FieldLabel>Welke operatie?</FieldLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
            {OPERATION_OPTIONS.map((o) => (
              <OptionCard key={o.value} label={o.label} selected={injuryType === o.value} onClick={() => onInjuryTypeChange(o.value)} />
            ))}
          </div>
        </div>
      )}

      {locationOptions && (
        <div>
          <FieldLabel>Waar zit de klacht?</FieldLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
            {locationOptions.map((o) => (
              <OptionCard key={o.value} label={o.label} selected={injuryType === o.value} onClick={() => onInjuryTypeChange(o.value)} />
            ))}
          </div>
        </div>
      )}

      {visitReason === "other" && (
        <div>
          <FieldLabel>Blessuretype</FieldLabel>
          <select
            value={injuryType} onChange={(e) => onInjuryTypeChange(e.target.value)}
            className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
          >
            <option value="">Kies een blessuretype</option>
            {BLESSURE_TYPEN.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
      )}

      {showBodySide && (
        <div>
          <FieldLabel>Welke zijde? (optioneel)</FieldLabel>
          <div className="grid grid-cols-3 gap-2.5 mt-2">
            {BODY_SIDE_OPTIONS.map((o) => (
              <OptionCard key={o.value} label={o.label} selected={bodySide === o.value} onClick={() => onBodySideChange(o.value)} />
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
    </div>
  );
}
