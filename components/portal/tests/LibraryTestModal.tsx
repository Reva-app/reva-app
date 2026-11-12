"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import {
  TEST_CATEGORY_LABELS, TEST_CATEGORY_ORDER, TEST_REGION_LABELS, TEST_UNITS,
  type LibraryTest, type LibraryTestInput, type TestCategory,
} from "@/lib/services/testService";

/** Eigen test van de praktijk aanmaken of bewerken (ook: een REVA-test als basis kopiëren). */
export function LibraryTestModal({ initial, title, onClose, onSave }: {
  initial: LibraryTest | null;
  title: string;
  onClose: () => void;
  onSave: (input: LibraryTestInput) => Promise<string | null>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<TestCategory>(initial?.category ?? "functie");
  const [unit, setUnit] = useState(initial?.unit ?? "cm");
  const [higherIsBetter, setHigherIsBetter] = useState(initial?.higherIsBetter ?? true);
  const [bilateral, setBilateral] = useState(initial?.bilateral ?? false);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [regions, setRegions] = useState<string[]>(initial?.bodyRegions ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!name.trim()) { setError("Geef de test een naam"); return; }
    setSaving(true);
    setError("");
    const err = await onSave({ name, category, unit, higherIsBetter, bilateral, description, instructions, bodyRegions: regions });
    setSaving(false);
    if (err) setError(err);
  }

  const units = TEST_UNITS.includes(unit) ? TEST_UNITS : [unit, ...TEST_UNITS];

  return (
    <Modal onClose={onClose} maxWidth="max-w-xl" dismissOnBackdropClick={false}>
      <Card padding="none">
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <CardHeader title={title} subtitle="Deze test is te kiezen bij elke patiënt van de praktijk." />
            <button type="button" onClick={onClose} aria-label="Sluiten" className="relative tap-target text-subtle hover:text-gray-600 shrink-0 -mt-1"><X size={18} /></button>
          </div>
          <Field label="Naam"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. 5 km tijdrit op de loopband" /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Soort">
              <Select value={category} onChange={(e) => setCategory(e.target.value as TestCategory)}>
                {TEST_CATEGORY_ORDER.map((c) => <option key={c} value={c}>{TEST_CATEGORY_LABELS[c]}</option>)}
              </Select>
            </Field>
            <Field label="Eenheid">
              <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
                {units.map((u) => <option key={u} value={u}>{u}</option>)}
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
            Links en rechts apart meten (dan berekent REVA de symmetrie)
          </label>
          <Field label="Passend bij" hint="Deze testen staan bovenaan bij patiënten met klachten in dit gebied.">
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(TEST_REGION_LABELS).map(([key, label]) => {
                const on = regions.includes(key);
                return (
                  <button key={key} type="button" onClick={() => setRegions((cur) => (on ? cur.filter((r) => r !== key) : [...cur, key]))}
                    className="rounded-full px-3 py-1.5 text-xs font-medium border"
                    style={on ? { background: "var(--brand-accent, #e8632a)", borderColor: "var(--brand-accent, #e8632a)", color: "#fff" } : { background: "#fff", borderColor: "#e8e5df", color: "#4b5563" }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Korte omschrijving" optional><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Wat meet deze test?" /></Field>
          <Field label="Instructie" optional>
            <Textarea rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Hoe voer je de test uit, zodat elke meting hetzelfde gaat" />
          </Field>
          {error && <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Annuleren</Button>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? "Opslaan…" : "Opslaan"}</Button>
          </div>
        </div>
      </Card>
    </Modal>
  );
}
