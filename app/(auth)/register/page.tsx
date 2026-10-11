"use client";

import Link from "next/link";

// Zelfstandige registratie staat uit: patiënten en medewerkers krijgen een
// account via een uitnodiging van hun praktijk (send-invite → generateLink).
// Zonder praktijk zou REVA zelf verwerkingsverantwoordelijke worden voor
// gezondheidsgegevens; dat valt buiten de scope van de eerste livegang.
// Let op: dit is alleen de UI-laag. De echte grens is de Supabase Auth-instelling
// "Allow new users to sign up" = uit, die ook nieuwe Google-logins tegenhoudt.
export default function RegisterPage() {
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
          Account via je praktijk
        </h1>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm mx-auto rounded-2xl p-6 sm:p-8 text-sm text-gray-600 leading-relaxed"
        style={{ background: "#ffffff", border: "1px solid #ece9e3", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
      >
        <p>
          REVA gebruik je samen met je fysiotherapeut. Je praktijk stuurt je een uitnodiging per e-mail;
          via de link daarin maak je je account aan.
        </p>
        <p className="mt-3">
          Geen uitnodiging ontvangen? Vraag je praktijk om je uit te nodigen voor REVA.
        </p>

        <p className="text-center text-xs text-gray-500 mt-6">
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
