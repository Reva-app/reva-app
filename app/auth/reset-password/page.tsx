"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, AlertCircle, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";
import { validatePassword } from "@/lib/passwordPolicy";
import { getSafeNextPath } from "@/lib/safeRedirect";

// ─── Google icon (zelfde SVG als app/(auth)/login/page.tsx) ──────────────────
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = getSafeNextPath(searchParams.get("next"));
  const isInvite = searchParams.get("mode") === "invite";
  const orgName = searchParams.get("org");
  const roleParam = searchParams.get("role");
  const isOwnerInvite = roleParam === "owner";
  const isPatientInvite = roleParam === "patient";
  const [password, setPassword] = useState("");
  const [herhaling, setHerhaling] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const supabase = createClient();

  // Supabase puts the recovery token in the URL hash — the SSR client picks
  // it up automatically via onAuthStateChange. We just need to be mounted.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          // We're now in password-recovery mode — form is ready
        }
      }
    );
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!password) { setError("Wachtwoord is verplicht"); return; }
    const passwordError = validatePassword(password);
    if (passwordError) { setError(passwordError); return; }
    if (password !== herhaling) { setError("Wachtwoorden komen niet overeen"); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDone(true);
    setTimeout(() => router.push(next), 2500);
  }

  /**
   * Alternatief voor wachtwoord aanmaken bij een uitnodiging: veel
   * uitgenodigde e-mailadressen zijn al een Gmail/Google-account — met
   * hetzelfde e-mailadres inloggen met Google i.p.v. een los wachtwoord te
   * verzinnen. Koppelt aan hetzelfde account zolang Supabase's project-
   * instelling voor automatisch koppelen op e-mailadres aan staat (niet
   * vanuit deze code te garanderen, dat is een Dashboard-instelling).
   */
  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);
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
  }

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
          <span className="font-bold text-lg" style={{ color: "#1a1a1a" }}>REVA</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
          {isInvite ? "Welkom bij REVA App" : "Nieuw wachtwoord instellen"}
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          {isInvite
            ? (isPatientInvite
                ? (orgName ? `${orgName} heeft een persoonlijk herstel-dashboard voor je klaargezet` : "Stel een wachtwoord in om je herstel-dashboard te activeren")
                : (orgName ? `Je bent uitgenodigd om toegevoegd te worden aan ${orgName}` : "Stel een wachtwoord in om je account te activeren"))
            : "Kies een nieuw, sterk wachtwoord voor je account"}
        </p>
        {isInvite && (
          <p className="text-xs text-gray-400 mt-1.5">
            {isPatientInvite
              ? "Na het opslaan heb je direct toegang tot je persoonlijke herstel-dashboard."
              : isOwnerInvite
                ? "Na het opslaan kun je direct je team uitnodigen, locaties inrichten en de huisstijl aanpassen."
                : "Na het opslaan heb je direct toegang tot het dashboard."}
          </p>
        )}
      </div>

      <div
        className="w-full max-w-sm mx-auto rounded-2xl p-6 sm:p-8"
        style={{ background: "#ffffff", border: "1px solid #ece9e3", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
      >
        {done ? (
          <div className="text-center py-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "#f0fdf4" }}
            >
              <Check size={22} style={{ color: "#16a34a" }} />
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1.5">Wachtwoord gewijzigd</h2>
            <p className="text-sm text-gray-500">
              {isInvite
                ? (isPatientInvite
                    ? "Je wordt doorgestuurd naar je herstel-dashboard…"
                    : isOwnerInvite
                      ? "Je wordt doorgestuurd naar je REVA-dashboard…"
                      : `Je wordt doorgestuurd naar het dashboard van ${orgName ?? "je organisatie"}…`)
                : "Je wordt doorgestuurd naar het dashboard…"}
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div
                className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-5 text-sm"
                style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626" }}
              >
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Nieuw wachtwoord
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
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Wachtwoord herhalen
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={herhaling}
                  onChange={(e) => setHerhaling(e.target.value)}
                  placeholder="Herhaal nieuw wachtwoord"
                  className="w-full text-sm rounded-xl border px-4 py-3 focus:outline-none transition-colors"
                  style={{
                    borderColor: herhaling && herhaling !== password ? "#fca5a5" : "#e8e5df",
                    background: "#f8f7f4",
                    color: "#1a1a1a",
                  }}
                />
                {herhaling && herhaling !== password && (
                  <p className="text-[11px] mt-1.5 ml-0.5" style={{ color: "#dc2626" }}>
                    Wachtwoorden komen niet overeen
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60 mt-2"
                style={{ background: "#e8632a", color: "#ffffff" }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Opslaan…
                  </>
                ) : (
                  "Wachtwoord opslaan"
                )}
              </button>
            </form>

            {isInvite && (
              <>
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px" style={{ background: "#ece9e3" }} />
                  <span className="text-xs text-gray-400">of</span>
                  <div className="flex-1 h-px" style={{ background: "#ece9e3" }} />
                </div>

                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-medium border transition-colors hover:bg-gray-50 disabled:opacity-60"
                  style={{ borderColor: "#e8e5df", color: "#374151", background: "#ffffff" }}
                >
                  {googleLoading ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
                  Doorgaan met Google
                </button>
                <p className="text-[11px] text-gray-400 text-center mt-2">
                  Gebruik hetzelfde e-mailadres als waarop je bent uitgenodigd.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
