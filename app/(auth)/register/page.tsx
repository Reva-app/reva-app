"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();

  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordHerhaling, setPasswordHerhaling] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  function validate() {
    if (!naam.trim()) { setError("Vul je naam in"); return false; }
    if (!email.trim()) { setError("E-mailadres is verplicht"); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Voer een geldig e-mailadres in"); return false; }
    if (!password) { setError("Wachtwoord is verplicht"); return false; }
    if (password.length < 8) { setError("Wachtwoord moet minimaal 8 tekens bevatten"); return false; }
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

    router.push("/login?registered=1");
  }

  const passwordStrength = !password
    ? null
    : password.length < 8
    ? "zwak"
    : password.length < 12
    ? "matig"
    : "sterk";

  const strengthColor =
    passwordStrength === "sterk"
      ? "#16a34a"
      : passwordStrength === "matig"
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
            {/* Strength indicator */}
            {passwordStrength && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex gap-1">
                  {["zwak", "matig", "sterk"].map((level, i) => (
                    <div
                      key={level}
                      className="h-1 w-8 rounded-full transition-colors"
                      style={{
                        background:
                          (passwordStrength === "zwak" && i === 0) ||
                          (passwordStrength === "matig" && i <= 1) ||
                          (passwordStrength === "sterk" && i <= 2)
                            ? strengthColor
                            : "#e8e5df",
                      }}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-medium" style={{ color: strengthColor }}>
                  {passwordStrength === "zwak" ? "Zwak" : passwordStrength === "matig" ? "Matig" : "Sterk"}
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

        {/* Disclaimer note */}
        <p className="text-[11px] text-gray-400 text-center mt-4 leading-relaxed">
          Door een account aan te maken ga je akkoord met onze{" "}
          <span className="underline underline-offset-2">algemene voorwaarden</span>{" "}
          en het{" "}
          <span className="underline underline-offset-2">privacybeleid</span>.
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
