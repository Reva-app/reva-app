"use client";

import { useEffect } from "react";
import { clsx } from "clsx";

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
  /** Op false zetten voor create/edit-formulieren: voorkomt dat een misklik
   * naast het venster (of Escape) getypte, niet-opgeslagen tekst
   * stilzwijgend weggooit. */
  dismissOnBackdropClick?: boolean;
}

/**
 * Op telefoon (< 640px) een bottom sheet over de volle breedte, daarboven
 * een gecentreerd venster. Ligt op --z-modal, dus óver de onderbalk: die is
 * niet meer klikbaar zolang de modal open is (anders kon een tik op de
 * onderbalk een half ingevuld formulier wegnavigeren). `dvh` i.p.v. `vh`
 * zodat de dynamische werkbalk van iOS Safari de onderkant niet afsnijdt.
 */
export function Modal({ children, onClose, maxWidth = "max-w-lg", dismissOnBackdropClick = true }: ModalProps) {
  useEffect(() => {
    if (!dismissOnBackdropClick) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dismissOnBackdropClick, onClose]);

  return (
    <div
      className="fixed inset-0 z-(--z-modal) flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: "rgba(24,24,26,0.45)", animation: "fadeIn 0.18s ease" }}
      onClick={dismissOnBackdropClick ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`reva-modal-panel w-full ${maxWidth} max-h-[92dvh] sm:max-h-[90dvh] overflow-y-auto overscroll-contain rounded-t-2xl sm:rounded-2xl`}
        style={{ background: "#ffffff" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        <div className="reva-modal-safe-area" aria-hidden />
      </div>
    </div>
  );
}

const footerInsets = {
  md: "-mx-5 -mb-5 px-5 mt-5",
  lg: "-mx-6 -mb-6 px-6 mt-6",
};

/**
 * Knoppenbalk die onderin een Modal blijft staan, ook als de inhoud langer
 * is dan het scherm — "Opslaan" is dan altijd bereikbaar zonder eerst te
 * scrollen. Zet hem als laatste element in de kaart van de modal; `inset`
 * moet overeenkomen met de padding van die kaart (Card = md, p-6-div = lg),
 * zodat de balk van rand tot rand loopt.
 */
export function ModalFooter({
  children,
  inset = "lg",
  className,
}: {
  children: React.ReactNode;
  inset?: keyof typeof footerInsets;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "reva-modal-footer sticky bottom-0 flex items-center justify-end gap-2 pt-4 rounded-b-2xl",
        footerInsets[inset],
        className
      )}
      style={{
        background: "#ffffff",
        borderTop: "1px solid #f0ede8",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
      }}
    >
      {children}
    </div>
  );
}
