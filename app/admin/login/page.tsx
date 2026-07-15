"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";

/**
 * Los, eenvoudig inlogscherm voor het Super Admin Portal — bewust NIET het
 * gedeelde patiënten-inlogscherm. Alleen e-mail + wachtwoord (geen Google,
 * geen "account aanmaken"): dit portaal is bedoeld voor een klein aantal
 * platformbeheerders, niet voor zelfregistratie. Toegang wordt hierna nog
 * altijd afgedwongen door AdminGate (is_platform_admin()) — dit scherm is
 * puur UX, geen beveiligingsgrens.
 */
function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Vul e-mailadres en wachtwoord in");
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (signInError) {
      setError("Ongeldige inloggegevens.");
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-5 py-10" style={{ background: "#f8f7f4" }}>
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-6">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "#18181a" }}
          >
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <span className="font-bold text-lg" style={{ color: "#1a1a1a" }}>
            REVA
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
          Platform Admin
        </h1>
        <p className="text-sm text-gray-500 mt-2 flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} style={{ color: "#9ca3af" }} />
          Alleen voor platformbeheerders
        </p>
      </div>

      <div
        className="w-full max-w-sm mx-auto rounded-2xl p-6 sm:p-8"
        style={{ background: "#ffffff", border: "1px solid #ece9e3", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
      >
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
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              E-mailadres
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jouw@reva-app.nl"
              className="w-full text-sm rounded-xl border px-4 py-3 focus:outline-none transition-colors"
              style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Wachtwoord
            </label>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ background: "#18181a", color: "#ffffff" }}
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
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
