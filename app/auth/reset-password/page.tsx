"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [herhaling, setHerhaling] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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
    if (password.length < 8) { setError("Wachtwoord moet minimaal 8 tekens bevatten"); return; }
    if (password !== herhaling) { setError("Wachtwoorden komen niet overeen"); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/"), 2500);
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
          Nieuw wachtwoord instellen
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          Kies een nieuw, sterk wachtwoord voor je account
        </p>
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
            <p className="text-sm text-gray-500">Je wordt doorgestuurd naar het dashboard…</p>
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
                    placeholder="Minimaal 8 tekens"
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
          </>
        )}
      </div>
    </div>
  );
}
