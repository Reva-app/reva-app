/**
 * Testen: objectieve metingen per patiënt (migratie 145). Los van het
 * herstelplan; een fysio voegt een test toe wanneer dat zinvol is en legt
 * de resultaten in de tijd vast, optioneel gekoppeld aan een fase.
 */
import { createClient } from "@/lib/supabaseClient";

export type TestCategory = "kracht" | "mobiliteit" | "functie" | "balans" | "conditie" | "vragenlijst";

export const TEST_CATEGORY_LABELS: Record<TestCategory, string> = {
  kracht: "Kracht",
  mobiliteit: "Mobiliteit",
  functie: "Functie",
  balans: "Balans",
  conditie: "Conditie",
  vragenlijst: "Vragenlijst",
};

export const TEST_CATEGORY_ORDER: TestCategory[] = ["functie", "kracht", "mobiliteit", "balans", "conditie", "vragenlijst"];

export const TEST_REGION_LABELS: Record<string, string> = {
  knie: "Knie", heup: "Heup", onderbeen: "Enkel en voet", schouder: "Schouder en arm", rug: "Rug en nek", algemeen: "Algemeen",
};

/** Eenheden om uit te kiezen bij een eigen test. */
export const TEST_UNITS = ["cm", "m", "sec", "min", "graden", "kg", "herhalingen", "score", "%", "bpm", "trap", "km/u"];

export interface LibraryTest {
  id: string;
  scope: "reva" | "organization";
  name: string;
  category: TestCategory;
  unit: string;
  higherIsBetter: boolean;
  bilateral: boolean;
  description: string | null;
  instructions: string | null;
  bodyRegions: string[];
  archived: boolean;
}

export interface TestResult {
  id: string;
  measuredOn: string;
  value: number | null;
  valueLeft: number | null;
  valueRight: number | null;
  note: string | null;
}

export interface PatientTest {
  id: string;
  libraryTestId: string | null;
  phaseId: string | null;
  name: string;
  category: TestCategory;
  unit: string;
  higherIsBetter: boolean;
  bilateral: boolean;
  involvedSide: "left" | "right" | null;
  instructions: string | null;
  targetValue: number | null;
  note: string | null;
  createdAt: string;
  /** Oud → nieuw. */
  results: TestResult[];
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

function logErr(fn: string, error: { message?: string } | null) {
  console.error(`[${fn}] Supabase error — message: "${error?.message ?? "onbekend"}"`);
}

export async function loadTestLibrary(opts: { includeArchived?: boolean } = {}): Promise<LibraryTest[]> {
  const supabase = createClient();
  let q = supabase
    .from("test_library")
    .select("id, scope, name, category, unit, higher_is_better, bilateral, description, instructions, body_regions, archived")
    .order("name");
  if (!opts.includeArchived) q = q.eq("archived", false);
  const { data, error } = await q;
  if (error) { logErr("loadTestLibrary", error); return []; }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    scope: r.scope as "reva" | "organization",
    name: r.name as string,
    category: r.category as TestCategory,
    unit: r.unit as string,
    higherIsBetter: r.higher_is_better as boolean,
    bilateral: r.bilateral as boolean,
    description: r.description as string | null,
    instructions: r.instructions as string | null,
    bodyRegions: (r.body_regions as string[]) ?? [],
    archived: r.archived as boolean,
  }));
}

export interface LibraryTestInput {
  name: string;
  category: TestCategory;
  unit: string;
  higherIsBetter: boolean;
  bilateral: boolean;
  description: string;
  instructions: string;
  bodyRegions: string[];
}

function libraryRow(input: LibraryTestInput) {
  return {
    name: input.name.trim(),
    category: input.category,
    unit: input.unit.trim(),
    higher_is_better: input.higherIsBetter,
    bilateral: input.bilateral,
    description: input.description.trim() || null,
    instructions: input.instructions.trim() || null,
    body_regions: input.bodyRegions,
  };
}

