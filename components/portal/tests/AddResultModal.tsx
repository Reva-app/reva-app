"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { DatePicker } from "@/components/ui/DatePicker";
import { addTestResult, formatTestValue, type PatientTest } from "@/lib/services/testService";
import { formatDate } from "@/lib/data";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parse(v: string): number | null | "fout" {
  if (v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isNaN(n) ? "fout" : n;
}

/** Meting vastleggen: één waarde, of links en rechts apart. */
export function AddResultModal({ patientId, test, onClose, onSaved }: {
  patientId: string;
  test: PatientTest;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(todayStr());
  const [value, setValue] = useState("");
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const last = test.results[test.results.length - 1] ?? null;

  async function save() {
    const v = parse(value), l = parse(left), r = parse(right);
    if (v === "fout" || l === "fout" || r === "fout") { setError("Vul een getal in"); return; }
    if (test.bilateral ? l === null && r === null : v === null) { setError("Vul een resultaat in"); return; }
    setSaving(true);
    setError("");
    const res = await addTestResult(patientId, test.id, {
      measuredOn: date,
      value: test.bilateral ? null : v,
      valueLeft: test.bilateral ? l : null,
      valueRight: test.bilateral ? r : null,
      note,
    });
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    onSaved();
  }

  const unitHint = test.unit === "graden" ? "°" : test.unit;

  return (
    <Modal onClose={onClose} maxWidth="max-w-md" dismissOnBackdropClick={false}>
      <Card padding="none">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <CardHeader title="Meting vastleggen" subtitle={test.name} />
            <button type="button" onClick={onClose} aria-label="Sluiten" className="relative tap-target text-subtle hover:text-gray-600 shrink-0 -mt-1"><X size={18} /></button>
          </div>

          {test.instructions && <p className="text-xs text-gray-600 rounded-xl p-3 mb-4" style={{ background: "#f8f7f4" }}>{test.instructions}</p>}

          <div className="space-y-4">
            <Field label="Datum"><DatePicker value={date} onChange={setDate} /></Field>

            {test.bilateral ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Links (${unitHint})${test.involvedSide === "left" ? " · aangedaan" : ""}`}>
                  <Input inputMode="decimal" value={left} onChange={(e) => setLeft(e.target.value)} autoFocus />
                </Field>
                <Field label={`Rechts (${unitHint})${test.involvedSide === "right" ? " · aangedaan" : ""}`}>
                  <Input inputMode="decimal" value={right} onChange={(e) => setRight(e.target.value)} />
                </Field>
              </div>
            ) : (
              <Field label={`Resultaat (${unitHint})`}>
                <Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
              </Field>
            )}

            {last && (
              <p className="text-xs text-gray-500">
                Vorige meting ({formatDate(last.measuredOn)}):{" "}
                {test.bilateral
                  ? `L ${formatTestValue(last.valueLeft, test.unit)} · R ${formatTestValue(last.valueRight, test.unit)}`
                  : formatTestValue(last.value, test.unit)}
              </p>
            )}

            <Field label="Notitie" optional>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bijv. pijn bij landen, met brace, andere loopband" />
            </Field>

            {error && <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>Annuleren</Button>
              <Button size="sm" onClick={save} disabled={saving}>{saving ? "Opslaan…" : "Opslaan"}</Button>
            </div>
          </div>
        </div>
      </Card>
    </Modal>
  );
}
