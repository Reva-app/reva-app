/**
 * Staat alleen een relatief, eigen pad toe als redirect-doel (bv. de
 * `next`-queryparameter op de auth-pagina's) — voorkomt een open redirect
 * (`?next=https://evil.example`, of het protocol-relatieve `?next=//evil.example`)
 * ook al is de kans op misbruik hier laag (er is altijd al een geldig
 * token_hash van de eigenaar van het e-mailadres nodig om deze pagina's te
 * bereiken). Geeft `fallback` terug voor alles wat niet een schoon,
 * absoluut eigen pad is.
 */
export function getSafeNextPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\") || raw.includes("://")) {
    return fallback;
  }
  return raw;
}
