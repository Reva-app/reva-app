/**
 * Content-Security-Policy — de enige plek waar het beleid staat.
 *
 * Pagina's krijgen in proxy.ts per verzoek een nonce: scripts draaien alleen
 * als ze die nonce dragen (Next.js zet hem zelf op zijn eigen scripts), en
 * 'strict-dynamic' laat die scripts hun eigen chunks laden. Een
 * geïnjecteerd <script> of inline event-handler van een aanvaller draait dus
 * niet, ook niet als er ooit ergens HTML-injectie zou ontstaan.
 *
 * Zonder nonce (API-routes, statische bestanden, de Capacitor-build) valt het
 * terug op het oude beleid met 'unsafe-inline'; daar wordt geen HTML
 * gerenderd, dus dat is alleen een vangnet.
 *
 * Stijlen houden 'unsafe-inline': React zet stijlen als style-attribuut, en
 * die kun je niet met een nonce toestaan. CSS kan geen code uitvoeren.
 *
 * Bewust zonder imports, zodat next.config.ts dit bestand kan laden.
 */
export function buildCsp({ nonce, isDev }: { nonce?: string; isDev: boolean }): string {
  let supabaseOrigin = "";
  try {
    supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    // geen (geldige) Supabase-URL: alleen 'self'
  }
  const supabase = supabaseOrigin ? ` ${supabaseOrigin}` : "";
  // 'unsafe-eval' alleen in development (React's dev-mode gebruikt eval()).
  const evalSrc = isDev ? " 'unsafe-eval'" : "";
  const scriptSrc = nonce
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'${evalSrc}`
    : `'self' 'unsafe-inline'${evalSrc}`;
  return `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://*.googleusercontent.com${supabase};
    font-src 'self';
    connect-src 'self'${supabase} https://*.ingest.de.sentry.io;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
  `.replace(/\s{2,}/g, " ").trim();
}
