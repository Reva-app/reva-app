"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";
import { validatePassword, passwordStrength } from "@/lib/passwordPolicy";

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

export default function RegisterPage() {
  const router = useRouter();

  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordHerhaling, setPasswordHerhaling] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  function validate() {
    if (!naam.trim()) { setError("Vul je naam in"); return false; }
    if (!email.trim()) { setError("E-mailadres is verplicht"); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Voer een geldig e-mailadres in"); return false; }
    if (!password) { setError("Wachtwoord is verplicht"); return false; }
    const passwordError = validatePassword(password);
    if (passwordError) { setError(passwordError); return false; }
    if (password !== passwordHerhaling) { setError("Wachtwoorden komen niet overeen"); return false; }
    return true;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: naam.trim() },
      },
    });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        setError("Dit e-mailadres is al in gebruik. Probeer in te loggen.");
      } else {
        setError(error.message);
      }
      return;
    }

    // Clear any demo/localStorage data so a new account always starts empty
    const REVA_LS_KEYS = [
      "reva_checkins", "reva_appointments", "reva_medicatie", "reva_schemas",
      "reva_training_oefeningen", "reva_training_schemas", "reva_training_logs",
      "reva_doelen", "reva_mijlpalen", "reva_dossier_documenten",
      "reva_foto_updates", "reva_contactpersonen", "reva_profile",
    ];
    REVA_LS_KEYS.forEach((k) => localStorage.removeItem(k));

    router.push("/login?registered=1");
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

        Browser.addListener("browserFinished", () => {
          setGoogleLoading(false);
          Browser.removeAllListeners();
        });

        await Browser.open({ url: data.url });
      } else {
        setGoogleLoading(false);
      }
    } else {
      // Web: standaard Supabase redirect-flow
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
        setGoogleLoading(false);
      }
    }
  }

  const strength = passwordStrength(password);

  const strengthColor =
    strength === "sterk"
      ? "#16a34a"
      : strength === "matig"
      ? "#d97706"
      : "#dc2626";

  return (
    <div className="min-h-screen flex flex-col justify-center px-5 py-10" style={{ background: "#f8f7f4" }}>
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-6">
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
          Account aanmaken
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          Start jouw herstel met REVA
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm mx-auto rounded-2xl p-6 sm:p-8"
        style={{ background: "#ffffff", border: "1px solid #ece9e3", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
      >
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

        <form onSubmit={handleRegister} className="space-y-4" noValidate>
          {/* Naam */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Naam
            </label>
            <input
              type="text"
              autoComplete="name"
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              placeholder="Jouw naam"
              className="w-full text-sm rounded-xl border px-4 py-3 focus:outline-none transition-colors"
              style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
            />
          </div>

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
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Wachtwoord
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimaal 10 tekens, letters en cijfers"
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
            {/* Strength indicator */}
            {strength && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex gap-1">
                  {["zwak", "matig", "sterk"].map((level, i) => (
                    <div
                      key={level}
                      className="h-1 w-8 rounded-full transition-colors"
                      style={{
                        background:
                          (strength === "zwak" && i === 0) ||
                          (strength === "matig" && i <= 1) ||
                          (strength === "sterk" && i <= 2)
                            ? strengthColor
                            : "#e8e5df",
                      }}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-medium" style={{ color: strengthColor }}>
                  {strength === "zwak" ? "Zwak" : strength === "matig" ? "Matig" : "Sterk"}
                </span>
              </div>
            )}
          </div>

          {/* Password repeat */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Wachtwoord herhalen
            </label>
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={passwordHerhaling}
              onChange={(e) => setPasswordHerhaling(e.target.value)}
              placeholder="Herhaal jouw wachtwoord"
              className="w-full text-sm rounded-xl border px-4 py-3 focus:outline-none transition-colors"
              style={{
                borderColor:
                  passwordHerhaling && passwordHerhaling !== password
                    ? "#fca5a5"
                    : "#e8e5df",
                background: "#f8f7f4",
                color: "#1a1a1a",
              }}
            />
            {passwordHerhaling && passwordHerhaling !== password && (
              <p className="text-[11px] mt-1.5 ml-0.5" style={{ color: "#dc2626" }}>
                Wachtwoorden komen niet overeen
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60 mt-2"
            style={{ background: "#e8632a", color: "#ffffff" }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Account aanmaken…
              </>
            ) : (
              "Account aanmaken"
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

        {/* Disclaimer note */}
        <p className="text-[11px] text-gray-400 text-center mt-4 leading-relaxed">
          Door een account aan te maken ga je akkoord met onze{" "}
          <a
            href="https://www.reva-app.nl/algemene-voorwaarden"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-gray-600"
          >
            algemene voorwaarden
          </a>{" "}
          en het{" "}
          <a
            href="https://www.reva-app.nl/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-gray-600"
          >
            privacybeleid
          </a>.
        </p>

        {/* Login link */}
        <p className="text-center text-xs text-gray-500 mt-5">
          Al een account?{" "}
          <Link
            href="/login"
            className="font-semibold hover:opacity-70 transition-opacity"
            style={{ color: "#e8632a" }}
          >
            Inloggen
          </Link>
        </p>
      </div>
    </div>
  );
}
