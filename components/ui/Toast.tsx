"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, AlertCircle, X } from "lucide-react";

export type ToastType = "success" | "error";

interface ToastState {
  id: number;
  msg: string;
  type: ToastType;
}

interface ToastProps {
  message: string;
  type?: ToastType;
  onDismiss: () => void;
}

/** Foutmeldingen blijven langer staan: die moet je kunnen lezen. */
const TOAST_DURATION_MS: Record<ToastType, number> = { success: 4000, error: 7000 };

const STYLES: Record<ToastType, { title: string; iconBg: string; iconColor: string; bar: string }> = {
  success: { title: "Gelukt", iconBg: "#e8f6ee", iconColor: "#15803d", bar: "#16a34a" },
  error: { title: "Er ging iets mis", iconBg: "#fdecec", iconColor: "#dc2626", bar: "#dc2626" },
};

/**
 * Bevestiging of foutmelding als lichte kaart: rechtsboven op desktop,
 * bovenaan over de volle breedte op mobiel. Met icoon, korte kop, de
 * melding zelf, een sluitknop en een balk die laat zien hoe lang hij nog staat.
 */
export function Toast({ message, type = "success", onDismiss }: ToastProps) {
  const duration = TOAST_DURATION_MS[type];
  const s = STYLES[type];

  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [onDismiss, duration]);

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      className="fixed z-(--z-toast) left-4 right-4 sm:left-auto sm:right-6 sm:w-[380px] overflow-hidden rounded-2xl bg-white"
      style={{
        top: "max(1rem, env(safe-area-inset-top))",
        border: "1px solid #ece9e3",
        boxShadow: "0 12px 32px -8px rgba(20,20,30,0.18), 0 2px 6px rgba(20,20,30,0.06)",
        animation: "notifSlideIn 0.22s ease-out",
      }}
    >
      <div className="flex items-start gap-3 p-4 pr-3">
        <span
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: s.iconBg, color: s.iconColor, animation: "successPop 0.35s ease-out" }}
        >
          {type === "success" ? <Check size={18} strokeWidth={2.5} /> : <AlertCircle size={18} strokeWidth={2.25} />}
        </span>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-sm font-semibold text-gray-900 leading-tight">{s.title}</p>
          <p className="text-sm text-gray-600 mt-0.5 leading-snug break-words">{message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Melding sluiten"
          className="relative tap-target w-7 h-7 -mt-0.5 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
        >
          <X size={15} />
        </button>
      </div>
      <div className="h-1" style={{ background: "#f3f1ed" }}>
        <div
          className="h-full origin-left"
          style={{ background: s.bar, animation: `toastCountdown ${duration}ms linear forwards` }}
        />
      </div>
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
    // Nieuwe id: dezelfde melding nog eens tonen start de tijd opnieuw.
    setToast({ id: Date.now(), msg, type });
  }, []);

  const dismiss = useCallback(() => setToast(null), []);

  const toastNode = toast ? (
    <Toast key={toast.id} message={toast.msg} type={toast.type} onDismiss={dismiss} />
  ) : null;

  return { showToast, toastNode };
}
