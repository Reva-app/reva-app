"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { PhaseTransitionCheckin, TransitionProgressVsExpected } from "@/lib/services/protocolService";

const inputStyle = { borderColor: "#e8e5df", background: "#ffffff", color: "#1a1a1a" };

interface PhaseTransitionModalProps {
  phaseName: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (checkin: PhaseTransitionCheckin) => void;
}

const PROGRESS_OPTIONS: { value: TransitionProgressVsExpected; label: string }[] = [
  { value: "better", label: "Beter dan verwacht" },
  { value: "as_expected", label: "Zoals verwacht" },
  { value: "harder", label: "Lastiger dan verwacht" },
];

/**
 * Uitgebreide check-in bij het afronden van een fase (migratie 108 + 112) —
 * vervangt hier de generieke ConfirmDialog, omdat die geen ruimte biedt voor
 * deze optionele velden. Blijft verder hetzelfde bevestigingspatroon
 * (annuleren/bevestigen, loading-state).
 */
export function PhaseTransitionModal({ phaseName, loading = false, onCancel, onConfirm }: PhaseTransitionModalProps) {
  const [painScoreNow, setPainScoreNow] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [mobilityScore, setMobilityScore] = useState<number | null>(null);
  const [swelling, setSwelling] = useState<boolean | null>(null);
  const [satisfactionScore, setSatisfactionScore] = useState<number | null>(null);
  const [progressVsExpected, setProgressVsExpected] = useState<TransitionProgressVsExpected | null>(null);

  function handleConfirm() {
    onConfirm({ painScoreNow, note, mobilityScore, swelling, satisfactionScore, progressVsExpected });
  }

  return (
    <Modal onClose={onCancel} maxWidth="max-w-sm">
      <div className="rounded-2xl p-6" style={{ background: "#ffffff" }}>
        <h3 className="font-semibold text-gray-900 mb-2">Volgende fase starten?</h3>
        <p className="text-sm text-gray-500 mb-4">
          De fase &quot;{phaseName}&quot; wordt gemarkeerd als voltooid en de volgende fase gaat direct van start.
        </p>

        <div className="space-y-3 mb-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Pijnscore nu (0-10)</label>
              <input
                type="number" min={0} max={10} value={painScoreNow ?? ""}
                onChange={(e) => setPainScoreNow(e.target.value === "" ? null : Number(e.target.value))}
                placeholder="Bijv. 3" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Mobiliteit/functioneren (0-5)</label>
              <input
                type="number" min={0} max={5} value={mobilityScore ?? ""}
                onChange={(e) => setMobilityScore(e.target.value === "" ? null : Number(e.target.value))}
                placeholder="Bijv. 4" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Zwelling aanwezig</label>
              <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "#e8e5df" }}>
                {([{ v: false, l: "Nee" }, { v: true, l: "Ja" }] as const).map(({ v, l }) => (
                  <button
                    key={l} type="button" onClick={() => setSwelling(v)}
                    className="flex-1 text-sm py-2 transition-colors"
                    style={{ background: swelling === v ? "#1c1c1e" : "#ffffff", color: swelling === v ? "#ffffff" : "#6b7280" }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Tevredenheid patiënt (0-5)</label>
              <input
                type="number" min={0} max={5} value={satisfactionScore ?? ""}
                onChange={(e) => setSatisfactionScore(e.target.value === "" ? null : Number(e.target.value))}
                placeholder="Bijv. 4" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Verloop t.o.v. verwachting</label>
            <select
              value={progressVsExpected ?? ""}
              onChange={(e) => setProgressVsExpected(e.target.value ? (e.target.value as TransitionProgressVsExpected) : null)}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none appearance-none"
              style={inputStyle}
            >
              <option value="">Niet aangegeven</option>
              {PROGRESS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Notitie over deze fase (optioneel)</label>
            <textarea
              value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              placeholder="Bijv. bijzonderheden, terugval, opvallende vooruitgang…"
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none resize-none" style={inputStyle}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={onCancel} disabled={loading}>
            Annuleren
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={loading}>
            {loading ? "Bezig…" : "Volgende fase starten"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