export async function createLibraryTest(organizationId: string, input: LibraryTestInput): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("test_library").insert({ scope: "organization", organization_id: organizationId, ...libraryRow(input) });
  if (error) { logErr("createLibraryTest", error); return { error: "Opslaan van de test is niet gelukt." }; }
  return { error: null };
}

export async function updateLibraryTest(id: string, input: LibraryTestInput): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("test_library").update(libraryRow(input)).eq("id", id);
  if (error) { logErr("updateLibraryTest", error); return { error: "Bijwerken van de test is niet gelukt." }; }
  return { error: null };
}

export async function setLibraryTestArchived(id: string, archived: boolean): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("test_library").update({ archived }).eq("id", id);
  if (error) { logErr("setLibraryTestArchived", error); return { error: "Bijwerken van de test is niet gelukt." }; }
  return { error: null };
}

/** Verwijderen kan altijd: bij patiënten blijft de test (als kopie) gewoon bestaan. */
export async function deleteLibraryTest(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("test_library").delete().eq("id", id);
  if (error) { logErr("deleteLibraryTest", error); return { error: "Verwijderen van de test is niet gelukt." }; }
  return { error: null };
}

export async function loadPatientTests(patientId: string): Promise<PatientTest[]> {
  const supabase = createClient();
  const [testsRes, resultsRes] = await Promise.all([
    supabase.from("patient_tests").select("*").eq("patient_id", patientId).eq("archived", false).order("created_at"),
    supabase.from("patient_test_results").select("id, patient_test_id, measured_on, value, value_left, value_right, note").eq("patient_id", patientId).order("measured_on"),
  ]);
  if (testsRes.error) { logErr("loadPatientTests", testsRes.error); return []; }
  if (resultsRes.error) logErr("loadPatientTests(results)", resultsRes.error);
  const byTest = new Map<string, TestResult[]>();
  for (const r of resultsRes.data ?? []) {
    const list = byTest.get(r.patient_test_id as string) ?? [];
    list.push({
      id: r.id as string,
      measuredOn: r.measured_on as string,
      value: num(r.value),
      valueLeft: num(r.value_left),
      valueRight: num(r.value_right),
      note: r.note as string | null,
    });
    byTest.set(r.patient_test_id as string, list);
  }
  return (testsRes.data ?? []).map((t) => ({
    id: t.id as string,
    libraryTestId: t.library_test_id as string | null,
    phaseId: t.phase_id as string | null,
    name: t.name as string,
    category: t.category as TestCategory,
    unit: t.unit as string,
    higherIsBetter: t.higher_is_better as boolean,
    bilateral: t.bilateral as boolean,
    involvedSide: t.involved_side as "left" | "right" | null,
    instructions: t.instructions as string | null,
    targetValue: num(t.target_value),
    note: t.note as string | null,
    createdAt: t.created_at as string,
    results: byTest.get(t.id as string) ?? [],
  }));
}

export interface PatientTestInput {
  libraryTestId: string | null;
  name: string;
  category: TestCategory;
  unit: string;
  higherIsBetter: boolean;
  bilateral: boolean;
  involvedSide: "left" | "right" | null;
  instructions: string | null;
  phaseId: string | null;
  targetValue: number | null;
}

export async function addPatientTest(patientId: string, input: PatientTestInput): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.from("patient_tests").insert({
    patient_id: patientId,
    library_test_id: input.libraryTestId,
    name: input.name.trim(),
    category: input.category,
    unit: input.unit.trim(),
    higher_is_better: input.higherIsBetter,
    bilateral: input.bilateral,
    involved_side: input.bilateral ? input.involvedSide : null,
    instructions: input.instructions?.trim() || null,
    phase_id: input.phaseId,
    target_value: input.targetValue,
  }).select("id").single();
  if (error) { logErr("addPatientTest", error); return { id: null, error: "Toevoegen van de test is niet gelukt." }; }
  return { id: data.id as string, error: null };
}

