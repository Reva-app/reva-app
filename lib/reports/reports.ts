/**
 * Rapporten voor het portaal (Analyse → Rapporten). Elk rapport rekent uit
 * dezelfde dataset (lib/services/reportService.ts) KPI's, een grafiek en
 * een tabel uit. Toevoegen = één definitie hieronder.
 */
import { BLESSURE_TYPEN } from "@/lib/data";
import { DISCHARGE_OUTCOME_LABELS, type DischargeOutcome } from "@/lib/services/portalService";
import type { ReportData, ReportDay, ReportPatient, ReportTest } from "@/lib/services/reportService";

export type ReportCategory = "herstel" | "betrokkenheid" | "praktijk" | "team";

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  herstel: "Herstel",
  betrokkenheid: "Betrokkenheid",
  praktijk: "Praktijk",
  team: "Team",
};

export interface ReportKpi { label: string; value: string; hint?: string }
export interface ReportSeries { name: string; values: (number | null)[] }
export interface ReportChart { kind: "line" | "bar"; labels: string[]; series: ReportSeries[]; unit?: string; /** Staande kolommen (tijd) i.p.v. liggende balken (categorieën). */ vertical?: boolean }
export interface ReportColumn { key: string; label: string; align?: "left" | "right" }
export type ReportCell = string | number | null;
export interface ReportTable { columns: ReportColumn[]; rows: Record<string, ReportCell>[] }

export interface ReportResult {
  kpis: ReportKpi[];
  chart: ReportChart | null;
  table: ReportTable;
  /** Korte uitleg onder het rapport. */
  note?: string;
}

export interface ReportDefinition {
  id: string;
  name: string;
  category: ReportCategory;
  description: string;
  /** Alleen zinvol voor de hele praktijk (eigenaar). */
  ownerOnly?: boolean;
  build: (d: ReportData) => ReportResult;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const nf = (n: number, digits = 1) => n.toLocaleString("nl-NL", { maximumFractionDigits: digits });
const pct = (n: number) => `${Math.round(n)}%`;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const dayMs = 86_400_000;
const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / dayMs);
const injuryLabel = (v: string | null) => (v ? BLESSURE_TYPEN.find((b) => b.value === v)?.label ?? v : "Onbekend");
const fmtDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });

