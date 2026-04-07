// ─── Gedeelde datum-hulpfuncties ──────────────────────────────────────────────
// Centraal punt voor eenvoudige datum/tijd helpers die in meerdere bestanden
// nodig zijn. Extractie hier maakt lazy loading van InnameModal mogelijk.

/** Geeft de huidige datum terug als "YYYY-MM-DD" in lokale tijd */
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Geeft de huidige tijd terug als "HH:MM" in lokale tijd */
export function nowTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