/** Eigen test ook bewaren in de praktijkbibliotheek (alleen met beheerrechten op herstelplannen). */
export async function saveTestToLibrary(organizationId: string, input: PatientTestInput): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("test_library").insert({
    scope: "organization",
    organization_id: organizationId,
    name: input.name.trim(),
    category: input.category,
    unit: input.unit.trim(),
    higher_is_better: input.higherIsBetter,
    bilateral: input.bilateral,
    instructions: input.instructions?.trim() || null,
  });
  if (error) { logErr("saveTestToLibrary", error); return { error: "Opslaan in de bibliotheek is niet gelukt." }; }
  return { error: null };
}

export async function updatePatientTest(id: string, patch: Partial<{ phaseId: string | null; targetValue: number | null; involvedSide: "left" | "right" | null; archived: boolean }>): Promise<{ error: string | null }> {
  const supabase = createClient();
  const row: Record<string, unknown> = {};
  if ("phaseId" in patch) row.phase_id = patch.phaseId;
  if ("targetValue" in patch) row.target_value = patch.targetValue;
  if ("involvedSide" in patch) row.involved_side = patch.involvedSide;
  if ("archived" in patch) row.archived = patch.archived;
  const { error } = await supabase.from("patient_tests").update(row).eq("id", id);
  if (error) { logErr("updatePatientTest", error); return { error: "Bijwerken van de test is niet gelukt." }; }
  return { error: null };
}

export async function deletePatientTest(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("patient_tests").delete().eq("id", id);
  if (error) { logErr("deletePatientTest", error); return { error: "Verwijderen van de test is niet gelukt." }; }
  return { error: null };
}

export interface TestResultInput {
  measuredOn: string;
  value: number | null;
  valueLeft: number | null;
  valueRight: number | null;
  note: string;
}

export async function addTestResult(patientId: string, patientTestId: string, input: TestResultInput): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("patient_test_results").insert({
    patient_test_id: patientTestId,
    // Een trigger zet patient_id altijd gelijk aan die van de test.
    patient_id: patientId,
    measured_on: input.measuredOn,
    value: input.value,
    value_left: input.valueLeft,
    value_right: input.valueRight,
    note: input.note.trim() || null,
  });
  if (error) { logErr("addTestResult", error); return { error: "Opslaan van het resultaat is niet gelukt." }; }
  return { error: null };
}

export async function deleteTestResult(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("patient_test_results").delete().eq("id", id);
  if (error) { logErr("deleteTestResult", error); return { error: "Verwijderen van het resultaat is niet gelukt." }; }
  return { error: null };
}

// ─── Weergave ───────────────────────────────────────────────────────────────

export function formatTestValue(v: number | null, unit: string): string {
  if (v === null) return "—";
  const n = v.toLocaleString("nl-NL", { maximumFractionDigits: 1 });
  if (unit === "graden") return `${n}°`;
  if (unit === "%") return `${n}%`;
  if (unit === "trap") return `trap ${n}`;
  if (unit === "score" || unit === "herhalingen") return unit === "herhalingen" ? `${n}×` : n;
  return `${n} ${unit}`;
}

/** De waarde die telt voor de voortgang: bij links/rechts de aangedane zijde (of het gemiddelde). */
export function headlineValue(t: PatientTest, r: TestResult): number | null {
  if (!t.bilateral) return r.value;
  if (t.involvedSide === "left") return r.valueLeft;
  if (t.involvedSide === "right") return r.valueRight;
  const both = [r.valueLeft, r.valueRight].filter((x): x is number => x !== null);
  return both.length ? both.reduce((a, b) => a + b, 0) / both.length : null;
}

/** Limb Symmetry Index: aangedane zijde als % van de gezonde zijde. */
export function lsi(t: PatientTest, r: TestResult): number | null {
  if (!t.bilateral || !t.involvedSide || r.valueLeft === null || r.valueRight === null) return null;
  const involved = t.involvedSide === "left" ? r.valueLeft : r.valueRight;
  const healthy = t.involvedSide === "left" ? r.valueRight : r.valueLeft;
  if (!healthy) return null;
  const pct = (involved / healthy) * 100;
  return t.higherIsBetter ? pct : (healthy / involved) * 100;
}
