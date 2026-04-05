"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const supabase = createClient();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) { setError("E-mailadres is verplicht"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Voer een geldig e-mailadres in"); return; }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
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
          <span className="font-bold text-lg" style={{ color: "#1a1a1a" }}>
            REVA
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
          Wachtwoord vergeten
        </h1>
        <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
          We sturen je een link om je wachtwoord opnieuw in te stellen
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm mx-auto rounded-2xl p-6 sm:p-8"
        style={{ background: "#ffffff", border: "1px solid #ece9e3", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
      >
        {sent ? (
          /* Success state */
          <div className="text-center py-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "#f0fdf4" }}
            >
              <span className="text-2xl">✉️</span>
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1.5">
              E-mail verzonden
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Als <span className="font-medium text-gray-700">{email}</span> bij ons bekend is, ontvang je een e-mail met een reset link.
            </p>
            <p className="text-xs text-gray-400 mb-6">
              Geen e-mail ontvangen? Controleer je spamfolder of probeer opnieuw.
            </p>
            <button
              type="button"
              onClick={() => { setSent(false); setEmail(""); }}
              className="text-sm font-medium hover:opacity-70 transition-opacity"
              style={{ color: "#e8632a" }}
            >
              Opnieuw proberen
            </button>
          </div>
        ) : (
          <>
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

            <form onSubmit={handleReset} className="space-y-4" noValidate>
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

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60"
                style={{ background: "#e8632a", color: "#ffffff" }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Versturen…
                  </>
                ) : (
                  "Verstuur reset link"
                )}
              </button>
            </form>
          </>
        )}

        {/* Back to login */}
        <div className="flex justify-center mt-6">
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:opacity-70 transition-opacity"
          >
            <ArrowLeft size={13} />
            Terug naar inloggen
          </Link>
        </div>
      </div>
    </div>
  );
}
