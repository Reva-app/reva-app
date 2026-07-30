"use client";

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
  /** Op false zetten voor create/edit-formulieren: voorkomt dat een misklik
   * naast het venster getypte, niet-opgeslagen tekst stilzwijgend weggooit. */
  dismissOnBackdropClick?: boolean;
}

export function Modal({ children, onClose, maxWidth = "max-w-lg", dismissOnBackdropClick = true }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: "rgba(24,24,26,0.45)" }}
      onClick={dismissOnBackdropClick ? onClose : undefined}
    >
      <div
        className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
