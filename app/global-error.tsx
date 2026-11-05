"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Laatste vangnet als de app zelf vastloopt (ook in de root-layout). Meldt de
 * fout aan Sentry en toont een rustige melding. Bewust zonder app-componenten
 * of Tailwind-afhankelijkheden: die kunnen juist de oorzaak zijn.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="nl">
      <body style={{ margin: 0, background: "#f8f7f4", fontFamily: "system-ui, -apple-system, sans-serif", color: "#1a1a1a" }}>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, background: "#ffffff", borderRadius: 20, padding: 32, border: "1px solid #e8e5df", textAlign: "center" }}>
            <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Er ging iets mis</h1>
            <p style={{ fontSize: 15, lineHeight: 1.5, color: "#6b6b6b", margin: "0 0 24px" }}>
              We hebben de fout automatisch doorgekregen. Probeer het opnieuw; lukt het dan nog niet, laad de pagina dan opnieuw.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{ background: "#e8632a", color: "#ffffff", border: 0, borderRadius: 12, padding: "12px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
            >
              Opnieuw proberen
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
