"use client";

import { Input, Textarea, Select } from "@/components/ui/Field";
import {
  VISIT_REASON_LABELS, getBodyRegion,
  ONSET_MECHANISM_LABELS, SYMPTOM_COURSE_LABELS, WORK_LOAD_LABELS, SPORT_FREQUENCY_LABELS, SPORT_LEVEL_LABELS,
  REFERRAL_SOURCE_LABELS, SLEEP_IMPACT_LABELS, IMAGING_LABELS, RED_FLAG_LABELS,
  type IntakeInput, type RedFlag, type Imaging,
} from "@/lib/intakeAnalysis";

export type IntakeAudience = "therapist" | "patient";

interface IntakeStepProps {
  value: IntakeInput;
  onChange: <K extends keyof IntakeInput>(key: K, value: IntakeInput[K]) => void;
  injuryType: string;
  /** Wie vult in: de fysio (over "de patiënt") of de patiënt zelf (in de je-vorm). */
  audience?: IntakeAudience;
}

// ─── Kleine, rustige invoerelementen ─────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border p-4 sm:p-5 space-y-4" style={{ borderColor: "#e8e5df", background: "#ffffff" }}>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {children}
    </section>
  );
}

function Question({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-gray-700 mb-2">{label}</p>
      {children}
      {hint && <p className="text-xs text-subtle mt-1.5">{hint}</p>}
    </div>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="rounded-full border px-3.5 py-2 text-sm transition-colors min-h-10"
      style={{
        borderColor: selected ? "var(--brand-accent, #e8632a)" : "#e8e5df",
        background: selected ? "#fff3ee" : "#ffffff",
        color: selected ? "#1a1a1a" : "#4b5563",
        fontWeight: selected ? 500 : 400,
      }}
    >
      {children}
    </button>
  );
}

/** Eén keuze; nogmaals tikken op de gekozen optie zet hem weer uit. */
function ChoiceChips<T extends string>({ options, value, onChange }: {
  options: Record<T, string> | { value: T; label: string }[];
  value: T | "";
  onChange: (v: T | "") => void;
}) {
  const list = Array.isArray(options) ? options : (Object.entries(options) as [T, string][]).map(([v, l]) => ({ value: v, label: l }));
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((o) => (
        <Chip key={o.value} selected={value === o.value} onClick={() => onChange(value === o.value ? "" : o.value)}>{o.label}</Chip>
      ))}
    </div>
  );
}

function MultiChips<T extends string>({ options, value, onChange }: { options: Record<T, string>; value: T[]; onChange: (v: T[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.entries(options) as [T, string][]).map(([v, label]) => {
        const selected = value.includes(v);
        return (
          <Chip key={v} selected={selected} onClick={() => onChange(selected ? value.filter((x) => x !== v) : [...value, v])}>{label}</Chip>
        );
      })}
    </div>
  );
}

function YesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div className="flex gap-2">
      <Chip selected={value === true} onClick={() => onChange(value === true ? null : true)}>Ja</Chip>
      <Chip selected={value === false} onClick={() => onChange(value === false ? null : false)}>Nee</Chip>
    </div>
  );
}

