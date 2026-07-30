"use client";

import { AlertCircle } from "lucide-react";

/**
 * "Niet-opgeslagen wijzigingen"-label — naast een opslaanknop te tonen
 * zodra een formulier afwijkt van de laatst opgeslagen waarden.
 */
export function UnsavedBadge() {
  return (
    <span className="flex items-center gap-1.5 text-xs" style={{ color: "#9ca3af" }}>
      <AlertCircle size={12} />
      Niet-opgeslagen wijzigingen
    </span>
  );
}
