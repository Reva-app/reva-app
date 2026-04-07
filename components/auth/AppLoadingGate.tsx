"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAppData } from "@/lib/store";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

/**
 * Toont het laadscherm totdat zowel auth als store-data klaar zijn.
 * Hoort om de hele app-inhoud heen te staan zodat het scherm altijd
 * zichtbaar is op de eerste render — ook als auth snel resolvet.
 */
export function AppLoadingGate({ children }: { children: React.ReactNode }) {
  const { loading: authLoading } = useAuth();
  const { hydrated } = useAppData();

  const done = !authLoading && hydrated;

  // Zet het laadscherm pas weg nadat de exit-animatie klaar is
  const [exited, setExited] = useState(false);

  return (
    <>
      {/* Render kinderen altijd zodat hydration al kan starten */}
      <div
        style={{
          height: "100%",
          visibility: exited ? "visible" : "hidden",
          pointerEvents: exited ? "auto" : "none",
        }}
      >
        {children}
      </div>

      {!exited && (
        <LoadingScreen
          done={done}
          onExited={() => setExited(true)}
        />
      )}
    </>
  );
}
