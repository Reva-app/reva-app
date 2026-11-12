"use client";

import { useEffect } from "react";

/** Sluit een venster of menu met Escape (zolang `active`). */
export function useEscape(onClose: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, active]);
}
