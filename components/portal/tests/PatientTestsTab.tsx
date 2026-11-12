"use client";

import { useEffect, useState } from "react";
import { Gauge, Plus, ChevronDown, Trash2, Target, Flag } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LineChart } from "@/components/ui/Charts";
import { AddTestModal } from "@/components/portal/tests/AddTestModal";
import { AddResultModal } from "@/components/portal/tests/AddResultModal";
import {
  loadTestLibrary, deletePatientTest, deleteTestResult,
  formatTestValue, headlineValue, lsi, TEST_CATEGORY_LABELS,
  type LibraryTest, type PatientTest, type TestResult,
} from "@/lib/services/testService";
import { formatDate, formatDateShort } from "@/lib/data";

function LsiBadge({ value }: { value: number }) {
  const v = Math.round(value);
  const variant = v >= 90 ? "success" : v >= 80 ? "warning" : "danger";
  return <Badge variant={variant}>Symmetrie {v}%</Badge>;
}

function sideLabel(side: "left" | "right" | null) {
  return side === "left" ? "links" : side === "right" ? "rechts" : null;
}

function TestCard({ test, phaseName, canManage, onMeasure, onChanged, notify, now }: {
  test: PatientTest;
  now: number;
  phaseName: string | null;
  canManage: boolean;
  onMeasure: () => void;
  onChanged: () => void;
  notify: (m: string, t?: "success" | "error") => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmResult, setConfirmResult] = useState<TestResult | null>(null);
  const results = test.results;
  const first = results[0] ?? null;
  const last = results[results.length - 1] ?? null;
  const lastVal = last ? headlineValue(test, last) : null;
  const firstVal = first ? headlineValue(test, first) : null;
  const delta = results.length >= 2 && lastVal !== null && firstVal !== null ? lastVal - firstVal : null;
  const improved = delta !== null && delta !== 0 ? (test.higherIsBetter ? delta > 0 : delta < 0) : null;
  const lastLsi = last ? lsi(test, last) : null;
  const series = results.map((r) => headlineValue(test, r)).filter((x): x is number => x !== null);
  const targetReached = test.targetValue !== null && lastVal !== null && (test.higherIsBetter ? lastVal >= test.targetValue : lastVal <= test.targetValue);
  const daysSinceLast = last ? Math.round((now - new Date(`${last.measuredOn}T12:00:00`).getTime()) / 86_400_000) : null;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">{test.name}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <Badge variant="muted">{TEST_CATEGORY_LABELS[test.category]}</Badge>
            {test.bilateral && <Badge variant="muted">Links/rechts{test.involvedSide ? ` · aangedaan ${sideLabel(test.involvedSide)}` : ""}</Badge>}
            {phaseName && <Badge variant="blue"><Flag size={10} className="inline -mt-px mr-0.5" />{phaseName}</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {canManage && <Button size="sm" variant="secondary" onClick={onMeasure}><Plus size={13} /> Meting</Button>}
          {canManage && (
            <ActionMenu items={[
              { label: "Test verwijderen", icon: Trash2, danger: true, onClick: () => setConfirmDelete(true) },
            ]} />
          )}
        </div>
      </div>

      {!last ? (
        <div className="mt-4 rounded-xl p-4 text-sm text-gray-600 flex items-center justify-between gap-3 flex-wrap" style={{ background: "#f8f7f4" }}>
          <span>Nog geen meting. Leg een eerste meting vast als nulmeting.</span>
          {canManage && <Button size="sm" onClick={onMeasure}>Eerste meting</Button>}
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_1.2fr] gap-4 items-center">
            <div>
              <p className="text-3xl font-bold tracking-tight text-gray-900 tabular-nums">{formatTestValue(lastVal, test.unit)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {test.bilateral && test.involvedSide ? `Aangedane zijde · ` : ""}{formatDate(last.measuredOn)}
                {daysSinceLast !== null && daysSinceLast > 42 && <span className="text-amber-700"> · {Math.round(daysSinceLast / 7)} weken geleden</span>}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                {delta !== null && delta !== 0 && (
                  <span className="text-xs font-semibold rounded-full px-2 py-0.5" style={improved ? { background: "#dcfce7", color: "#15803d" } : { background: "#fee2e2", color: "#b91c1c" }}>
                    {delta > 0 ? "+" : ""}{formatTestValue(delta, test.unit)} sinds {formatDateShort(first!.measuredOn)}
                  </span>
                )}
                {lastLsi !== null && <LsiBadge value={lastLsi} />}
                {test.bilateral && (
                  <span className="text-xs text-gray-500">L {formatTestValue(last.valueLeft, test.unit)} · R {formatTestValue(last.valueRight, test.unit)}</span>
                )}
              </div>
              {test.targetValue !== null && (
                <p className="text-xs mt-2.5 inline-flex items-center gap-1" style={{ color: targetReached ? "#15803d" : "#6b7280" }}>
                  <Target size={12} /> Doel {formatTestValue(test.targetValue, test.unit)}{targetReached ? " · behaald" : ""}
                </p>
              )}
            </div>
            {series.length >= 2 ? (
              <LineChart
                data={series}
                dates={results.filter((r) => headlineValue(test, r) !== null).map((r) => r.measuredOn)}
                color="var(--brand-accent, #e8632a)"
                max={Math.max(...series, test.targetValue ?? 0) * 1.1}
                height={90}
              />
            ) : (
              <p className="text-xs text-gray-400 sm:text-right">Na een tweede meting zie je hier het verloop.</p>
            )}
          </div>

          <button type="button" onClick={() => setOpen((v) => !v)} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800">
            <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} /> Alle metingen ({results.length})
          </button>
          {open && (
            <ul className="mt-2 divide-y divide-[#f0ede8] rounded-xl border" style={{ borderColor: "#f0ede8" }}>
              {[...results].reverse().map((r) => {
                const l = lsi(test, r);
                return (
                  <li key={r.id} className="flex items-start gap-3 px-3 py-2 text-sm">
                    <span className="w-24 shrink-0 text-gray-500 text-xs pt-0.5">{formatDate(r.measuredOn)}</span>
                    <span className="flex-1 min-w-0">
                      <span className="text-gray-900 tabular-nums">
                        {test.bilateral ? `L ${formatTestValue(r.valueLeft, test.unit)} · R ${formatTestValue(r.valueRight, test.unit)}` : formatTestValue(r.value, test.unit)}
                      </span>
                      {l !== null && <span className="text-xs text-gray-500"> · {Math.round(l)}%</span>}
                      {r.note && <span className="block text-xs text-gray-500 mt-0.5">{r.note}</span>}
                    </span>
                    {canManage && (
                      <button type="button" onClick={() => setConfirmResult(r)} aria-label="Meting verwijderen" className="text-gray-300 hover:text-red-600 shrink-0"><Trash2 size={14} /></button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Test verwijderen?"
          message={`"${test.name}" en alle ${results.length} metingen worden verwijderd.`}
          confirmLabel="Verwijderen"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            setConfirmDelete(false);
            const { error } = await deletePatientTest(test.id);
            if (error) notify(error, "error"); else { notify("Test verwijderd"); onChanged(); }
          }}
        />
      )}
      {confirmResult && (
        <ConfirmDialog
          title="Meting verwijderen?"
          message={`De meting van ${formatDate(confirmResult.measuredOn)} wordt verwijderd.`}
          confirmLabel="Verwijderen"
          danger
          onCancel={() => setConfirmResult(null)}
          onConfirm={async () => {
            const id = confirmResult.id;
            setConfirmResult(null);
            const { error } = await deleteTestResult(id);
            if (error) notify(error, "error"); else { notify("Meting verwijderd"); onChanged(); }
          }}
        />
      )}
    </Card>
  );
}

/**
 * Tab "Testen" in het dossier: objectieve metingen die de fysio los van het
 * herstelplan toevoegt en in de tijd herhaalt.
 */
export function PatientTestsTab({ patientId, organizationId, injuryType, tests, phases, canManage, canSaveToLibrary, onChanged, notify }: {
  patientId: string;
  organizationId: string;
  injuryType: string | null;
  tests: PatientTest[];
  phases: { id: string; name: string; status: string }[];
  canManage: boolean;
  canSaveToLibrary: boolean;
  onChanged: () => void;
  notify: (m: string, t?: "success" | "error") => void;
}) {
  const [library, setLibrary] = useState<LibraryTest[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [measuring, setMeasuring] = useState<PatientTest | null>(null);
  const [pendingMeasureId, setPendingMeasureId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (!adding || library) return;
    let cancelled = false;
    loadTestLibrary().then((l) => { if (!cancelled) setLibrary(l); });
    return () => { cancelled = true; };
  }, [adding, library]);

  // Na toevoegen meteen de eerste meting openen zodra de test geladen is.
  const pending = pendingMeasureId ? tests.find((t) => t.id === pendingMeasureId) ?? null : null;
  const measureTarget = measuring ?? pending;

  const phaseName = (id: string | null) => (id ? phases.find((p) => p.id === id)?.name ?? null : null);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Testen</h3>
          <p className="text-xs text-subtle">Objectieve metingen. Herhaal een test om te zien waar de patiënt staat.</p>
        </div>
        {canManage && tests.length > 0 && <Button size="sm" onClick={() => setAdding(true)}><Plus size={13} /> Test toevoegen</Button>}
      </div>

      {tests.length === 0 ? (
        <Card>
          <EmptyState
            icon={Gauge}
            title="Nog geen testen"
            description="Voeg een test toe, zoals een hop-test, een krachtmeting, bewegingsuitslag, een vragenlijst of een conditietest. Leg een nulmeting vast en herhaal hem na een paar weken."
            action={canManage ? <Button size="sm" onClick={() => setAdding(true)}><Plus size={13} /> Test toevoegen</Button> : undefined}
          />
        </Card>
      ) : (
        tests.map((t) => (
          <TestCard key={t.id} test={t} now={now} phaseName={phaseName(t.phaseId)} canManage={canManage}
            onMeasure={() => setMeasuring(t)} onChanged={onChanged} notify={notify} />
        ))
      )}

      {adding && library && (
        <AddTestModal
          patientId={patientId}
          organizationId={organizationId}
          injuryType={injuryType}
          library={library}
          phases={phases}
          canSaveToLibrary={canSaveToLibrary}
          onClose={() => setAdding(false)}
          onAdded={(id, name) => { setAdding(false); notify(`${name} toegevoegd`); setPendingMeasureId(id); onChanged(); }}
        />
      )}

      {measureTarget && (
        <AddResultModal
          patientId={patientId}
          test={measureTarget}
          onClose={() => { setMeasuring(null); setPendingMeasureId(null); }}
          onSaved={() => { setMeasuring(null); setPendingMeasureId(null); notify("Meting opgeslagen"); onChanged(); }}
        />
      )}
    </div>
  );
}