/** 0 t/m 10 als tikbare schaal. */
function Scale({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div>
      <div className="grid grid-cols-11 gap-1">
        {Array.from({ length: 11 }, (_, n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(selected ? null : n)}
              aria-pressed={selected}
              className="h-10 rounded-lg border text-sm tabular-nums transition-colors"
              style={{
                borderColor: selected ? "var(--brand-accent, #e8632a)" : "#e8e5df",
                background: selected ? "var(--brand-accent, #e8632a)" : "#ffffff",
                color: selected ? "#ffffff" : "#4b5563",
                fontWeight: selected ? 600 : 400,
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] text-subtle mt-1"><span>Geen pijn</span><span>Ergst denkbaar</span></div>
    </div>
  );
}

const SYMPTOM_ONSET_OPTIONS = {
  lt_2_weeks: "Korter dan 2 weken", "2_6_weeks": "2 tot 6 weken", "6_12_weeks": "6 tot 12 weken", gt_3_months: "Langer dan 3 maanden",
} as const;
const SWELLING_OPTIONS = { none: "Geen", mild: "Een beetje", significant: "Duidelijk" } as const;
const WEIGHT_BEARING_OPTIONS = { full: "Volledig", partial: "Gedeeltelijk", non_weight_bearing: "Niet" } as const;
const DAILY_IMPACT_OPTIONS = { none: "Geen", mild: "Een beetje", moderate: "Behoorlijk", severe: "Heel erg" } as const;
const MOBILITY_AID_OPTIONS: { value: IntakeInput["mobilityAid"] & string; label: string }[] = [
  { value: "none", label: "Geen" },
  { value: "one_crutch", label: "1 kruk" },
  { value: "two_crutches", label: "2 krukken" },
  { value: "walker", label: "Rollator" },
  { value: "wheelchair", label: "Rolstoel" },
  { value: "brace", label: "Brace" },
  { value: "tape_bandage", label: "Tape/verband" },
  { value: "other", label: "Anders" },
];

/**
 * De inhoud van een volwaardige intake, zo eenvoudig mogelijk: korte vragen,
 * tikbare keuzes, alles optioneel. Gebruikt door de fysio in de wizard en
 * door de patiënt zelf (PatientIntakeScreen) — alleen de formulering
 * verschilt, plus "Observaties" die alleen de fysio ziet.
 */
export function IntakeStep({ value, onChange, injuryType, audience = "therapist" }: IntakeStepProps) {
  const isPatient = audience === "patient";
  const t = (therapist: string, patient: string) => (isPatient ? patient : therapist);
  const isSurgery = value.visitReason === "surgery";
  const region = getBodyRegion(injuryType);

  return (
    <div className="space-y-4">
      <p className="text-xs text-subtle -mt-1">
        {isPatient
          ? "Alles is optioneel. Vul in wat je weet; je fysiotherapeut bespreekt het daarna met je."
          : `${value.visitReason ? `Toegespitst op: ${VISIT_REASON_LABELS[value.visitReason].toLowerCase()}. ` : ""}Alles is optioneel — vul in wat je nu weet. REVA maakt er een samenvatting en herstelplan-voorstel van.`}
      </p>

      <Section title={t("De klacht", "Over je klacht")}>
        {!isSurgery && (
          <Question label={t("Hoe is het ontstaan?", "Hoe is het ontstaan?")}>
            <ChoiceChips
              options={(["sudden", "gradual", "unknown"] as const).map((k) => ({ value: k, label: ONSET_MECHANISM_LABELS[k] }))}
              value={value.onsetMechanism}
              onChange={(v) => onChange("onsetMechanism", v as IntakeInput["onsetMechanism"])}
            />
          </Question>
        )}
        <Question label={t("Wat is er gebeurd? (kort)", "Wat is er gebeurd? Vertel het kort in je eigen woorden")}>
          <Textarea
            rows={2}
            value={value.injuryDescription}
            onChange={(e) => onChange("injuryDescription", e.target.value)}
            placeholder={t("Bijv. verdraaiing tijdens voetbal, knie klapte naar binnen", "Bijv. tijdens voetbal verdraaide ik mijn knie")}
          />
        </Question>
        {isSurgery && (
          <Question label={t("Is er tijdens de operatie nog iets anders gedaan?", "Is er tijdens de operatie nog iets anders gedaan?")}>
            <Input value={value.additionalProcedures} onChange={(e) => onChange("additionalProcedures", e.target.value)} placeholder="Bijv. meniscushechting" />
          </Question>
        )}
        {!isSurgery && (
          <Question label={t("Hoe lang bestaan de klachten al?", "Hoe lang heb je er al last van?")}>
            <ChoiceChips options={SYMPTOM_ONSET_OPTIONS} value={value.symptomOnset} onChange={(v) => onChange("symptomOnset", v)} />
          </Question>
        )}
        <Question label={t("Hoe verloopt het tot nu toe?", "Hoe gaat het tot nu toe?")}>
          <ChoiceChips options={SYMPTOM_COURSE_LABELS} value={value.symptomCourse} onChange={(v) => onChange("symptomCourse", v)} />
        </Question>
        <Question label={t("Eerder behandeld voor deze klacht?", "Ben je hier al eerder voor behandeld?")}>
          <Input value={value.previousTreatmentText} onChange={(e) => onChange("previousTreatmentText", e.target.value)} placeholder="Bijv. fysiotherapie in 2024, injectie" />
        </Question>
      </Section>

      <Section title={t("Pijn", "Pijn")}>
        <Question label={t("Pijn op dit moment", "Hoeveel pijn heb je nu?")}>
          <Scale value={value.painScoreNow} onChange={(v) => onChange("painScoreNow", v)} />
        </Question>
        <Question label={t("Pijn op het ergste moment (afgelopen week)", "Hoeveel pijn had je op het ergste moment, de afgelopen week?")}>
          <Scale value={value.painWorst} onChange={(v) => onChange("painWorst", v)} />
        </Question>
        <Question label={t("Waar zit de pijn precies?", "Waar zit de pijn precies?")}>
          <Input value={value.painLocation} onChange={(e) => onChange("painLocation", e.target.value)} placeholder="Bijv. binnenkant van de knie" />
        </Question>
        <Question label={t("Wanneer is de pijn erger?", "Wanneer doet het meer pijn?")}>
          <Input value={value.painTriggers} onChange={(e) => onChange("painTriggers", e.target.value)} placeholder="Bijv. traplopen, lang zitten, 's ochtends" />
        </Question>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Question label="Zwelling">
            <ChoiceChips options={SWELLING_OPTIONS} value={value.swelling} onChange={(v) => onChange("swelling", v)} />
          </Question>
          <Question label={t("'s Nachts wakker van de pijn?", "Word je 's nachts wakker van de pijn?")}>
            <YesNo value={value.nightPain} onChange={(v) => onChange("nightPain", v)} />
          </Question>
        </div>
        {region === "spine" && (
          <Question label={t("Straalt de pijn uit naar arm of been?", "Straalt de pijn uit naar je arm of been?")}>
            <YesNo value={value.radiatingPain ? true : null} onChange={(v) => onChange("radiatingPain", v === true)} />
          </Question>
        )}
        {region === "pelvic" && (
          <Question label={t("Gerelateerd aan zwangerschap of bevalling?", "Hebben de klachten te maken met een zwangerschap of bevalling?")}>
            <YesNo value={value.pregnancyRelated ? true : null} onChange={(v) => onChange("pregnancyRelated", v === true)} />
          </Question>
        )}
      </Section>

      <Section title={t("Bewegen en dagelijks leven", "Bewegen en dagelijks leven")}>
        <Question label={t("Hulpmiddel", "Gebruik je een hulpmiddel?")}>
          <ChoiceChips options={MOBILITY_AID_OPTIONS} value={value.mobilityAid} onChange={(v) => onChange("mobilityAid", v as IntakeInput["mobilityAid"])} />
        </Question>
        {(isSurgery || region === "joint" || region === "muscle") && (
          <Question label={t("Mag/kan de patiënt belasten?", "Mag of kun je erop staan of steunen?")}>
            <ChoiceChips options={WEIGHT_BEARING_OPTIONS} value={value.weightBearingStatus} onChange={(v) => onChange("weightBearingStatus", v)} />
          </Question>
        )}
        <Question label={t("Hoeveel last in het dagelijks leven?", "Hoeveel last heb je ervan in je dagelijks leven?")}>
          <ChoiceChips options={DAILY_IMPACT_OPTIONS} value={value.dailyImpact} onChange={(v) => onChange("dailyImpact", v)} />
        </Question>
        <Question label="Slaap">
          <ChoiceChips options={SLEEP_IMPACT_LABELS} value={value.sleepImpact} onChange={(v) => onChange("sleepImpact", v)} />
        </Question>
      </Section>

      <Section title="Werk en sport">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Question label={t("Beroep", "Wat voor werk doe je?")}>
            <Input value={value.occupation} onChange={(e) => onChange("occupation", e.target.value)} placeholder="Bijv. verpleegkundige" />
          </Question>
          <div />
        </div>
        <Question label={t("Belasting op het werk", "Wat voor werk is het?")}>
          <ChoiceChips options={WORK_LOAD_LABELS} value={value.workLoad} onChange={(v) => onChange("workLoad", v)} />
        </Question>
        <Question label={t("Hoe vaak sport de patiënt?", "Hoe vaak sport je normaal?")}>
          <ChoiceChips options={SPORT_FREQUENCY_LABELS} value={value.sportFrequency} onChange={(v) => onChange("sportFrequency", v)} />
        </Question>
        {value.sportFrequency && value.sportFrequency !== "none" && (
          <Question label="Niveau">
            <ChoiceChips options={SPORT_LEVEL_LABELS} value={value.sportLevel} onChange={(v) => onChange("sportLevel", v)} />
          </Question>
        )}
      </Section>

      <Section title={t("Gezondheid", "Je gezondheid")}>
        <Question label={t("Andere aandoeningen of eerdere operaties", "Heb je andere aandoeningen of eerdere operaties gehad?")}>
          <Input value={value.medicalHistory} onChange={(e) => onChange("medicalHistory", e.target.value)} placeholder="Bijv. diabetes, hoge bloeddruk, eerdere knieoperatie" />
        </Question>
        <Question label={t("Medicijnen", "Welke medicijnen gebruik je?")}>
          <Input value={value.medicationText} onChange={(e) => onChange("medicationText", e.target.value)} placeholder="Bijv. paracetamol, bloedverdunners" />
        </Question>
        <Question label={t("Gemaakte scans of foto's", "Zijn er al scans of foto's gemaakt?")}>
          <MultiChips<Imaging> options={IMAGING_LABELS} value={value.imaging} onChange={(v) => onChange("imaging", v)} />
        </Question>
        <Question label={t("Verwezen door", "Wie heeft je doorgestuurd?")}>
          <ChoiceChips options={REFERRAL_SOURCE_LABELS} value={value.referralSource} onChange={(v) => onChange("referralSource", v)} />
        </Question>
        <div className="grid grid-cols-2 gap-4">
          <Question label="Lengte (cm)">
            <Input type="number" inputMode="numeric" min={50} max={250} value={value.heightCm ?? ""} onChange={(e) => onChange("heightCm", e.target.value === "" ? null : Number(e.target.value))} placeholder="178" />
          </Question>
          <Question label="Gewicht (kg)">
            <Input type="number" inputMode="decimal" min={20} max={300} step={0.1} value={value.weightKg ?? ""} onChange={(e) => onChange("weightKg", e.target.value === "" ? null : Number(e.target.value))} placeholder="82" />
          </Question>
        </div>
      </Section>

      <Section title={t("Even checken", "Even checken")}>
        <Question
          label={t("Heeft de patiënt last van een van deze dingen?", "Heb je last van een van deze dingen?")}
          hint={t("Een rode vlag verschijnt bovenaan in de aandachtspunten.", "Niets van dit alles? Dan hoef je niets aan te klikken.")}
        >
          <MultiChips<RedFlag> options={RED_FLAG_LABELS} value={value.redFlags} onChange={(v) => onChange("redFlags", v)} />
        </Question>
        <Question label={t("Maakt de patiënt zich zorgen dat bewegen de klacht erger maakt?", "Ben je bang dat bewegen je klacht erger maakt?")}>
          <YesNo value={value.fearOfMovement} onChange={(v) => onChange("fearOfMovement", v)} />
        </Question>
      </Section>

      <Section title={t("Doelen", "Wat wil je bereiken?")}>
        <div className="flex flex-wrap gap-2">
          <Chip selected={value.returnToSportGoal} onClick={() => onChange("returnToSportGoal", !value.returnToSportGoal)}>Terug naar sport</Chip>
          <Chip selected={value.returnToWorkGoal} onClick={() => onChange("returnToWorkGoal", !value.returnToWorkGoal)}>Terug naar werk</Chip>
        </div>
        {value.returnToSportGoal && (
          <Question label="Welke sport?">
            <Input value={value.sportType} onChange={(e) => onChange("sportType", e.target.value)} placeholder="Bijv. hardlopen" />
          </Question>
        )}
        <Question label={t("Wat wil de patiënt weer kunnen?", "Wat wil je weer kunnen?")}>
          <Textarea rows={2} value={value.patientGoalText} onChange={(e) => onChange("patientGoalText", e.target.value)} placeholder="Bijv. zonder pijn met de kinderen spelen" />
        </Question>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Question label={t("Binnen hoeveel maanden?", "Binnen hoeveel maanden zou je dat willen?")}>
            <Select value={value.goalTimeframeMonths ?? ""} onChange={(e) => onChange("goalTimeframeMonths", e.target.value === "" ? null : Number(e.target.value))}>
              <option value="">Geen voorkeur</option>
              {[1, 2, 3, 4, 6, 9, 12].map((m) => <option key={m} value={m}>{m} {m === 1 ? "maand" : "maanden"}</option>)}
            </Select>
          </Question>
        </div>
        <Question label={t("Wat verwacht de patiënt van de behandeling?", "Wat verwacht je van de behandeling?")}>
          <Input value={value.patientExpectation} onChange={(e) => onChange("patientExpectation", e.target.value)} placeholder="Bijv. weten wat ik zelf kan doen" />
        </Question>
        {!isPatient && (
          <Question label="Observaties therapeut">
            <Textarea rows={2} value={value.therapistObservations} onChange={(e) => onChange("therapistObservations", e.target.value)} />
          </Question>
        )}
      </Section>
    </div>
  );
}
