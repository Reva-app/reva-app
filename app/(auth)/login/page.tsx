"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";
import { useAuth } from "@/components/auth/AuthProvider";

// ─── Google icon ──────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.083 17.64 11.827 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();

  // Navigeer automatisch zodra de user-state beschikbaar is.
  // Dit vangt zowel de native OAuth-callback (appUrlOpen → exchangeCodeForSession
  // → onAuthStateChange) op als een reeds actieve sessie bij paginalading.
  useEffect(() => {
    if (authLoading || !user) return;

    supabase
      .from("settings")
      .select("setup_completed")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const setupDone = data?.setup_completed ?? false;
        router.replace(setupDone ? (next !== "/" ? next : "/") : "/instellingen");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // Show a success hint if redirected from register page
  const registered = searchParams.get("registered") === "1";

  function validate() {
    if (!email.trim()) { setError("E-mailadres is verplicht"); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Voer een geldig e-mailadres in"); return false; }
    if (!password) { setError("Wachtwoord is verplicht"); return false; }
    return true;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("invalid")) {
        setError("Ongeldige inloggegevens. Controleer je e-mail en wachtwoord.");
      } else if (error.message.toLowerCase().includes("email not confirmed")) {
        setError("Bevestig eerst je e-mailadres via de link die je hebt ontvangen.");
      } else {
        setError(error.message);
      }
      return;
    }

    // If the user hasn't finished onboarding, send them to /instellingen.
    // Otherwise honour the `next` param (or fall back to dashboard).
    if (data.user) {
      const { data: settings } = await supabase
        .from("settings")
        .select("setup_completed")
        .eq("user_id", data.user.id)
        .maybeSingle();

      const setupDone = settings?.setup_completed ?? false;
      const destination = setupDone ? (next && next !== "/" ? next : "/") : "/instellingen";
      router.push(destination);
    } else {
      router.push(next || "/");
    }
    router.refresh();
  }

  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);

    const { Capacitor } = await import("@capacitor/core");

    if (Capacitor.isNativePlatform()) {
      // Native (iOS / Android): open OAuth URL in externe browser.
      // Google blokkeert OAuth in embedded WebViews, dus we gebruiken
      // @capacitor/browser. De redirect gaat naar het custom URL-schema
      // com.reva.mobile://auth/callback, dat door AuthProvider wordt afgehandeld.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "com.reva.mobile://auth/callback",
          skipBrowserRedirect: true,
        },
      });
      if (error) {
        setError(error.message);
        setGoogleLoading(false);
        return;
      }
      if (data.url) {
        const { Browser } = await import("@capacitor/browser");

        // Spinner aan terwijl de browser open is.
        // Als de gebruiker de browser sluit zonder in te loggen → spinner uit.
        Browser.addListener("browserFinished", () => {
          setGoogleLoading(false);
          Browser.removeAllListeners();
        });

        await Browser.open({ url: data.url });
      } else {
        setGoogleLoading(false);
      }
      // Bij succes: appUrlOpen → exchangeCodeForSession → onAuthStateChange →
      // useEffect hierboven detecteert user en navigeert naar het dashboard.
    } else {
      // Web: standaard Supabase redirect-flow
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        setError(error.message);
        setGoogleLoading(false);
      }
      // Bij succes: browser wordt doorgestuurd door Supabase
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-5 py-10" style={{ background: "#f8f7f4" }}>
      {/* Logo */}
      <div className="text-center mb-8">
        <div
          className="inline-flex items-center gap-2 mb-6"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "#e8632a" }}
          >
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <span className="font-bold text-lg" style={{ color: "#1a1a1a" }}>
            REVA
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
          Welkom terug
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          Log in om verder te gaan met je herstel
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm mx-auto rounded-2xl p-6 sm:p-8"
        style={{ background: "#ffffff", border: "1px solid #ece9e3", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
      >
        {/* Registered hint */}
        {registered && (
          <div
            className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-5 text-sm"
            style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}
          >
            <span className="mt-0.5 shrink-0">✓</span>
            <span>Account aangemaakt. Controleer je e-mail om te bevestigen, of log direct in.</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-5 text-sm"
            style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626" }}
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              E-mailadres
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jouw@emailadres.nl"
              className="w-full text-sm rounded-xl border px-4 py-3 focus:outline-none transition-colors"
              style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-500">
                Wachtwoord
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium hover:opacity-70 transition-opacity"
                style={{ color: "#e8632a" }}
              >
                Vergeten?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm rounded-xl border px-4 py-3 pr-11 focus:outline-none transition-colors"
                style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Login button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ background: "#e8632a", color: "#ffffff" }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Inloggen…
              </>
            ) : (
              "Inloggen"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: "#ece9e3" }} />
          <span className="text-xs text-gray-400">of</span>
          <div className="flex-1 h-px" style={{ background: "#ece9e3" }} />
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-medium border transition-colors hover:bg-gray-50 disabled:opacity-60"
          style={{ borderColor: "#e8e5df", color: "#374151", background: "#ffffff" }}
        >
          {googleLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Doorgaan met Google
        </button>

        {/* Register link */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Nog geen account?{" "}
          <Link
            href="/register"
            className="font-semibold hover:opacity-70 transition-opacity"
            style={{ color: "#e8632a" }}
          >
            Account aanmaken
          </Link>
        </p>
      </div>
    </div>
  );
}


export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
