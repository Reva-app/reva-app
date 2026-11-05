/**
 * Maten van de app-layout die ook in JavaScript nodig zijn (bv. om een
 * popover boven de onderbalk te houden). Houd ze gelijk aan globals.css:
 * `--nav-height` en de `lg`-breakpoint van Tailwind, vanaf waar de
 * onderbalk plaatsmaakt voor de zijbalk.
 */
export const NAV_BREAKPOINT = 1024;
export const NAV_HEIGHT = 64;

/** Hoogte die de onderbalk nu onderin het scherm inneemt (0 op desktop). */
export function bottomNavOffset(): number {
  return typeof window !== "undefined" && window.innerWidth < NAV_BREAKPOINT ? NAV_HEIGHT : 0;
}
