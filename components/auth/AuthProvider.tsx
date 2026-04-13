"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import type { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabaseClient";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  // ── Supabase auth state ──────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Native deep-link handler (Capacitor) ─────────────────────────────────
  // Vangt de OAuth-redirect op nadat de gebruiker via Google heeft ingelogd
  // in de externe browser. Sluit de browser en wisselt de code in voor een
  // sessie. Navigatie wordt afgehandeld door de login-pagina zelf zodra de
  // user-state is doorgezet — dit voorkomt een race condition.
  useEffect(() => {
    if (typeof window === "undefined") return;

    let removeListener: (() => void) | undefined;

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      const { App } = await import("@capacitor/app");
      const { Browser } = await import("@capacitor/browser");

      const handle = await App.addListener("appUrlOpen", async ({ url }) => {
        if (!url.startsWith("nl.revaapp.app://auth/callback")) return;

        // Sluit de externe browser direct
        await Browser.close();

        const params = new URL(url).searchParams;
        const code = params.get("code");

        if (code) {
          // Ruil code in voor sessie — onAuthStateChange pikt dit op en
          // zet user/session in state. De login-pagina navigeert daarna.
          await supabase.auth.exchangeCodeForSession(code);
        }
      });

      removeListener = () => handle.remove();
    })();

    return () => removeListener?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.push("/login");
  }, [supabase, router]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
