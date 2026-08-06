"use client";

import { FieldLabel, inputStyle } from "./shared";
import { VISIT_REASON_LABELS, getBodyRegion, type IntakeInput } from "@/lib/intakeAnalysis";

interface IntakeStepProps {
  value: IntakeInput;
  onChange: <K extends keyof IntakeInput>(key: K, value: IntakeInput[K]) => void;
  injuryType: string;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 mt-1" style={{ color: "#b5b0a8" }}>{children}</h3>;
}

export function IntakeStep({ value, onChange, injuryType }: IntakeStepProps) {
  const isSurgery = value.visitReason === "surgery";
  const region = getBodyRegion(injuryType);
  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-400 -mt-2">
        {value.visitReason
          ? `Deze intake is toegespitst op: ${VISIT_REASON_LABELS[value.visitReason].toLowerCase()}. Alle velden hieronder zijn optioneel — vul in wat je nu al weet.`
          : "Alle velden zijn optioneel — vul in wat je nu al weet."}
        {" "}REVA gebruikt dit om een intelligente analyse en herstelplan-aanbeveling voor te bereiden.
      </p>

      <div>
        <SectionHeading>Klachten &amp; pijn</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel>Pijnscore nu (0-10)</FieldLabel>
            <input
              type="number" min={0} max={10} value={value.painScoreNow ?? ""}
              onChange={(e) => onChange("painScoreNow", e.target.value === "" ? null : Number(e.target.value))}
              placeholder="Bijv. 5" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
            />
          </div>
          <div>
            <FieldLabel>Zwelling</FieldLabel>
            <select
              value={value.swelling} onChange={(e) => onChange("swelling", e.target.value as IntakeInput["swelling"])}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
            >
              <option value="">Niet opgegeven</option>
              <option value="none">Geen</option>
              <option value="mild">Licht</option>
              <option value="significant">Aanwezig</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>Pijnlocatie (optioneel)</FieldLabel>
            <input
              type="text" value={value.painLocation} onChange={(e) => onChange("painLocation", e.target.value)}
              placeholder="Waar zit de pijn precies?" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
            />
          </div>
        </div>
      </div>

      <div>
        <SectionHeading>Mobiliteit &amp; functioneren</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel>Hulpmiddel</FieldLabel>
            <select
              value={value.mobilityAid} onChange={(e) => onChange("mobilityAid", e.target.value as IntakeInput["mobilityAid"])}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
            >
              <option value="">Niet opgegeven</option>
              <option value="none">Geen</option>
              <option value="one_crutch">1 kruk</option>
              <option value="two_crutches">2 krukken</option>
              <option value="walker">Rollator</option>
              <option value="wheelchair">Rolstoel</option>
              <option value="tape_bandage">Tape/verband</option>
              <option value="brace">Brace</option>
              <option value="other">Anders</option>
            </select>
          </div>
          <div>
            <FieldLabel>Belasting</FieldLabel>
            <select
              value={value.weightBearingStatus} onChange={(e) => onChange("weightBearingStatus", e.target.value as IntakeInput["weightBearingStatus"])}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
            >
              <option value="">Niet opgegeven</option>
              <option value="full">Volledig belasten</option>
              <option value="partial">Deels belasten</option>
              <option value="non_weight_bearing">Niet belasten</option>
            </select>
          </div>
          {region === "joint" && (
            <div>
              <FieldLabel>Mobiliteit / ROM in graden (optioneel)</FieldLabel>
              <input
                type="number" min={0} max={180} value={value.romDegrees ?? ""}
                onChange={(e) => onChange("romDegrees", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="Bijv. 80" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
              />
            </div>
          )}
          {isSurgery && (
            <div>
              <FieldLabel>Aanvullende ingreep (optioneel)</FieldLabel>
              <input
                type="text" value={value.additionalProcedures} onChange={(e) => onChange("additionalProcedures", e.target.value)}
                placeholder="Bijv. meniscushechting" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
              />
            </div>
          )}
        </div>
      </div>

      {(region === "spine" || region === "pelvic") && (
        <div>
          <SectionHeading>{region === "spine" ? "Rug- of nekklachten" : "Bekkenklachten"}</SectionHeading>
          {region === "spine" && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={value.radiatingPain} onChange={(e) => onChange("radiatingPain", e.target.checked)} />
              Uitstraling naar arm of been
            </label>
          )}
          {region === "pelvic" && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={value.pregnancyRelated} onChange={(e) => onChange("pregnancyRelated", e.target.checked)} />
              Gerelateerd aan zwangerschap of bevalling
            </label>
          )}
        </div>
      )}

      {!isSurgery && (
        <div>
          <SectionHeading>Achtergrond van de klacht</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Sinds wanneer klachten?</FieldLabel>
              <select
                value={value.symptomOnset} onChange={(e) => onChange("symptomOnset", e.target.value as IntakeInput["symptomOnset"])}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
              >
                <option value="">Niet opgegeven</option>
                <option value="lt_2_weeks">Minder dan 2 weken</option>
                <option value="2_6_weeks">2 tot 6 weken</option>
                <option value="6_12_weeks">6 tot 12 weken</option>
                <option value="gt_3_months">Meer dan 3 maanden</option>
              </select>
            </div>
            <div>
              <FieldLabel>Beperking dagelijks functioneren</FieldLabel>
              <select
                value={value.dailyImpact} onChange={(e) => onChange("dailyImpact", e.target.value as IntakeInput["dailyImpact"])}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
              >
                <option value="">Niet opgegeven</option>
                <option value="none">Geen beperking</option>
                <option value="mild">Lichte beperking</option>
                <option value="moderate">Matige beperking</option>
                <option value="severe">Ernstige beperking</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Eerdere behandeling of therapie voor deze klacht? (optioneel)</FieldLabel>
              <input
                type="text" value={value.previousTreatmentText} onChange={(e) => onChange("previousTreatmentText", e.target.value)}
                placeholder="Bijv. eerder fysiotherapie gehad in 2024" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <SectionHeading>Herstel &amp; doelen</SectionHeading>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={value.returnToSportGoal} onChange={(e) => onChange("returnToSportGoal", e.target.checked)} />
              Terug naar sport
            </label>
            {value.returnToSportGoal && (
              <input
                type="text" value={value.sportType} onChange={(e) => onChange("sportType", e.target.value)}
                placeholder="Welke sport?" className="text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
              />
            )}
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={value.returnToWorkGoal} onChange={(e) => onChange("returnToWorkGoal", e.target.checked)} />
              Terug naar werk
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Persoonlijk doel binnen ... maanden (optioneel)</FieldLabel>
              <input
                type="number" min={0} value={value.goalTimeframeMonths ?? ""}
                onChange={(e) => onChange("goalTimeframeMonths", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="Bijv. 9" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Wat wil de patiënt weer kunnen? (optioneel)</FieldLabel>
            <textarea
              value={value.patientGoalText} onChange={(e) => onChange("patientGoalText", e.target.value)}
              rows={2} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none resize-none" style={inputStyle}
            />
          </div>
          <div>
            <FieldLabel>Observaties therapeut (optioneel)</FieldLabel>
            <textarea
              value={value.therapistObservations} onChange={(e) => onChange("therapistObservations", e.target.value)}
              rows={2} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none resize-none" style={inputStyle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
