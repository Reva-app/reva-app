"use client";

import { useMemo, useState } from "react";
import { X, Search, Plus, ChevronLeft, Check, ArrowLeftRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import {
  TEST_CATEGORY_LABELS, TEST_CATEGORY_ORDER, TEST_REGION_LABELS, TEST_UNITS,
  addPatientTest, saveTestToLibrary,
  type LibraryTest, type PatientTestInput, type TestCategory,
} from "@/lib/services/testService";

/** Lichaamsregio van een blessuretype (BLESSURE_TYPEN), om passende testen bovenaan te zetten. */
const REGION_BY_INJURY: Record<string, string> = {
  acl: "knie", meniscus: "knie", knieband: "knie", patella: "knie", knieprothese: "knie", lopersknie: "knie", knieartrose: "knie",
  heupprothese: "heup", heupartrose: "heup", lies: "heup", hamstring: "heup",
  enkel: "onderbeen", achilles: "onderbeen", hielspoor: "onderbeen", kuitblessure: "onderbeen", scheenbeenvliesklachten: "onderbeen",
  schouder: "schouder", schouderluxatie: "schouder", elleboogklachten: "schouder", bevroren_schouder: "schouder",
  rug: "rug", nekklachten: "rug",
};

type Filter = "passend" | "alle" | TestCategory;

const chipStyle = (active: boolean) => active
  ? { background: "var(--brand-accent, #e8632a)", borderColor: "var(--brand-accent, #e8632a)", color: "#ffffff" }
  : { background: "#ffffff", borderColor: "#e8e5df", color: "#4b5563" };

export function AddTestModal({ patientId, organizationId, injuryType, library, phases, canSaveToLibrary, onClose, onAdded }: {
  patientId: string;
  organizationId: string;
  injuryType: string | null;
  library: LibraryTest[];
  phases: { id: string; name: string; status: string }[];
  canSaveToLibrary: boolean;
  onClose: () => void;
  /** Na toevoegen; met het id van de nieuwe test (om meteen te meten). */
  onAdded: (testId: string, name: string) => void;
}) {
  const region = injuryType ? REGION_BY_INJURY[injuryType] ?? null : null;
  const [filter, setFilter] = useState<Filter>(region ? "passend" : "alle");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<LibraryTest | "custom" | null>(null);

  // Instellingen
  const activePhase = phases.find((p) => p.status === "active") ?? null;
  const [name, setName] = useState("");
  const [category, setCategory] = useState<TestCategory>("functie");
  const [unit, setUnit] = useState("cm");
  const [higherIsBetter, setHigherIsBetter] = useState(true);
  const [bilateral, setBilateral] = useState(false);
  const [involvedSide, setInvolvedSide] = useState<"left" | "right" | "">("");
  const [phaseId, setPhaseId] = useState<string>(activePhase?.id ?? "");
  const [target, setTarget] = useState("");
  const [instructions, setInstructions] = useState("");
  const [toLibrary, setToLibrary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return library.filter((t) => {
      if (filter === "passend" && region && !t.bodyRegions.includes(region) && !t.bodyRegions.includes("algemeen")) return false;
      if (filter !== "passend" && filter !== "alle" && t.category !== filter) return false;
      return !q || `${t.name} ${t.description ?? ""} ${TEST_CATEGORY_LABELS[t.category]}`.toLowerCase().includes(q);
    });
  }, [library, filter, query, region]);

  const grouped = TEST_CATEGORY_ORDER.map((c) => ({ c, items: list.filter((t) => t.category === c) })).filter((g) => g.items.length);

  function pick(t: LibraryTest | "custom") {
    setPicked(t);
    if (t === "custom") {
      setName(""); setCategory("functie"); setUnit("cm"); setHigherIsBetter(true); setBilateral(false); setInstructions("");
    } else {
      setName(t.name); setCategory(t.category); setUnit(t.unit); setHigherIsBetter(t.higherIsBetter); setBilateral(t.bilateral); setInstructions(t.instructions ?? "");
    }
  }

  async function save() {
    if (!name.trim()) { setError("Geef de test een naam"); return; }
    const targetNum = target.trim() === "" ? null : Number(target.replace(",", "."));
    if (targetNum !== null && Number.isNaN(targetNum)) { setError("De streefwaarde moet een getal zijn"); return; }
    setSaving(true);
    setError("");
    const input: PatientTestInput = {
      libraryTestId: picked && picked !== "custom" ? picked.id : null,
      name, category, unit, higherIsBetter, bilateral,
      involvedSide: involvedSide || null,
      instructions: instructions || null,
      phaseId: phaseId || null,
      targetValue: targetNum,
    };
    const res = await addPatientTest(patientId, input);
    if (res.error || !res.id) { setSaving(false); setError(res.error ?? "Toevoegen is niet gelukt."); return; }
    if (picked === "custom" && toLibrary && canSaveToLibrary) await saveTestToLibrary(organizationId, input);
    setSaving(false);
    onAdded(res.id, name.trim());
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-2xl" dismissOnBackdropClick={false}>
      <Card padding="none">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <CardHeader
              title={picked ? (picked === "custom" ? "Eigen test" : picked.name) : "Test toevoegen"}
              subtitle={picked ? "Stel de test in voor deze patiënt" : "Kies een gevalideerde test of maak een eigen test. Herhaal hem later om de voortgang objectief te zien."}
            />
            <button type="button" onClick={onClose} aria-label="Sluiten" className="relative tap-target text-subtle hover:text-gray-600 shrink-0 -mt-1"><X size={18} /></button>
          </div>

          {!picked ? (
            <div className="space-y-3 mt-1">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Zoek, bijv. hop, kracht of KOOS" style={{ paddingLeft: 40 }} aria-label="Zoek een test" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {region && (
                  <button type="button" onClick={() => setFilter("passend")} className="rounded-full px-3 py-1.5 text-xs font-medium border" style={chipStyle(filter === "passend")}>
                    Passend bij {TEST_REGION_LABELS[region]?.toLowerCase() ?? region}
                  </button>
                )}
                <button type="button" onClick={() => setFilter("alle")} className="rounded-full px-3 py-1.5 text-xs font-medium border" style={chipStyle(filter === "alle")}>Alle</button>
                {TEST_CATEGORY_ORDER.map((c) => (
                  <button key={c} type="button" onClick={() => setFilter(c)} className="rounded-full px-3 py-1.5 text-xs font-medium border" style={chipStyle(filter === c)}>{TEST_CATEGORY_LABELS[c]}</button>
                ))}
              </div>
              <div className="rounded-xl border bg-white max-h-[46vh] overflow-y-auto" style={{ borderColor: "#e8e5df" }}>
                <button type="button" onClick={() => pick("custom")} className="w-full flex items-center gap-3 px-3.5 py-3 text-left border-b hover:bg-gray-50" style={{ borderColor: "#f0ede8" }}>
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--brand-accent-soft, #fdefea)" }}><Plus size={14} style={{ color: "var(--brand-accent, #e8632a)" }} /></span>
                  <span>
                    <span className="block text-sm font-medium text-gray-900">Eigen test maken</span>
                    <span className="block text-xs text-gray-500">Bijv. een sportspecifieke test of een loopbandprotocol van je praktijk</span>
                  </span>
                </button>
                {grouped.length === 0 ? (
                  <p className="text-sm text-gray-500 p-4">Geen test gevonden. Probeer een ander woord of maak een eigen test.</p>
                ) : grouped.map((g) => (
                  <div key={g.c}>
                    <p className="sticky top-0 z-[1] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 border-b" style={{ background: "#faf9f7", borderColor: "#f0ede8" }}>{TEST_CATEGORY_LABELS[g.c]}</p>
                    {g.items.map((t) => (
                      <button key={t.id} type="button" onClick={() => pick(t)} className="w-full flex items-start gap-3 px-3.5 py-2.5 text-left border-b last:border-b-0 hover:bg-gray-50" style={{ borderColor: "#f0ede8" }}>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-gray-900">{t.name}</span>
                          {t.description && <span className="block text-xs text-gray-500 mt-0.5">{t.description}</span>}
                        </span>
                        <span className="shrink-0 flex items-center gap-1.5 mt-0.5">
                          {t.bilateral && <span title="Links en rechts" className="text-[11px] rounded-full px-1.5 py-0.5 bg-gray-100 text-gray-600 inline-flex items-center gap-0.5"><ArrowLeftRight size={10} /> L/R</span>}
                          <span className="text-[11px] rounded-full px-1.5 py-0.5 bg-gray-100 text-gray-600">{t.unit}</span>
                          {t.scope === "organization" && <span className="text-[11px] rounded-full px-1.5 py-0.5" style={{ background: "var(--brand-accent-soft, #fdefea)", color: "var(--brand-accent-ink, #8a3a17)" }}>Praktijk</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-1">
              {picked === "custom" && (
                <>
                  <Field label="Naam van de test"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. 5 km tijdrit op de loopband" /></Field>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Soort">
                      <Select value={category} onChange={(e) => setCategory(e.target.value as TestCategory)}>
                        {TEST_CATEGORY_ORDER.map((c) => <option key={c} value={c}>{TEST_CATEGORY_LABELS[c]}</option>)}
                      </Select>
                    </Field>
                    <Field label="Eenheid">
                      <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
                        {TEST_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </Select>
                    </Field>
                    <Field label="Beter is">
                      <Select value={higherIsBetter ? "hoger" : "lager"} onChange={(e) => setHigherIsBetter(e.target.value === "hoger")}>
                        <option value="hoger">Hoger</option>
                        <option value="lager">Lager (bijv. tijd)</option>
                      </Select>
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={bilateral} onChange={(e) => setBilateral(e.target.checked)} className="rounded" />
                    Links en rechts apart meten
                  </label>
                </>
              )}

              {bilateral && (
                <Field label="Aangedane zijde" hint="Dan berekent REVA de symmetrie (LSI): de aangedane zijde als % van de gezonde zijde.">
                  <div className="flex gap-2">
                    {([["left", "Links"], ["right", "Rechts"], ["", "Niet van toepassing"]] as const).map(([v, l]) => (
                      <button key={l} type="button" onClick={() => setInvolvedSide(v)} className="rounded-xl border px-3.5 py-2 text-sm font-medium inline-flex items-center gap-1.5" style={chipStyle(involvedSide === v)}>
                        {involvedSide === v && <Check size={13} />} {l}
                      </button>
                    ))}
                  </div>
                </Field>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Hoort bij fase" optional>
                  <Select value={phaseId} onChange={(e) => setPhaseId(e.target.value)}>
                    <option value="">Geen specifieke fase</option>
                    {phases.map((p) => <option key={p.id} value={p.id}>{p.name}{p.status === "active" ? " (huidig)" : ""}</option>)}
                  </Select>
                </Field>
                <Field label={`Streefwaarde${unit ? ` (${unit})` : ""}`} optional>
                  <Input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={bilateral ? "Voor de aangedane zijde" : "Bijv. 120"} />
                </Field>
              </div>

              <Field label="Instructie" optional>
                <Textarea rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Hoe voer je de test uit, zodat elke meting hetzelfde gaat" />
              </Field>

              {picked === "custom" && canSaveToLibrary && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={toLibrary} onChange={(e) => setToLibrary(e.target.checked)} className="rounded" />
                  Ook bewaren in de testbibliotheek van de praktijk
                </label>
              )}

              {error && <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>}
              <div className="flex items-center justify-between gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setPicked(null)}><ChevronLeft size={14} /> Andere test</Button>
                <Button size="sm" onClick={save} disabled={saving}>{saving ? "Toevoegen…" : "Test toevoegen"}</Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </Modal>
  );
}
