"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const inputStyle = { borderColor: "#e8e5df", background: "#ffffff", color: "#1a1a1a" };

interface PhaseTransitionModalProps {
  phaseName: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (painScoreNow: number | null, note: string) => void;
}

/**
 * Korte check-in bij het afronden van een fase (migratie 108) — vervangt
 * hier de generieke ConfirmDialog, omdat die geen ruimte biedt voor deze
 * twee extra, optionele velden. Blijft verder hetzelfde bevestigingspatroon
 * (annuleren/bevestigen, loading-state).
 */
export function PhaseTransitionModal({ phaseName, loading = false, onCancel, onConfirm }: PhaseTransitionModalProps) {
  const [painScoreNow, setPainScoreNow] = useState<number | null>(null);
  const [note, setNote] = useState("");

  return (
    <Modal onClose={onCancel} maxWidth="max-w-sm">
      <div className="rounded-2xl p-6" style={{ background: "#ffffff" }}>
        <h3 className="font-semibold text-gray-900 mb-2">Volgende fase starten?</h3>
        <p className="text-sm text-gray-500 mb-4">
          De fase &quot;{phaseName}&quot; wordt gemarkeerd als voltooid en de volgende fase gaat direct van start.
        </p>

        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Pijnscore nu (0-10, optioneel)</label>
            <input
              type="number" min={0} max={10} value={painScoreNow ?? ""}
              onChange={(e) => setPainScoreNow(e.target.value === "" ? null : Number(e.target.value))}
              placeholder="Bijv. 3" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
            />
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
          <Button size="sm" onClick={() => onConfirm(painScoreNow, note)} disabled={loading}>
            {loading ? "Bezig…" : "Volgende fase starten"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
