"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Gedeelde "Weet je het zeker?"-dialoog — vervangt de losse, per bestand
 * herbouwde varianten en de twee overgebleven native confirm()-aanroepen.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Bevestigen",
  cancelLabel = "Annuleren",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal onClose={onCancel} maxWidth="max-w-sm">
      <div className="rounded-2xl p-6" style={{ background: "#ffffff" }}>
        <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button size="sm" variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={loading}>
            {loading ? "Bezig…" : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
