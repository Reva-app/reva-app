"use client";

import { useEffect, useState } from "react";

// ─── Motiverende zinnen ───────────────────────────────────────────────────────

const ZINNEN = [
  "Elke stap vooruit telt",
  "Goed dat je aan je herstel werkt",
  "Kleine vooruitgang is ook vooruitgang",
  "Rust, overzicht en focus",
  "Vandaag bouw je verder aan herstel",
  "Je herstel begint met overzicht",
  "Consistentie maakt verschil",
  "Stap voor stap kom je verder",
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface LoadingScreenProps {
  /** Zet op true zodra de app klaar is — triggert de exit-animatie */
  done: boolean;
  /** Wordt aangeroepen nadat de exit-animatie klaar is — veilig om te unmounten */
  onExited?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LoadingScreen({ done, onExited }: LoadingScreenProps) {
  // Kies één zin per mount (willekeurig, stabiel)
  const [zin] = useState(() => ZINNEN[Math.floor(Math.random() * ZINNEN.length)]);
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Simuleer realistische voortgang (logaritmische aanpak naar 82%)
  useEffect(() => {
    if (done) return;
    const id = setInterval(() => {
      setProgress((prev) => {
        const target = 82;
        if (prev >= target) return prev;
        const step = Math.max(0.4, (target - prev) * 0.046);
        return Math.min(target, prev + step);
      });
    }, 60);
    return () => clearInterval(id);
  }, [done]);

  // Zodra klaar: balk naar 100%, dan fade-out
  useEffect(() => {
    if (!done) return;
    setProgress(100);
    const t1 = setTimeout(() => setExiting(true), 350);
    const t2 = setTimeout(() => {
      setHidden(true);
      onExited?.();
    }, 920);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [done, onExited]);

  if (hidden) return null;

  return (
    <div
      role="status"
      aria-label="App wordt geladen"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "#f8f7f4",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 2rem",
        opacity: exiting ? 0 : 1,
        transition: exiting ? "opacity 0.57s ease" : "opacity 0.18s ease",
        pointerEvents: exiting ? "none" : "auto",
      }}
    >
      {/* ── Logo ────────────────────────────────────────────────────────── */}
      <div style={{ textAlign: "center", marginBottom: "3.25rem" }}>
        <p
          style={{
            fontSize: "2.25rem",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            color: "#1a1a1a",
            lineHeight: 1,
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
          }}
        >
          REVA
        </p>
        <p
          style={{
            fontSize: "0.65rem",
            fontWeight: 500,
            letterSpacing: "0.22em",
            color: "#c9c4bc",
            marginTop: "0.55rem",
            textTransform: "uppercase",
          }}
        >
          Herstel Dashboard
        </p>
      </div>

      {/* ── Voortgangsbalk + zin ─────────────────────────────────────────── */}
      <div style={{ width: "100%", maxWidth: "260px" }}>
        {/* Track */}
        <div
          style={{
            height: "2px",
            background: "#e8e5df",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          {/* Vulling */}
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "#e8632a",
              borderRadius: "2px",
              transition: "width 0.32s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>

        {/* Motiverende zin */}
        <p
          style={{
            fontSize: "0.8rem",
            color: "#b5b0a8",
            textAlign: "center",
            marginTop: "1.375rem",
            lineHeight: 1.65,
            fontWeight: 400,
          }}
        >
          {zin}
        </p>
      </div>
    </div>
  );
}
