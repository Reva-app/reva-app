"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, AlertCircle } from "lucide-react";

export type ToastType = "success" | "error";

interface ToastState {
  msg: string;
  type: ToastType;
}

interface ToastProps {
  message: string;
  type?: ToastType;
  onDismiss: () => void;
}

const TOAST_DURATION_MS = 3000;

export function Toast({ message, type = "success", onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium"
      style={{
        background: type === "success" ? "#1c1c1e" : "#dc2626",
        color: "#ffffff",
        minWidth: "220px",
      }}
    >
      {type === "success" ? <Check size={15} className="shrink-0" /> : <AlertCircle size={15} className="shrink-0" />}
      {message}
    </div>
  );
}

/**
 * Eén regel per pagina: const { showToast, toastNode } = useToast();
 * Conventie: "X opgeslagen" bij aanmaken/wijzigen, "X verwijderd" bij
 * verwijderen, "Opslaan mislukt: {reden}" bij een fout.
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((msg: string, type: ToastType = "success") => {
    setToast({ msg, type });
  }, []);

  const toastNode = toast ? (
    <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />
  ) : null;

  return { showToast, toastNode };
}
