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

/**
 * Maandag van de kalenderweek van de gegeven datum (standaard: nu), als
 * "YYYY-MM-DD" in lokale tijd. Gebruikt waar "deze week" moet aansluiten bij
 * de zichtbare Ma-Zo weekweergave, in plaats van een rollend 7-dagenvenster.
 */
export function mondayOfWeek(date: Date = new Date()): string {
  const dow = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - (dow === 0 ? 6 : dow - 1));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}