/** Dagen groeperen per week of maand bij langere periodes. */
function bucket(daily: ReportDay[]): { label: string; days: ReportDay[] }[] {
  if (daily.length <= 31) return daily.map((d) => ({ label: fmtDate(d.day), days: [d] }));
  const byMonth = daily.length > 120;
  const groups = new Map<string, ReportDay[]>();
  for (const d of daily) {
    const dt = new Date(`${d.day}T12:00:00`);
    let key: string;
    if (byMonth) key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-01`;
    else { const dow = (dt.getDay() + 6) % 7; dt.setDate(dt.getDate() - dow); key = dt.toISOString().slice(0, 10); }
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  return [...groups.entries()].map(([k, days]) => ({
    label: byMonth ? new Date(`${k}T12:00:00`).toLocaleDateString("nl-NL", { month: "short", year: "2-digit" }) : `wk ${fmtDate(k)}`,
    days,
  }));
}

const sum = (days: ReportDay[], key: "checkins" | "sessions" | "new_patients" | "discharged") => days.reduce((s, d) => s + d[key], 0);
function weightedAvg(days: ReportDay[], key: "avg_day" | "avg_pain"): number | null {
  const xs = days.filter((d) => d[key] !== null && d.checkins > 0);
  const w = xs.reduce((s, d) => s + d.checkins, 0);
  return w ? Math.round((xs.reduce((s, d) => s + (d[key] as number) * d.checkins, 0) / w) * 10) / 10 : null;
}

function periodDays(d: ReportData) { return Math.max(1, daysBetween(d.from, d.to) + 1); }
function activeIn(p: ReportPatient, d: ReportData) { return p.status === "active" && p.created_on <= d.to; }

/** Therapietrouw: gedane trainingen t.o.v. voorgeschreven, over de periode. */
export function adherence(p: ReportPatient, d: ReportData): number | null {
  if (!p.prescribed_per_week) return null;
  const weeks = Math.max(1, Math.min(periodDays(d), daysBetween(p.created_on > d.from ? p.created_on : d.from, d.to) + 1) / 7);
  return Math.min(150, (p.sessions / (p.prescribed_per_week * weeks)) * 100);
}

function headline(t: ReportTest, pt: { v: number | null; l: number | null; r: number | null }): number | null {
  if (!t.bilateral) return pt.v;
  if (t.involved_side === "left") return pt.l;
  if (t.involved_side === "right") return pt.r;
  const xs = [pt.l, pt.r].filter((x): x is number => x !== null);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}
function lsiOf(t: ReportTest, pt: { l: number | null; r: number | null }): number | null {
  if (!t.bilateral || !t.involved_side || pt.l === null || pt.r === null) return null;
  const inv = t.involved_side === "left" ? pt.l : pt.r;
  const hea = t.involved_side === "left" ? pt.r : pt.l;
  if (!hea || !inv) return null;
  return t.higher_is_better ? (inv / hea) * 100 : (hea / inv) * 100;
}

function countBy<T>(rows: T[], key: (r: T) => string): { label: string; n: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  return [...m.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
}

function barFromCounts(rows: { label: string; n: number }[], name: string): ReportChart {
  return { kind: "bar", labels: rows.map((r) => r.label), series: [{ name, values: rows.map((r) => r.n) }] };
}

// ─── Rapporten ──────────────────────────────────────────────────────────────

export const REPORTS: ReportDefinition[] = [
  // Herstel
  {
    id: "pijn-tijd", name: "Pijn in de loop van de tijd", category: "herstel",
    description: "Gemiddelde pijnscore uit de check-ins, per dag of week.",
    build: (d) => {
      const b = bucket(d.daily);
      const all = weightedAvg(d.daily, "avg_pain");
      return {
        kpis: [{ label: "Gemiddelde pijn", value: all === null ? "—" : `${nf(all)} / 10` }],
        chart: { kind: "line", labels: b.map((x) => x.label), series: [{ name: "Pijn", values: b.map((x) => weightedAvg(x.days, "avg_pain")) }], unit: "/10" },
        table: { columns: [{ key: "p", label: "Periode" }, { key: "pijn", label: "Gem. pijn", align: "right" }, { key: "n", label: "Check-ins", align: "right" }],
          rows: b.map((x) => ({ p: x.label, pijn: weightedAvg(x.days, "avg_pain"), n: sum(x.days, "checkins") })) },
      };
    },
  },
  {
    id: "pijnverbetering", name: "Pijnverbetering per patiënt", category: "herstel",
    description: "Pijn bij de eerste check-in vergeleken met de meest recente.",
    build: (d) => {
      const rows = d.patients.filter((p) => p.pain_first !== null && p.pain_last !== null)
        .map((p) => ({ naam: p.name, plan: p.plan ?? "—", start: p.pain_first, nu: p.pain_last, verschil: (p.pain_last as number) - (p.pain_first as number) }))
        .sort((a, b) => a.verschil - b.verschil);
      const improved = rows.filter((r) => r.verschil < 0).length;
      const meanDelta = avg(rows.map((r) => r.verschil));
      return {
        kpis: [
          { label: "Gem. verandering", value: meanDelta === null ? "—" : `${meanDelta > 0 ? "+" : ""}${nf(meanDelta)} punt`, hint: "Negatief is minder pijn" },
          { label: "Minder pijn", value: rows.length ? pct((improved / rows.length) * 100) : "—", hint: `${improved} van ${rows.length} patiënten` },
        ],
        chart: null,
        table: { columns: [{ key: "naam", label: "Patiënt" }, { key: "plan", label: "Herstelplan" }, { key: "start", label: "Start", align: "right" }, { key: "nu", label: "Nu", align: "right" }, { key: "verschil", label: "Verschil", align: "right" }], rows },
      };
    },
  },
  {
    id: "pijn-per-plan", name: "Pijnverbetering per herstelplan", category: "herstel",
    description: "Gemiddelde pijn bij start en nu, per herstelplan.",
    build: (d) => {
      const groups = new Map<string, ReportPatient[]>();
      for (const p of d.patients) if (p.plan && p.pain_first !== null && p.pain_last !== null) groups.set(p.plan, [...(groups.get(p.plan) ?? []), p]);
      const rows = [...groups.entries()].map(([plan, ps]) => {
        const s = avg(ps.map((p) => p.pain_first as number))!, n = avg(ps.map((p) => p.pain_last as number))!;
        return { plan, patienten: ps.length, start: Math.round(s * 10) / 10, nu: Math.round(n * 10) / 10, verschil: Math.round((n - s) * 10) / 10 };
      }).sort((a, b) => a.verschil - b.verschil);
      return {
        kpis: [],
        chart: { kind: "bar", labels: rows.map((r) => r.plan), series: [{ name: "Start", values: rows.map((r) => r.start) }, { name: "Nu", values: rows.map((r) => r.nu) }], unit: "/10" },
        table: { columns: [{ key: "plan", label: "Herstelplan" }, { key: "patienten", label: "Patiënten", align: "right" }, { key: "start", label: "Pijn start", align: "right" }, { key: "nu", label: "Pijn nu", align: "right" }, { key: "verschil", label: "Verschil", align: "right" }], rows },
      };
    },
  },
  {
    id: "uitkomst", name: "Uitkomst bij afsluiting", category: "herstel",
    description: "Hoe behandelingen in deze periode zijn afgesloten.",
    build: (d) => {
      const done = d.patients.filter((p) => p.discharged_on && p.discharged_on >= d.from && p.discharged_on <= d.to);
      const rows = countBy(done, (p) => DISCHARGE_OUTCOME_LABELS[p.discharge_outcome as DischargeOutcome] ?? "Niet opgegeven");
      const full = done.filter((p) => p.discharge_outcome === "fully_recovered").length;
      return {
        kpis: [{ label: "Afgesloten", value: String(done.length) }, { label: "Volledig hersteld", value: done.length ? pct((full / done.length) * 100) : "—" }],
        chart: barFromCounts(rows, "Behandelingen"),
        table: { columns: [{ key: "label", label: "Uitkomst" }, { key: "n", label: "Aantal", align: "right" }], rows },
      };
    },
  },
  {
    id: "behandelduur", name: "Behandelduur per blessure", category: "herstel",
    description: "Gemiddeld aantal weken van start tot afsluiting, per blessuretype.",
    build: (d) => {
      const done = d.patients.filter((p) => p.discharged_on);
      const groups = new Map<string, number[]>();
      for (const p of done) groups.set(injuryLabel(p.injury_type), [...(groups.get(injuryLabel(p.injury_type)) ?? []), daysBetween(p.created_on, p.discharged_on!) / 7]);
      const rows = [...groups.entries()].map(([blessure, ws]) => ({ blessure, patienten: ws.length, weken: Math.round(avg(ws)! * 10) / 10 })).sort((a, b) => b.patienten - a.patienten);
      return {
        kpis: [{ label: "Gem. behandelduur", value: done.length ? `${nf(avg(done.map((p) => daysBetween(p.created_on, p.discharged_on!) / 7))!)} weken` : "—" }],
        chart: { kind: "bar", labels: rows.map((r) => r.blessure), series: [{ name: "Weken", values: rows.map((r) => r.weken) }], unit: " wk" },
        table: { columns: [{ key: "blessure", label: "Blessure" }, { key: "patienten", label: "Afgesloten", align: "right" }, { key: "weken", label: "Gem. weken", align: "right" }], rows },
        note: "Over alle afgesloten behandelingen, niet alleen deze periode.",
      };
    },
  },
  {
    id: "tijd-per-fase", name: "Tijd per fase", category: "herstel",
    description: "Hoe lang patiënten gemiddeld in elke fase van een herstelplan zitten.",
    build: (d) => {
      const groups = new Map<string, { plan: string; fase: string; sort: number; ds: number[] }>();
      for (const ph of d.phases) {
        if (!ph.completed_on) continue;
        const k = `${ph.plan}|${ph.sort_order}|${ph.phase}`;
        const g = groups.get(k) ?? { plan: ph.plan, fase: ph.phase, sort: ph.sort_order, ds: [] };
        g.ds.push(daysBetween(ph.started_on, ph.completed_on));
        groups.set(k, g);
      }
      const rows = [...groups.values()].sort((a, b) => a.plan.localeCompare(b.plan, "nl") || a.sort - b.sort)
        .map((g) => ({ plan: g.plan, fase: g.fase, patienten: g.ds.length, weken: Math.round((avg(g.ds)! / 7) * 10) / 10 }));
      return {
        kpis: [],
        chart: null,
        table: { columns: [{ key: "plan", label: "Herstelplan" }, { key: "fase", label: "Fase" }, { key: "patienten", label: "Afgerond door", align: "right" }, { key: "weken", label: "Gem. weken", align: "right" }], rows },
        note: "Alleen afgeronde fases.",
      };
    },
  },
  {
    id: "testresultaten", name: "Testresultaten", category: "herstel",
    description: "Vooruitgang per test: eerste meting vergeleken met de laatste.",
    build: (d) => {
      const groups = new Map<string, ReportTest[]>();
      for (const t of d.tests) groups.set(t.name, [...(groups.get(t.name) ?? []), t]);
      const rows = [...groups.entries()].map(([naam, ts]) => {
        const repeat = ts.filter((t) => t.results >= 2);
        const changes = repeat.map((t) => { const a = headline(t, t.first), b = headline(t, t.last); return a !== null && b !== null ? (t.higher_is_better ? b - a : a - b) : null; }).filter((x): x is number => x !== null);
        const lsis = ts.map((t) => lsiOf(t, t.last)).filter((x): x is number => x !== null);
        return {
          test: naam, eenheid: ts[0].unit, patienten: ts.length,
          vooruit: repeat.length ? pct((changes.filter((c) => c > 0).length / repeat.length) * 100) : "—",
          verbetering: changes.length ? Math.round(avg(changes)! * 10) / 10 : null,
          symmetrie: lsis.length ? pct((lsis.filter((x) => x >= 90).length / lsis.length) * 100) : "—",
        };
      }).sort((a, b) => b.patienten - a.patienten);
      return {
        kpis: [{ label: "Testen afgenomen", value: String(d.tests.length) }],
        chart: null,
        table: { columns: [{ key: "test", label: "Test" }, { key: "patienten", label: "Patiënten", align: "right" }, { key: "vooruit", label: "Vooruitgegaan", align: "right" }, { key: "verbetering", label: "Gem. verbetering", align: "right" }, { key: "eenheid", label: "Eenheid" }, { key: "symmetrie", label: "Symmetrie ≥ 90%", align: "right" }], rows },
        note: "Verbetering is in de richting van 'beter' (bij tijd of vragenlijsten waar lager beter is, telt een daling als verbetering).",
      };
    },
  },

  // Betrokkenheid
  {
    id: "checkins-tijd", name: "Check-ins in de loop van de tijd", category: "betrokkenheid",
    description: "Aantal check-ins en de gemiddelde dagscore.",
    build: (d) => {
      const b = bucket(d.daily);
      const total = sum(d.daily, "checkins");
      return {
        kpis: [{ label: "Check-ins", value: String(total) }, { label: "Gem. dagscore", value: weightedAvg(d.daily, "avg_day") === null ? "—" : `${nf(weightedAvg(d.daily, "avg_day")!)} / 5` }],
        chart: { kind: "line", labels: b.map((x) => x.label), series: [{ name: "Check-ins", values: b.map((x) => sum(x.days, "checkins")) }] },
        table: { columns: [{ key: "p", label: "Periode" }, { key: "n", label: "Check-ins", align: "right" }, { key: "dag", label: "Gem. dagscore", align: "right" }],
          rows: b.map((x) => ({ p: x.label, n: sum(x.days, "checkins"), dag: weightedAvg(x.days, "avg_day") })) },
      };
    },
  },
  {
    id: "trainingen-tijd", name: "Trainingen in de loop van de tijd", category: "betrokkenheid",
    description: "Gelogde trainingen uit de herstelplannen.",
    build: (d) => {
      const b = bucket(d.daily);
      return {
        kpis: [{ label: "Trainingen", value: String(sum(d.daily, "sessions")) }],
        chart: { kind: "line", labels: b.map((x) => x.label), series: [{ name: "Trainingen", values: b.map((x) => sum(x.days, "sessions")) }] },
        table: { columns: [{ key: "p", label: "Periode" }, { key: "n", label: "Trainingen", align: "right" }], rows: b.map((x) => ({ p: x.label, n: sum(x.days, "sessions") })) },
      };
    },
  },
  {
    id: "therapietrouw", name: "Therapietrouw per patiënt", category: "betrokkenheid",
    description: "Gedane trainingen ten opzichte van het voorgeschreven aantal.",
    build: (d) => {
      const rows = d.patients.filter((p) => activeIn(p, d) && p.prescribed_per_week > 0)
        .map((p) => ({ naam: p.name, plan: p.plan ?? "—", gedaan: p.sessions, perweek: p.prescribed_per_week, trouw: Math.round(adherence(p, d) ?? 0) }))
        .sort((a, b) => a.trouw - b.trouw);
      const mean = avg(rows.map((r) => Math.min(100, r.trouw)));
      return {
        kpis: [
          { label: "Gem. therapietrouw", value: mean === null ? "—" : pct(mean) },
          { label: "Onder 50%", value: String(rows.filter((r) => r.trouw < 50).length), hint: "patiënten" },
        ],
        chart: null,
        table: { columns: [{ key: "naam", label: "Patiënt" }, { key: "plan", label: "Herstelplan" }, { key: "gedaan", label: "Trainingen", align: "right" }, { key: "perweek", label: "Voorgeschreven / week", align: "right" }, { key: "trouw", label: "Therapietrouw %", align: "right" }], rows },
      };
    },
  },
  {
    id: "actief-inactief", name: "Actieve en stille patiënten", category: "betrokkenheid",
    description: "Wie de afgelopen 14 dagen een check-in deed, en wie stil is gevallen.",
    build: (d) => {
      const act = d.patients.filter((p) => activeIn(p, d));
      const isActive = (p: ReportPatient) => !!p.last_checkin && daysBetween(p.last_checkin, d.to) <= 14;
      const quiet = act.filter((p) => !isActive(p)).map((p) => ({
        naam: p.name, behandelaar: p.therapist ?? "—", laatste: p.last_checkin ?? "Nooit",
        dagen: p.last_checkin ? daysBetween(p.last_checkin, d.to) : null, account: p.has_account ? "Ja" : "Nee",
      })).sort((a, b) => (b.dagen ?? 9999) - (a.dagen ?? 9999));
      return {
        kpis: [
          { label: "Actief (14 dagen)", value: act.length ? pct(((act.length - quiet.length) / act.length) * 100) : "—", hint: `${act.length - quiet.length} van ${act.length}` },
          { label: "Stil gevallen", value: String(quiet.length) },
        ],
        chart: null,
        table: { columns: [{ key: "naam", label: "Patiënt" }, { key: "behandelaar", label: "Behandelaar" }, { key: "laatste", label: "Laatste check-in" }, { key: "dagen", label: "Dagen stil", align: "right" }, { key: "account", label: "App-account" }], rows: quiet },
      };
    },
  },
  {
    id: "activatie", name: "Van uitnodiging tot eerste check-in", category: "betrokkenheid",
    description: "Hoeveel patiënten de app echt gaan gebruiken.",
    build: (d) => {
      const ps = d.patients.filter((p) => p.created_on >= d.from && p.created_on <= d.to);
      const steps = [
        { label: "Nieuwe patiënten", n: ps.length },
        { label: "Uitgenodigd", n: ps.filter((p) => p.invited_on || p.has_account).length },
        { label: "Account aangemaakt", n: ps.filter((p) => p.has_account).length },
        { label: "Eerste check-in", n: ps.filter((p) => p.first_checkin).length },
      ];
      const rate = ps.length ? (steps[3].n / ps.length) * 100 : null;
      const lag = avg(ps.filter((p) => p.first_checkin).map((p) => daysBetween(p.created_on, p.first_checkin!)));
      return {
        kpis: [{ label: "Activatie", value: rate === null ? "—" : pct(rate), hint: "nieuw → eerste check-in" }, { label: "Tijd tot eerste check-in", value: lag === null ? "—" : `${nf(lag)} dagen` }],
        chart: barFromCounts(steps, "Patiënten"),
        table: { columns: [{ key: "label", label: "Stap" }, { key: "n", label: "Patiënten", align: "right" }], rows: steps },
        note: "Over patiënten die in deze periode zijn toegevoegd.",
      };
    },
  },

  // Praktijk
  {
    id: "nieuwe-patienten", name: "Nieuwe en afgesloten patiënten", category: "praktijk",
    description: "Instroom en uitstroom in de loop van de tijd.",
    build: (d) => {
      const b = bucket(d.daily);
      return {
        kpis: [{ label: "Nieuw", value: String(sum(d.daily, "new_patients")) }, { label: "Afgesloten", value: String(sum(d.daily, "discharged")) }],
        chart: { kind: "bar", vertical: true, labels: b.map((x) => x.label), series: [{ name: "Nieuw", values: b.map((x) => sum(x.days, "new_patients")) }, { name: "Afgesloten", values: b.map((x) => sum(x.days, "discharged")) }] },
        table: { columns: [{ key: "p", label: "Periode" }, { key: "nieuw", label: "Nieuw", align: "right" }, { key: "af", label: "Afgesloten", align: "right" }],
          rows: b.map((x) => ({ p: x.label, nieuw: sum(x.days, "new_patients"), af: sum(x.days, "discharged") })) },
      };
    },
  },
  {
    id: "per-blessure", name: "Patiënten per blessuretype", category: "praktijk",
    description: "Waar de actieve patiënten voor behandeld worden.",
    build: (d) => {
      const rows = countBy(d.patients.filter((p) => activeIn(p, d)), (p) => injuryLabel(p.injury_type));
      return { kpis: [], chart: barFromCounts(rows.slice(0, 12), "Patiënten"), table: { columns: [{ key: "label", label: "Blessure" }, { key: "n", label: "Actieve patiënten", align: "right" }], rows } };
    },
  },
  {
    id: "per-herstelplan", name: "Gebruik van herstelplannen", category: "praktijk",
    description: "Welke herstelplannen het meest worden ingezet.",
    build: (d) => {
      const rows = countBy(d.patients.filter((p) => activeIn(p, d)), (p) => p.plan ?? "Nog geen herstelplan");
      return { kpis: [], chart: barFromCounts(rows.slice(0, 12), "Patiënten"), table: { columns: [{ key: "label", label: "Herstelplan" }, { key: "n", label: "Actieve patiënten", align: "right" }], rows } };
    },
  },
  {
    id: "per-locatie", name: "Patiënten per locatie", category: "praktijk",
    description: "Verdeling van actieve patiënten over de locaties.",
    build: (d) => {
      const rows = countBy(d.patients.filter((p) => activeIn(p, d)), (p) => p.location ?? "Geen locatie");
      return { kpis: [], chart: barFromCounts(rows, "Patiënten"), table: { columns: [{ key: "label", label: "Locatie" }, { key: "n", label: "Actieve patiënten", align: "right" }], rows } };
    },
  },

  // Team
  {
    id: "per-behandelaar", name: "Overzicht per behandelaar", category: "team", ownerOnly: true,
    description: "Patiënten, betrokkenheid en aandachtspunten per behandelaar.",
    build: (d) => {
      const groups = new Map<string, ReportPatient[]>();
      for (const p of d.patients.filter((x) => activeIn(x, d))) groups.set(p.therapist ?? "Niet toegewezen", [...(groups.get(p.therapist ?? "Niet toegewezen") ?? []), p]);
      const rows = [...groups.entries()].map(([naam, ps]) => {
        const trouw = avg(ps.map((p) => adherence(p, d)).filter((x): x is number => x !== null).map((x) => Math.min(100, x)));
        return {
          naam, patienten: ps.length,
          checkins: ps.reduce((s, p) => s + p.checkins, 0),
          trouw: trouw === null ? "—" : pct(trouw),
          aandacht: ps.filter((p) => (p.pain_last ?? 0) >= 7 || !p.last_checkin || daysBetween(p.last_checkin, d.to) > 14).length,
        };
      }).sort((a, b) => b.patienten - a.patienten);
      return {
        kpis: [],
        chart: { kind: "bar", labels: rows.map((r) => r.naam), series: [{ name: "Actieve patiënten", values: rows.map((r) => r.patienten) }] },
        table: { columns: [{ key: "naam", label: "Behandelaar" }, { key: "patienten", label: "Actieve patiënten", align: "right" }, { key: "checkins", label: "Check-ins", align: "right" }, { key: "trouw", label: "Gem. therapietrouw", align: "right" }, { key: "aandacht", label: "Aandacht nodig", align: "right" }], rows },
        note: "Aandacht nodig: pijn 7 of hoger, of langer dan 14 dagen geen check-in.",
      };
    },
  },
];

export function getReport(id: string): ReportDefinition | undefined {
  return REPORTS.find((r) => r.id === id);
}

// ─── KPI's voor het overzicht (met vergelijking) ───────────────────────────

export interface OverviewKpi { label: string; value: number | null; prev: number | null; format: "int" | "pct" | "score10" | "score5"; betterWhen: "up" | "down"; reportId: string }

export function overviewKpis(cur: ReportData, prev: ReportData | null): OverviewKpi[] {
  const k = (d: ReportData | null) => {
    if (!d) return null;
    const act = d.patients.filter((p) => activeIn(p, d));
    const tr = act.map((p) => adherence(p, d)).filter((x): x is number => x !== null).map((x) => Math.min(100, x));
    const recent = act.filter((p) => p.last_checkin && daysBetween(p.last_checkin, d.to) <= 14).length;
    return {
      active: act.length,
      nieuw: sum(d.daily, "new_patients"),
      checkins: sum(d.daily, "checkins"),
      sessions: sum(d.daily, "sessions"),
      trouw: avg(tr),
      pijn: weightedAvg(d.daily, "avg_pain"),
      afgesloten: sum(d.daily, "discharged"),
      betrokken: act.length ? (recent / act.length) * 100 : null,
    };
  };
  const c = k(cur)!, p = k(prev);
  return [
    { label: "Actieve patiënten", value: c.active, prev: p?.active ?? null, format: "int", betterWhen: "up", reportId: "per-blessure" },
    { label: "Nieuwe patiënten", value: c.nieuw, prev: p?.nieuw ?? null, format: "int", betterWhen: "up", reportId: "nieuwe-patienten" },
    { label: "Check-ins", value: c.checkins, prev: p?.checkins ?? null, format: "int", betterWhen: "up", reportId: "checkins-tijd" },
    { label: "Trainingen", value: c.sessions, prev: p?.sessions ?? null, format: "int", betterWhen: "up", reportId: "trainingen-tijd" },
    { label: "Therapietrouw", value: c.trouw, prev: p?.trouw ?? null, format: "pct", betterWhen: "up", reportId: "therapietrouw" },
    { label: "Gem. pijn", value: c.pijn, prev: p?.pijn ?? null, format: "score10", betterWhen: "down", reportId: "pijn-tijd" },
    { label: "Actief in de app", value: c.betrokken, prev: p?.betrokken ?? null, format: "pct", betterWhen: "up", reportId: "actief-inactief" },
    { label: "Afgesloten behandelingen", value: c.afgesloten, prev: p?.afgesloten ?? null, format: "int", betterWhen: "up", reportId: "uitkomst" },
  ];
}

export function formatKpi(v: number | null, f: OverviewKpi["format"]): string {
  if (v === null) return "—";
  if (f === "pct") return pct(v);
  if (f === "score10") return `${nf(v)} / 10`;
  if (f === "score5") return `${nf(v)} / 5`;
  return v.toLocaleString("nl-NL");
}

/** Reeksen voor de grafieken op het overzicht. */
export function overviewSeries(d: ReportData) {
  const b = bucket(d.daily);
  return {
    labels: b.map((x) => x.label),
    checkins: b.map((x) => sum(x.days, "checkins")),
    sessions: b.map((x) => sum(x.days, "sessions")),
    pain: b.map((x) => weightedAvg(x.days, "avg_pain")),
  };
}

/** CSV (puntkomma's, voor Nederlandse Excel) van een rapporttabel. */
export function tableToCsv(t: ReportTable): string {
  const esc = (v: ReportCell) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "number" ? v.toLocaleString("nl-NL", { useGrouping: false, maximumFractionDigits: 2 }) : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [t.columns.map((c) => esc(c.label)).join(";"), ...t.rows.map((r) => t.columns.map((c) => esc(r[c.key] ?? null)).join(";"))].join("\n");
}
