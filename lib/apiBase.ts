/**
 * apiBase — absolute URL helper voor server-side API routes.
 *
 * In de web-build (Next.js op Vercel) zijn de API routes op hetzelfde
 * domein beschikbaar, dus volstaat een relatief pad.
 *
 * In de Capacitor-build draait de app als statische bundel op het
 * bestandssysteem. Relatieve API-aanroepen werken dan niet — ze moeten
 * de productie-URL als prefix gebruiken.
 *
 * Stel NEXT_PUBLIC_SITE_URL in op de Vercel-URL voor de Capacitor-build.
 * Laat de variabele leeg (of laat hem weg) voor de web-build.
 *
 * Voorbeeld .env.local:
 *   NEXT_PUBLIC_SITE_URL=https://jouw-app.vercel.app   ← alleen voor capacitor build
 *
 * Gebruik:
 *   import { apiUrl } from "@/lib/apiBase";
 *   fetch(apiUrl("/api/feedback"), { method: "POST", ... })
 */
export function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return `${base}${path}`;
}
