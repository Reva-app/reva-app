"use client";

import { ReportChart } from "@/components/reports/ReportChart";
import { BLESSURE_TYPEN, formatDate } from "@/lib/data";
import { formatTestValue, headlineValue, lsi, type PatientTest } from "@/lib/services/testService";
import type { PortalCheckinTrendPoint, PortalPatient, PortalMainGoal } from "@/lib/services/portalService";
import type { PortalPatientProtocolAssignment, PortalTrainingSessionLog } from "@/lib/services/protocolService";

export type ReportSection = "samenvatting" | "verloop" | "herstelplan" | "testen" | "training" | "toelichting";

export const REPORT_SECTION_LABELS: Record<ReportSection, string> = {
  samenvatting: "Samenvatting",
  verloop: "Pijn en dagscore",
  herstelplan: "Herstelplan en fases",
  testen: "Testen",
  training: "Training",
  toelichting: "Toelichting behandelaar",
};

export interface ProgressReportData {
  practice: { name: string; logoUrl: string | null; addressLine: string | null; phone: string | null; email: string | null };
  patient: PortalPatient;
  checkins: PortalCheckinTrendPoint[];
  assignment: PortalPatientProtocolAssignment | null;
  tests: PatientTest[];
  sessions28: PortalTrainingSessionLog[];
  sessionsTotal: number;
  mainGoal: PortalMainGoal | null;
}

const injuryLabel = (v: string | null) => (v ? BLESSURE_TYPEN.find((b) => b.value === v)?.label ?? v : null);
const nf = (n: number) => n.toLocaleString("nl-NL", { maximumFractionDigits: 1 });
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const DAY = 86_400_000;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] mb-3" style={{ color: "var(--brand-accent, #e8632a)" }}>{children}</h2>;
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-sm text-gray-900 font-medium">{value || "—"}</p>
    </div>
  );
}

