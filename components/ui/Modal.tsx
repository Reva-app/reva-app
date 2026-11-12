"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
  /** Op false zetten voor create/edit-formulieren: een klik naast het
   * venster of Escape sluit dan nog steeds, maar vraagt eerst om
   * bevestiging zodra er iets is ingevuld (geen stille dataverlies). */
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
  const backdropRef = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Klik ernaast of Escape: altijd sluiten, behalve bij een formulier waarin al
  // iets is ingevuld — dan eerst een korte bevestiging.
  const needsConfirm = !dismissOnBackdropClick && dirty;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // Alleen het bovenste venster reageert (bv. een bevestiging boven een formulier).
      const all = document.querySelectorAll(".reva-modal-backdrop");
      if (all[all.length - 1] !== backdropRef.current) return;
      e.preventDefault();
      if (confirming) setConfirming(false);
      else if (needsConfirm) setConfirming(true);
      else onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming, needsConfirm, onClose]);

  const modal = (
    <div
      ref={backdropRef}
      className="reva-modal-backdrop fixed inset-0 z-(--z-modal) flex items-end sm:items-center justify-center"
      style={{ background: "rgba(24,24,26,0.45)", animation: "fadeIn 0.18s ease" }}
      onClick={(e) => { if (e.target !== e.currentTarget) return; if (needsConfirm) setConfirming(true); else onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`reva-modal-panel relative w-full ${maxWidth} max-h-full overflow-y-auto overscroll-contain rounded-t-2xl sm:rounded-2xl`}
        style={{ background: "#ffffff" }}
        onInput={() => { if (!dirty) setDirty(true); }}
      >
        {children}
        {confirming && (
          <div className="sticky bottom-0 inset-x-0 z-10 p-3">
            <div role="alertdialog" aria-label="Sluiten zonder opslaan?" className="rounded-2xl border p-4 shadow-lg flex items-center gap-3 flex-wrap" style={{ background: "#ffffff", borderColor: "#e8e5df" }}>
              <p className="text-sm text-gray-800 flex-1 min-w-[180px]"><span className="font-semibold">Sluiten zonder opslaan?</span> Wat je hebt ingevuld gaat verloren.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirming(false)} className="rounded-xl border px-3.5 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50" style={{ borderColor: "#e8e5df" }}>Verder invullen</button>
                <button type="button" onClick={onClose} className="rounded-xl px-3.5 py-2 text-sm font-semibold text-white" style={{ background: "#dc2626" }}>Sluiten</button>
              </div>
            </div>
          </div>
        )}
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
