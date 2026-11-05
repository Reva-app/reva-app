"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
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
 * een gecentreerd venster. Zolang er een onderbalk is (< 1024px) eindigt de
 * modal net bóven die balk; de achtergrond dekt de balk af, zodat een tik
 * erop geen half ingevuld formulier kan wegnavigeren. `dvh` i.p.v. `vh`
 * zodat de dynamische werkbalk van iOS Safari niets afsnijdt.
 *
 * Wordt via een portal direct in <body> getekend: zo kan geen enkele
 * stapellaag van een voorouder (bv. de scrollcontainer <main>) de modal
 * onder de onderbalk of banners opsluiten.
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

  const modal = (
    <div
      className="reva-modal-backdrop fixed inset-0 z-(--z-modal) flex items-end sm:items-center justify-center"
      style={{ background: "rgba(24,24,26,0.45)", animation: "fadeIn 0.18s ease" }}
      onClick={dismissOnBackdropClick ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`reva-modal-panel w-full ${maxWidth} max-h-full overflow-y-auto overscroll-contain rounded-t-2xl sm:rounded-2xl`}
        style={{ background: "#ffffff" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  // Modals openen pas na een klik, dus nooit tijdens server-rendering.
  return typeof document === "undefined" ? modal : createPortal(modal, document.body);
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
        "sticky bottom-0 flex items-center justify-end gap-2 py-4 sm:rounded-b-2xl",
        footerInsets[inset],
        className
      )}
      style={{ background: "#ffffff", borderTop: "1px solid #f0ede8" }}
    >
      {children}
    </div>
  );
}