/** Weekgemiddelden over de hele behandeling. */
function weekly(checkins: PortalCheckinTrendPoint[]) {
  const map = new Map<string, PortalCheckinTrendPoint[]>();
  for (const c of checkins) {
    const d = new Date(`${c.date}T12:00:00`);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const k = d.toISOString().slice(0, 10);
    map.set(k, [...(map.get(k) ?? []), c]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, cs]) => ({
    label: new Date(`${k}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
    pain: avg(cs.map((c) => c.painScore).filter((x): x is number => x !== null)),
    day: avg(cs.map((c) => c.dayScore)),
  }));
}

/**
 * Voortgangsrapport van één patiënt, als A4 in de huisstijl van de praktijk.
 * Wordt zowel als voorbeeld op het scherm als (via .reva-print-only) voor
 * het printen/opslaan als PDF gebruikt.
 */
export function ProgressReport({ data, sections, note, today }: {
  data: ProgressReportData;
  sections: Set<ReportSection>;
  note: string;
  today: number;
}) {
  const { practice, patient, assignment, tests } = data;
  const checkins = [...data.checkins].sort((a, b) => a.date.localeCompare(b.date));
  const withPain = checkins.filter((c) => c.painScore !== null);
  const painStart = withPain[0]?.painScore ?? null;
  const recent = checkins.filter((c) => (today - new Date(`${c.date}T12:00:00`).getTime()) / DAY < 28);
  const painNow = avg(recent.map((c) => c.painScore).filter((x): x is number => x !== null));
  const dayNow = avg(recent.map((c) => c.dayScore));
  const activePhaseIndex = assignment?.phases.findIndex((p) => p.status === "active") ?? -1;
  const activePhase = activePhaseIndex >= 0 ? assignment!.phases[activePhaseIndex] : null;
  const perWeek = activePhase ? activePhase.schedules.reduce((s, x) => s + Math.min(x.frequencyPerWeek, 14), 0) : 0;
  const adherence = perWeek ? Math.min(100, Math.round((data.sessions28.length / (perWeek * 4)) * 100)) : null;
  const weeks = weekly(checkins);
  const startDate = patient.createdAt.slice(0, 10);
  const weeksInTreatment = Math.max(1, Math.round((today - new Date(`${startDate}T12:00:00`).getTime()) / (7 * DAY)));
  const showTests = tests.filter((t) => t.results.length > 0);

  return (
    <article className="bg-white text-gray-900 mx-auto" style={{ maxWidth: 794, fontFamily: "inherit" }}>
      {/* Kop */}
      <header className="flex items-start justify-between gap-6 pb-5 border-b-2" style={{ borderColor: "var(--brand-accent, #e8632a)" }}>
        <div className="min-w-0">
          {practice.logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={practice.logoUrl} alt={practice.name} className="h-12 w-auto max-w-[220px] object-contain" />
            : <p className="text-lg font-bold">{practice.name}</p>}
          <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
            {[practice.addressLine, practice.phone, practice.email].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-bold tracking-tight">Voortgangsrapport</p>
          <p className="text-xs text-gray-500 mt-1">{formatDate(new Date(today).toISOString().slice(0, 10))}</p>
        </div>
      </header>

      {/* Patiënt */}
      <section className="reva-print-section grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 py-5 border-b" style={{ borderColor: "#ece9e3" }}>
        <Fact label="Patiënt" value={patient.fullName} />
        <Fact label="Geboortedatum" value={patient.dateOfBirth ? formatDate(patient.dateOfBirth) : null} />
        <Fact label="Blessure" value={injuryLabel(patient.injuryType)} />
        <Fact label={patient.surgeryDate ? "Operatiedatum" : "Datum blessure"} value={patient.surgeryDate ? formatDate(patient.surgeryDate) : patient.injuryDate ? formatDate(patient.injuryDate) : null} />
        <Fact label="Behandelaar" value={patient.therapistName} />
        <Fact label="In behandeling sinds" value={`${formatDate(startDate)} (${weeksInTreatment} wkn)`} />
        <Fact label="Herstelplan" value={assignment?.name ?? null} />
        <Fact label="Huidige fase" value={activePhase ? `${activePhaseIndex + 1} van ${assignment!.phases.length}: ${activePhase.name}` : assignment?.status === "completed" ? "Afgerond" : null} />
      </section>

      {sections.has("samenvatting") && (
        <section className="reva-print-section py-5 border-b" style={{ borderColor: "#ece9e3" }}>
          <SectionTitle>Samenvatting</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Pijn bij start", value: painStart === null ? "—" : `${painStart} / 10` },
              { label: "Pijn nu (gem. 4 wkn)", value: painNow === null ? "—" : `${nf(painNow)} / 10` },
              { label: "Dagscore (gem. 4 wkn)", value: dayNow === null ? "—" : `${nf(dayNow)} / 5` },
              { label: "Therapietrouw (4 wkn)", value: adherence === null ? "—" : `${adherence}%` },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border px-3 py-2.5" style={{ borderColor: "#ece9e3" }}>
                <p className="text-[11px] text-gray-500">{k.label}</p>
                <p className="text-lg font-bold tabular-nums">{k.value}</p>
              </div>
            ))}
          </div>
          {data.mainGoal && (
            <p className="text-sm text-gray-700 mt-3"><span className="font-semibold">Hoofddoel:</span> {data.mainGoal.title}{data.mainGoal.targetDate ? ` (streefdatum ${formatDate(data.mainGoal.targetDate)})` : ""}</p>
          )}
          <p className="text-sm text-gray-700 mt-2">
            {checkins.length} check-ins bijgehouden in {weeksInTreatment} weken en {data.sessionsTotal} trainingen gelogd.
            {painStart !== null && painNow !== null && painNow < painStart ? ` De pijn is gedaald van ${painStart} naar gemiddeld ${nf(painNow)}.` : ""}
          </p>
        </section>
      )}

      {sections.has("verloop") && weeks.length >= 2 && (
        <section className="reva-print-section py-5 border-b" style={{ borderColor: "#ece9e3" }}>
          <SectionTitle>Pijn en dagscore per week</SectionTitle>
          <ReportChart
            height={170}
            chart={{ kind: "line", labels: weeks.map((w) => w.label), series: [
              { name: "Pijn (0-10)", values: weeks.map((w) => (w.pain === null ? null : Math.round(w.pain * 10) / 10)) },
              { name: "Dagscore × 2 (0-10)", values: weeks.map((w) => (w.day === null ? null : Math.round(w.day * 20) / 10)) },
            ] }}
          />
          <p className="text-[11px] text-gray-500 mt-1">Op basis van de dagelijkse check-ins van de patiënt. De dagscore (1-5) is verdubbeld om op dezelfde schaal te tonen.</p>
        </section>
      )}

      {sections.has("herstelplan") && assignment && (
        <section className="reva-print-section py-5 border-b" style={{ borderColor: "#ece9e3" }}>
          <SectionTitle>Herstelplan en fases</SectionTitle>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] text-gray-500"><th className="font-medium pb-1.5">Fase</th><th className="font-medium pb-1.5">Status</th><th className="font-medium pb-1.5">Periode</th><th className="font-medium pb-1.5 text-right">Doelen</th></tr></thead>
            <tbody>
              {assignment.phases.map((ph, i) => (
                <tr key={ph.id} className="border-t" style={{ borderColor: "#f0ede8" }}>
                  <td className="py-1.5 pr-3">{i + 1}. {ph.name}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{ph.status === "completed" ? "Afgerond" : ph.status === "active" ? "Huidig" : "Nog niet gestart"}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap text-gray-600">{ph.startedAt ? formatDate(ph.startedAt.slice(0, 10)) : "—"}{ph.completedAt ? ` – ${formatDate(ph.completedAt.slice(0, 10))}` : ""}</td>
                  <td className="py-1.5 text-right tabular-nums text-gray-600">{ph.criteria.length ? `${ph.criteria.filter((c) => c.met).length}/${ph.criteria.length}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {activePhase && activePhase.criteria.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-700 mb-1">Doelen voor de volgende fase</p>
              <ul className="text-sm text-gray-700 space-y-0.5">
                {activePhase.criteria.map((c) => <li key={c.id}>{c.met ? "✓" : "○"} {c.description}</li>)}
              </ul>
            </div>
          )}
        </section>
      )}

      {sections.has("testen") && showTests.length > 0 && (
        <section className="reva-print-section py-5 border-b" style={{ borderColor: "#ece9e3" }}>
          <SectionTitle>Testen</SectionTitle>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] text-gray-500"><th className="font-medium pb-1.5">Test</th><th className="font-medium pb-1.5 text-right">Eerste meting</th><th className="font-medium pb-1.5 text-right">Laatste meting</th><th className="font-medium pb-1.5 text-right">Verschil</th><th className="font-medium pb-1.5 text-right">Symmetrie</th></tr></thead>
            <tbody>
              {showTests.map((t) => {
                const f = t.results[0], l = t.results[t.results.length - 1];
                const fv = headlineValue(t, f), lv = headlineValue(t, l);
                const d = t.results.length > 1 && fv !== null && lv !== null ? lv - fv : null;
                const s = lsi(t, l);
                return (
                  <tr key={t.id} className="border-t" style={{ borderColor: "#f0ede8" }}>
                    <td className="py-1.5 pr-3">{t.name}{t.bilateral && t.involvedSide ? <span className="text-gray-500"> (aangedaan {t.involvedSide === "left" ? "links" : "rechts"})</span> : null}</td>
                    <td className="py-1.5 text-right tabular-nums whitespace-nowrap">{formatTestValue(fv, t.unit)} <span className="text-[11px] text-gray-500">{formatDate(f.measuredOn)}</span></td>
                    <td className="py-1.5 text-right tabular-nums whitespace-nowrap">{t.results.length > 1 ? <>{formatTestValue(lv, t.unit)} <span className="text-[11px] text-gray-500">{formatDate(l.measuredOn)}</span></> : "—"}</td>
                    <td className="py-1.5 text-right tabular-nums">{d === null ? "—" : `${d > 0 ? "+" : ""}${formatTestValue(d, t.unit)}`}</td>
                    <td className="py-1.5 text-right tabular-nums">{s === null ? "—" : `${Math.round(s)}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[11px] text-gray-500 mt-2">Symmetrie: aangedane zijde als percentage van de gezonde zijde.</p>
        </section>
      )}

      {sections.has("training") && (
        <section className="reva-print-section py-5 border-b" style={{ borderColor: "#ece9e3" }}>
          <SectionTitle>Training</SectionTitle>
          <p className="text-sm text-gray-700">
            In totaal {data.sessionsTotal} trainingen gelogd, waarvan {data.sessions28.length} in de afgelopen 4 weken
            {perWeek ? ` (voorgeschreven: ${perWeek}× per week, therapietrouw ${adherence}%)` : ""}.
          </p>
          {activePhase && activePhase.schedules.length > 0 && (
            <ul className="text-sm text-gray-700 mt-2 space-y-0.5">
              {activePhase.schedules.map((s) => <li key={s.id}>• {s.title}: {s.exercises.length} oefeningen, {s.frequencyPerWeek}× per week</li>)}
            </ul>
          )}
        </section>
      )}

      {sections.has("toelichting") && note.trim() && (
        <section className="reva-print-section py-5 border-b" style={{ borderColor: "#ece9e3" }}>
          <SectionTitle>Toelichting behandelaar</SectionTitle>
          <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{note}</p>
          {patient.therapistName && <p className="text-sm text-gray-600 mt-3">{patient.therapistName}, {practice.name}</p>}
        </section>
      )}

      <footer className="pt-4 text-[10px] text-gray-400 leading-relaxed">
        Samengesteld door {practice.name} met REVA op {formatDate(new Date(today).toISOString().slice(0, 10))}. Gebaseerd op gegevens die de patiënt zelf bijhield
        en metingen van de behandelaar. Dit rapport is geen medische verklaring. Vertrouwelijk: bevat persoonsgegevens.
      </footer>
    </article>
  );
}
