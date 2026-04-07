"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import {
  User, Bell, Download, Check, Plus, X, AlertCircle,
  MessageSquare, Camera, Lock, Eye, EyeOff, Trash2,
} from "lucide-react";
import { useAppData } from "@/lib/store";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { getMijlpalenVoorBlessure } from "@/lib/mijlpalenTemplates";

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className="relative shrink-0 w-10 h-6 rounded-full transition-colors"
      style={{ background: enabled ? "#e8632a" : "#e2e0db" }}
    >
      <span
        className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
        style={{ left: enabled ? "22px" : "4px", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
      />
    </button>
  );
}

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
      {children}
      {optional && (
        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full" style={{ background: "#f3f0eb", color: "#a8a29e" }}>
          Optioneel
        </span>
      )}
    </label>
  );
}

function TextInput({
  value, onChange, placeholder, type = "text", disabled,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none transition-colors disabled:opacity-50"
      style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
    />
  );
}

function SelectInput({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none appearance-none"
      style={{
        borderColor: "#e8e5df",
        background: "#f8f7f4",
        color: value ? "#1a1a1a" : "#9ca3af",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 14px center",
        paddingRight: "36px",
      }}
    >
      {children}
    </select>
  );
}

function Toast({ message, type = "success", onDismiss }: { message: string; type?: "success" | "error"; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium"
      style={{
        background: type === "success" ? "#1c1c1e" : "#dc2626",
        color: "#ffffff",
        minWidth: "220px",
      }}
    >
      <Check size={15} className="shrink-0" />
      {message}
    </div>
  );
}

// ─── Account verwijderen modal ────────────────────────────────────────────────

function AccountVerwijderenModal({ onClose, onConfirm, loading }: {
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const [stap, setStap] = useState<1 | 2>(1);
  const [bevestigTekst, setBevestigTekst] = useState("");
  const bevestigdCorrect = bevestigTekst.trim().toUpperCase() === "VERWIJDER";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div
        className="relative w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-2xl"
        style={{ background: "#ffffff" }}
      >
        {/* Sluit knop */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <X size={16} style={{ color: "#6b6560" }} />
        </button>

        {stap === 1 && (
          <>
            {/* Waarschuwing icoon */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "#fef2f2" }}
            >
              <Trash2 size={22} style={{ color: "#dc2626" }} />
            </div>

            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1a1a1a" }}>
              Account permanent verwijderen
            </h2>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "#6b6560" }}>
              Dit verwijdert <strong style={{ color: "#1a1a1a" }}>alle</strong> gegevens die aan jouw account zijn gekoppeld — inclusief:
            </p>

            <ul className="space-y-2 mb-6">
              {[
                "Jouw profiel en herstelgegevens",
                "Alle afspraken en check-ins",
                "Trainingen, oefeningen en schema\'s",
                "Medicatie en medicijnoverzichten",
                "Dossier, foto\'s en contactpersonen",
                "Doelen en mijlpalen",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: "#6b6560" }}>
                  <span
                    className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "#fef2f2" }}
                  >
                    <X size={9} style={{ color: "#dc2626" }} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div
              className="rounded-xl p-3.5 flex gap-2.5 items-start mb-6"
              style={{ background: "#fff8f5", border: "1px solid #fcd9c8" }}
            >
              <AlertCircle size={15} className="shrink-0 mt-0.5" style={{ color: "#e8632a" }} />
              <p className="text-xs leading-relaxed" style={{ color: "#6b6560" }}>
                <strong style={{ color: "#1a1a1a" }}>Dit kan niet ongedaan worden gemaakt.</strong> Alle data wordt permanent en onomkeerbaar verwijderd uit onze systemen.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>
                Annuleren
              </Button>
              <button
                onClick={() => setStap(2)}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                style={{ background: "#dc2626", color: "#ffffff" }}
              >
                Verder gaan
              </button>
            </div>
          </>
        )}

        {stap === 2 && (
          <>
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "#fef2f2" }}
            >
              <Trash2 size={22} style={{ color: "#dc2626" }} />
            </div>

            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1a1a1a" }}>
              Bevestig verwijdering
            </h2>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "#6b6560" }}>
              Typ{" "}
              <span
                className="font-mono font-bold px-1.5 py-0.5 rounded-md"
                style={{ background: "#f3f0eb", color: "#1a1a1a" }}
              >
                VERWIJDER
              </span>{" "}
              hieronder om te bevestigen dat je je account permanent wil verwijderen.
            </p>

            <input
              type="text"
              value={bevestigTekst}
              onChange={(e) => setBevestigTekst(e.target.value)}
              placeholder="Type VERWIJDER om te bevestigen"
              autoFocus
              disabled={loading}
              className="w-full text-sm rounded-xl border px-4 py-2.5 mb-5 focus:outline-none transition-colors font-mono disabled:opacity-50"
              style={{
                borderColor: bevestigdCorrect ? "#dc2626" : "#e8e5df",
                background: "#f8f7f4",
                color: "#1a1a1a",
              }}
            />

            <div className="flex gap-3">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setStap(1)} disabled={loading}>
                Terug
              </Button>
              <button
                onClick={onConfirm}
                disabled={!bevestigdCorrect || loading}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
                style={{
                  background: bevestigdCorrect && !loading ? "#dc2626" : "#f3f0eb",
                  color: bevestigdCorrect && !loading ? "#ffffff" : "#a8a29e",
                  cursor: bevestigdCorrect && !loading ? "pointer" : "not-allowed",
                }}
              >
                {loading ? "Verwijderen..." : "Account definitief verwijderen"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const BLESSURE_TYPEN = [
  { value: "acl", label: "Voorste kruisband (ACL) blessure" },
  { value: "meniscus", label: "Meniscus blessure" },
  { value: "enkel", label: "Enkelverstuiking" },
  { value: "spier", label: "Spierverrekking" },
  { value: "hamstring", label: "Hamstring blessure" },
  { value: "schouder", label: "Schouderblessure" },
  { value: "knieband", label: "Knieband blessure" },
  { value: "pees", label: "Peesontsteking" },
  { value: "rug", label: "Rugblessure" },
  { value: "achilles", label: "Achillespees blessure" },
  { value: "patella", label: "Gescheurde kniepees" },
  { value: "anders", label: "Anders" },
];

const ZORGVERZEKERAARS = [
  { value: "zilverenkruis", label: "Zilveren Kruis" },
  { value: "vgz", label: "VGZ" },
  { value: "cz", label: "CZ" },
  { value: "menzis", label: "Menzis" },
  { value: "fbto", label: "FBTO" },
  { value: "ohra", label: "OHRA" },
  { value: "asr", label: "a.s.r." },
  { value: "dsw", label: "DSW" },
  { value: "unive", label: "Univé" },
  { value: "izz", label: "IZZ" },
  { value: "anderzorg", label: "Anderzorg" },
  { value: "zorgenzekerheid", label: "Zorg en Zekerheid" },
  { value: "anders", label: "Anders" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InstellingenPage() {
  const { profile, updateProfile, hydrated, notificationSettings, updateNotificationSettings, setupCompleted, markSetupDone, mijlpalen, addMijlpaal } = useAppData();
  const router = useRouter();

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; type?: "success" | "error" } | null>(null);
  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
  }

  // ── Profiel form state ─────────────────────────────────────────────────────
  const [naam, setNaam] = useState(profile.naam);
  const [email, setEmail] = useState(profile.email ?? "");
  const [geboortedatum, setGeboortedatum] = useState(profile.geboortedatum);

  // ── Herstelgegevens ────────────────────────────────────────────────────────
  const [blessureDatum, setBlessureDatum] = useState(profile.blessureDatum);
  const [operatieDatum, setOperatieDatum] = useState(profile.operatieDatum);
  const [blessureType, setBlessureType] = useState(profile.blessureType);
  const [blessureTypeAnders, setBlessureTypeAnders] = useState(profile.blessureTypeAnders);
  const [situatieOmschrijving, setSituatieOmschrijving] = useState(profile.situatieOmschrijving);
  const [zorgverzekeraar, setZorgverzekeraar] = useState(profile.zorgverzekeraar);
  const [zorgverzekeraaarAnders, setZorgverzekeraaarAnders] = useState(profile.zorgverzekeraaarAnders);
  const [polisnummer, setPolisnummer] = useState(profile.polisnummer);
  const [aanvullendeVerzekeringen, setAanvullendeVerzekeringen] = useState<string[]>(
    profile.aanvullendeVerzekeringen?.length ? profile.aanvullendeVerzekeringen : ["", ""]
  );
  const [aantalFysio, setAantalFysio] = useState(profile.aantalFysio);

  // ── Profielfoto ────────────────────────────────────────────────────────────
  const fotoInputRef = useRef<HTMLInputElement>(null);

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      updateProfile({ profielfoto: dataUrl });
      showToast("Profielfoto opgeslagen");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleVerwijderFoto() {
    updateProfile({ profielfoto: "" });
    showToast("Profielfoto verwijderd");
  }

  // ── Re-sync after hydration ────────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    setNaam(profile.naam);
    setEmail(profile.email ?? "");
    setGeboortedatum(profile.geboortedatum);
    setBlessureDatum(profile.blessureDatum);
    setOperatieDatum(profile.operatieDatum);
    setBlessureType(profile.blessureType);
    setBlessureTypeAnders(profile.blessureTypeAnders);
    setSituatieOmschrijving(profile.situatieOmschrijving);
    setZorgverzekeraar(profile.zorgverzekeraar);
    setZorgverzekeraaarAnders(profile.zorgverzekeraaarAnders);
    setPolisnummer(profile.polisnummer);
    setAanvullendeVerzekeringen(
      profile.aanvullendeVerzekeringen?.length ? profile.aanvullendeVerzekeringen : ["", ""]
    );
    setAantalFysio(profile.aantalFysio);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // ── E-mail validation ──────────────────────────────────────────────────────
  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // ── Dirty detection — account ──────────────────────────────────────────────
  const isAccountDirty =
    naam !== profile.naam ||
    email !== (profile.email ?? "") ||
    geboortedatum !== profile.geboortedatum;

  // ── Dirty detection — herstelgegevens ─────────────────────────────────────
  const isHerstelDirty =
    blessureDatum !== profile.blessureDatum ||
    operatieDatum !== profile.operatieDatum ||
    blessureType !== profile.blessureType ||
    blessureTypeAnders !== profile.blessureTypeAnders ||
    situatieOmschrijving !== profile.situatieOmschrijving ||
    zorgverzekeraar !== profile.zorgverzekeraar ||
    zorgverzekeraaarAnders !== profile.zorgverzekeraaarAnders ||
    polisnummer !== profile.polisnummer ||
    aantalFysio !== profile.aantalFysio ||
    JSON.stringify(aanvullendeVerzekeringen) !==
      JSON.stringify(profile.aanvullendeVerzekeringen?.length ? profile.aanvullendeVerzekeringen : ["", ""]);

  // ── Save account ───────────────────────────────────────────────────────────
  async function handleSaveAccount() {
    if (!emailValid) { showToast("Voer een geldig e-mailadres in", "error"); return; }
    const { error } = await updateProfile({ naam, email, geboortedatum });
    if (error) { showToast("Opslaan mislukt: " + error, "error"); return; }
    if (!setupCompleted) markSetupDone();
    showToast("Accountgegevens opgeslagen");
  }

  // ── Save herstelgegevens ───────────────────────────────────────────────────
  async function handleSaveHerstel() {
    const isFirstBlessureType = !profile.blessureType && blessureType;
    const shouldSeedMijlpalen = isFirstBlessureType && mijlpalen.length === 0;

    const { error } = await updateProfile({
      blessureDatum, operatieDatum, blessureType, blessureTypeAnders,
      situatieOmschrijving, zorgverzekeraar, zorgverzekeraaarAnders,
      polisnummer, aanvullendeVerzekeringen, aantalFysio,
    });
    if (error) { showToast("Opslaan mislukt: " + error, "error"); return; }
    if (!setupCompleted) markSetupDone();

    // Seed blessure-specific milestones on first setup
    if (shouldSeedMijlpalen) {
      const templates = getMijlpalenVoorBlessure(blessureType);
      for (const m of templates) {
        addMijlpaal(m);
      }
      showToast("Herstelgegevens opgeslagen — mijlpalen aangemaakt");
    } else {
      showToast("Herstelgegevens opgeslagen");
    }
  }

  // ── Aanvullende verzekeringen helpers ──────────────────────────────────────
  function setVerzekering(index: number, value: string) {
    setAanvullendeVerzekeringen((prev) => prev.map((v, i) => (i === index ? value : v)));
  }
  function addVerzekering() { setAanvullendeVerzekeringen((prev) => [...prev, ""]); }
  function removeVerzekering(index: number) {
    if (aanvullendeVerzekeringen.length <= 1) return;
    setAanvullendeVerzekeringen((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Feedback ───────────────────────────────────────────────────────────────
  const [fbCategorie, setFbCategorie] = useState("");
  const [fbOnderwerp, setFbOnderwerp] = useState("");
  const [fbBericht, setFbBericht] = useState("");
  const [fbSending, setFbSending] = useState(false);

  async function handleFeedback() {
    if (!fbOnderwerp.trim() || !fbBericht.trim()) {
      showToast("Vul een onderwerp en bericht in", "error");
      return;
    }
    setFbSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categorie: fbCategorie,
          onderwerp: fbOnderwerp,
          bericht: fbBericht,
          naam: profile.naam,
          email: profile.email,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        showToast("Versturen mislukt: " + (json.error ?? "Probeer het later opnieuw"), "error");
        return;
      }
      setFbOnderwerp("");
      setFbBericht("");
      setFbCategorie("");
      showToast("Feedback verstuurd — bedankt!");
    } catch {
      showToast("Versturen mislukt: netwerkfout", "error");
    } finally {
      setFbSending(false);
    }
  }

  // ── Wachtwoord wijzigen ────────────────────────────────────────────────────
  const isGmail = profile.authProvider === "google" || profile.authProvider === "gmail";
  const [huidigWw, setHuidigWw] = useState("");
  const [nieuwWw, setNieuwWw] = useState("");
  const [herhalingWw, setHerhalingWw] = useState("");
  const [showWw, setShowWw] = useState(false);
  const [wwSaved, setWwSaved] = useState(false);
  const [wwLoading, setWwLoading] = useState(false);

  async function handleWachtwoord() {
    if (!huidigWw || !nieuwWw || !herhalingWw) { showToast("Vul alle wachtwoordvelden in", "error"); return; }
    if (nieuwWw !== herhalingWw) { showToast("Nieuwe wachtwoorden komen niet overeen", "error"); return; }
    if (nieuwWw.length < 8) { showToast("Wachtwoord moet minimaal 8 tekens zijn", "error"); return; }

    // Re-authenticate with current password before updating
    const supabase = createClient();
    setWwLoading(true);

    // Verify current password by signing in first
    const { data: sessionData } = await supabase.auth.getSession();
    const userEmail = sessionData.session?.user?.email;

    if (userEmail) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: huidigWw,
      });
      if (signInError) {
        setWwLoading(false);
        showToast("Huidig wachtwoord is onjuist", "error");
        return;
      }
    }

    const { error } = await supabase.auth.updateUser({ password: nieuwWw });
    setWwLoading(false);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    setHuidigWw(""); setNieuwWw(""); setHerhalingWw("");
    setWwSaved(true);
    setTimeout(() => setWwSaved(false), 2500);
    showToast("Wachtwoord gewijzigd");
  }

  // ── Account verwijderen ────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/delete-account", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || json.error) {
        showToast("Verwijderen mislukt: " + (json.error ?? "Onbekende fout"), "error");
        setDeleteLoading(false);
        return;
      }
      // Sign out client-side after successful deletion
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/auth/login");
    } catch {
      showToast("Verwijderen mislukt: netwerkfout", "error");
      setDeleteLoading(false);
    }
  }

  // ── Initials helper ────────────────────────────────────────────────────────
  const initials = naam.split(" ").filter(Boolean).map((w) => w[0].toUpperCase()).slice(0, 2).join("");

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
      {showDeleteModal && (
        <AccountVerwijderenModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
          loading={deleteLoading}
        />
      )}

      <SectionHeader title="Instellingen" subtitle="Beheer jouw profiel en voorkeuren" />

      {/* ── Onboarding welkomstblok (alleen bij eerste setup) ─────────── */}
      {!setupCompleted && (
        <div
          className="rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row gap-4"
          style={{ background: "#fff8f5", border: "1.5px solid #fcd9c8" }}
        >
          <div
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "#e8632a" }}
          >
            <span className="text-white font-bold text-base">R</span>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>
              Welkom bij REVA — vul eerst je blessuregegevens in
            </p>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: "#6b6560" }}>
              Zodat jouw dashboard en voortgang persoonlijk worden ingericht, vragen we je om hieronder je herstelgegevens in te vullen. Dit duurt slechts een minuut en helpt REVA direct waardevolle inzichten te geven.
            </p>
          </div>
        </div>
      )}

      {/* ── 1. Herstelgegevens ────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Herstelgegevens"
          subtitle="Jouw blessure en zorgverzekering"
        />
        <div className="space-y-4">
          {/* Datum blessure + operatie */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Datum blessure</FieldLabel>
              <DatePicker value={blessureDatum} onChange={setBlessureDatum} placeholder="Kies een datum" />
            </div>
            <div>
              <FieldLabel optional>Datum operatie</FieldLabel>
              <DatePicker value={operatieDatum} onChange={setOperatieDatum} placeholder="Niet van toepassing" />
              {operatieDatum ? (
                <button type="button" onClick={() => setOperatieDatum("")}
                  className="mt-1.5 text-[11px] font-semibold hover:opacity-75 transition-opacity cursor-pointer"
                  style={{ color: "#e8632a" }}>
                  Datum wissen
                </button>
              ) : (
                <p className="text-[11px] text-gray-400 mt-1.5 ml-0.5">Alleen invullen als je geopereerd bent.</p>
              )}
            </div>
          </div>

          {/* Blessure type */}
          <div>
            <FieldLabel>Blessure type</FieldLabel>
            <SelectInput value={blessureType} onChange={setBlessureType}>
              <option value="" disabled>Kies jouw blessure type</option>
              {BLESSURE_TYPEN.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </SelectInput>
          </div>
          {blessureType === "anders" && (
            <div className="rounded-xl p-3 border" style={{ background: "#faf9f7", borderColor: "#ece9e3" }}>
              <FieldLabel>Vul jouw blessure in</FieldLabel>
              <TextInput value={blessureTypeAnders} onChange={setBlessureTypeAnders} placeholder="Bijvoorbeeld: heupblessure" />
            </div>
          )}

          {/* Situatie omschrijving */}
          <div>
            <FieldLabel optional>Situatie omschrijving</FieldLabel>
            <textarea
              value={situatieOmschrijving}
              onChange={(e) => setSituatieOmschrijving(e.target.value)}
              placeholder="Beschrijf kort jouw blessure, situatie of hersteltraject..."
              rows={4}
              className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none transition-colors resize-none"
              style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
            />
          </div>

          {/* Zorgverzekering divider */}
          <div className="pt-1 pb-1" style={{ borderTop: "1px solid #f0ede8" }}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-2">Zorgverzekering</p>
          </div>

          <div>
            <FieldLabel>Zorgverzekeraar</FieldLabel>
            <SelectInput value={zorgverzekeraar} onChange={setZorgverzekeraar}>
              <option value="" disabled>Kies jouw zorgverzekeraar</option>
              {ZORGVERZEKERAARS.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
            </SelectInput>
          </div>
          {zorgverzekeraar === "anders" && (
            <div className="rounded-xl p-3 border" style={{ background: "#faf9f7", borderColor: "#ece9e3" }}>
              <FieldLabel>Vul jouw zorgverzekeraar in</FieldLabel>
              <TextInput value={zorgverzekeraaarAnders} onChange={setZorgverzekeraaarAnders} placeholder="Naam van jouw verzekeraar" />
            </div>
          )}

          <div className="sm:w-1/2 sm:pr-2">
            <FieldLabel optional>Polisnummer</FieldLabel>
            <TextInput value={polisnummer} onChange={setPolisnummer} placeholder="Voer je polisnummer in" />
          </div>

          <div>
            <FieldLabel optional>Aanvullende verzekeringen</FieldLabel>
            <div className="space-y-2">
              {aanvullendeVerzekeringen.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1">
                    <TextInput value={v} onChange={(val) => setVerzekering(i, val)} placeholder="Bijv. Aanvullend 2 sterren" />
                  </div>
                  {aanvullendeVerzekeringen.length > 1 && (
                    <button type="button" onClick={() => removeVerzekering(i)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100 shrink-0"
                      style={{ color: "#9ca3af" }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addVerzekering}
              className="mt-2 flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-70"
              style={{ color: "#e8632a" }}>
              <Plus size={13} /> Verzekering toevoegen
            </button>
          </div>

          <div className="sm:w-1/2 sm:pr-2">
            <FieldLabel optional>Aantal fysio behandelingen</FieldLabel>
            <TextInput value={aantalFysio} onChange={setAantalFysio} placeholder="Bijvoorbeeld: 9" type="number" />
            <p className="text-[11px] text-gray-400 mt-1.5 ml-0.5">Het maximaal vergoed aantal behandelingen via jouw polis.</p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button
              size="sm"
              onClick={handleSaveHerstel}
              style={isHerstelDirty ? { background: "#e8632a", color: "#ffffff", boxShadow: "0 0 0 3px rgba(232,99,42,0.15)" } : undefined}
            >
              Opslaan
            </Button>
            {isHerstelDirty && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "#9ca3af" }}>
                <AlertCircle size={12} />
                Niet-opgeslagen wijzigingen
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* ── 2. Account & Profiel ──────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Account & Profiel"
          subtitle="Jouw persoonlijke gegevens"
          action={<User size={16} className="text-gray-400" />}
        />
        <div className="space-y-4">

          {/* Profielfoto */}
          <div>
            <FieldLabel optional>Profielfoto</FieldLabel>
            <div className="flex items-center gap-4">
              {/* Avatar preview */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                style={{ background: profile.profielfoto ? "transparent" : "#e8632a" }}
              >
                {hydrated && profile.profielfoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.profielfoto} alt="Profielfoto" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-lg">{hydrated ? initials : ""}</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFotoChange}
                />
                <button
                  type="button"
                  onClick={() => fotoInputRef.current?.click()}
                  className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl border transition-colors hover:bg-gray-50"
                  style={{ borderColor: "#e8e5df", color: "#1a1a1a" }}
                >
                  <Camera size={14} />
                  {profile.profielfoto ? "Foto wijzigen" : "Foto uploaden"}
                </button>
                {hydrated && profile.profielfoto && (
                  <button
                    type="button"
                    onClick={handleVerwijderFoto}
                    className="text-xs font-medium transition-opacity hover:opacity-70 text-left"
                    style={{ color: "#e8632a" }}
                  >
                    Foto verwijderen
                  </button>
                )}
                <p className="text-[11px] text-gray-400">JPG of PNG · max 5 MB</p>
              </div>
            </div>
          </div>

          {/* Naam */}
          <div>
            <FieldLabel>Naam</FieldLabel>
            <TextInput value={naam} onChange={setNaam} placeholder="Jouw volledige naam" />
          </div>

          {/* E-mailadres */}
          <div>
            <FieldLabel optional>E-mailadres</FieldLabel>
            <TextInput
              value={email}
              onChange={setEmail}
              type="email"
              placeholder="jouw@emailadres.nl"
            />
            {email && !emailValid && (
              <p className="text-[11px] mt-1 ml-0.5" style={{ color: "#dc2626" }}>
                Voer een geldig e-mailadres in
              </p>
            )}
            <p className="text-[11px] text-gray-400 mt-1.5 ml-0.5">
              Voorbereiding op accountkoppeling en inloggen.
            </p>
          </div>

          {/* Geboortedatum */}
          <div>
            <FieldLabel optional>Geboortedatum</FieldLabel>
            <DatePicker value={geboortedatum} onChange={setGeboortedatum} placeholder="Kies jouw geboortedatum" minYear={1930} maxYear={new Date().getFullYear()} />
          </div>

          {/* Save row */}
          <div className="flex items-center gap-3 pt-1">
            <Button
              size="sm"
              onClick={handleSaveAccount}
              style={isAccountDirty ? { background: "#e8632a", color: "#ffffff", boxShadow: "0 0 0 3px rgba(232,99,42,0.15)" } : undefined}
            >
              Opslaan
            </Button>
            {isAccountDirty && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "#9ca3af" }}>
                <AlertCircle size={12} />
                Niet-opgeslagen wijzigingen
              </span>
            )}
          </div>

          {/* Wachtwoord wijzigen — alleen voor niet-Gmail accounts */}
          {!isGmail && (
            <>
              <div className="pt-2 pb-1" style={{ borderTop: "1px solid #f0ede8" }}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-2">
                  Wachtwoord wijzigen
                </p>
              </div>
              <div className="space-y-3">
                <div>
                  <FieldLabel>Huidig wachtwoord</FieldLabel>
                  <div className="relative">
                    <input
                      type={showWw ? "text" : "password"}
                      value={huidigWw}
                      onChange={(e) => setHuidigWw(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-sm rounded-xl border px-4 py-2.5 pr-10 focus:outline-none transition-colors"
                      style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
                    />
                    <button type="button" onClick={() => setShowWw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showWw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <FieldLabel>Nieuw wachtwoord</FieldLabel>
                  <TextInput value={nieuwWw} onChange={setNieuwWw} type="password" placeholder="Minimaal 8 tekens" />
                </div>
                <div>
                  <FieldLabel>Herhaal nieuw wachtwoord</FieldLabel>
                  <TextInput value={herhalingWw} onChange={setHerhalingWw} type="password" placeholder="Herhaal nieuw wachtwoord" />
                </div>
                {nieuwWw && herhalingWw && nieuwWw !== herhalingWw && (
                  <p className="text-[11px]" style={{ color: "#dc2626" }}>Wachtwoorden komen niet overeen</p>
                )}
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="secondary" onClick={handleWachtwoord} disabled={wwLoading}>
                    <Lock size={13} /> {wwLoading ? "Bezig…" : "Wachtwoord wijzigen"}
                  </Button>
                  {wwSaved && (
                    <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#16a34a" }}>
                      <Check size={13} /> Gewijzigd
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* ── 3. Meldingen ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Meldingen"
          subtitle="Kies welke meldingen je wilt ontvangen"
          action={<Bell size={16} className="text-gray-400" />}
        />
        <div className="space-y-5">
          {[
            { key: "checkin" as const,   label: "Check-in herinnering",      desc: "Dagelijkse herinnering om jouw check-in in te vullen" },
            { key: "afspraken" as const, label: "Afspraken",                 desc: "24 uur voor iedere geplande afspraak" },
            { key: "medicatie" as const, label: "Medicatie",                 desc: "Op ingestelde tijden van jouw medicatieschema" },
            { key: "training" as const,  label: "Training",                  desc: "Herinnering op geplande trainingsdagen" },
            { key: "foto" as const,      label: "Foto updates",              desc: "Herinnering om wekelijks een voortgangsfoto te maken" },
            { key: "mijlpalen" as const, label: "Mijlpalen & voortgang",     desc: "Meldingen bij behaalde mijlpalen en coach updates" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <Toggle
                enabled={notificationSettings[key]}
                onChange={(v) => {
                  updateNotificationSettings({ [key]: v }).then(({ error }) => {
                    if (error) showToast("Opslaan mislukt: " + error, "error");
                  });
                }}
              />
            </div>
          ))}

          {/* Check-in tijd — alleen tonen als check-in aan staat */}
          {notificationSettings.checkin && (
            <div
              className="rounded-xl p-3 border space-y-2"
              style={{ background: "#faf9f7", borderColor: "#ece9e3" }}
            >
              <FieldLabel>Tijdstip check-in herinnering</FieldLabel>
              <div className="max-w-[180px]">
                <TimePicker
                  value={notificationSettings.checkinTijd}
                  onChange={(v) => {
                    updateNotificationSettings({ checkinTijd: v }).then(({ error }) => {
                      if (error) showToast("Opslaan mislukt: " + error, "error");
                    });
                  }}
                  placeholder="Kies een tijdstip"
                />
              </div>
              <p className="text-[11px] text-gray-400">
                Elke dag ontvang je een herinnering op dit tijdstip.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* ── 4. Feedback ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Feedback"
          subtitle="Deel jouw ervaring of meld een probleem"
          action={<MessageSquare size={16} className="text-gray-400" />}
        />
        <div className="space-y-4">
          <div>
            <FieldLabel optional>Categorie</FieldLabel>
            <SelectInput value={fbCategorie} onChange={setFbCategorie}>
              <option value="">Kies een categorie</option>
              <option value="bug">Bug</option>
              <option value="idee">Idee</option>
              <option value="vraag">Vraag</option>
              <option value="overig">Overig</option>
            </SelectInput>
          </div>
          <div>
            <FieldLabel>Onderwerp</FieldLabel>
            <TextInput value={fbOnderwerp} onChange={setFbOnderwerp} placeholder="Waar gaat jouw feedback over?" />
          </div>
          <div>
            <FieldLabel>Bericht</FieldLabel>
            <textarea
              value={fbBericht}
              onChange={(e) => setFbBericht(e.target.value)}
              placeholder="Beschrijf jouw feedback zo duidelijk mogelijk..."
              rows={4}
              className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none transition-colors resize-none"
              style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
            />
          </div>
          <div className="pt-1">
            <Button size="sm" onClick={handleFeedback} disabled={fbSending}>
              {fbSending ? "Versturen..." : "Verstuur feedback"}
            </Button>
            <p className="text-[11px] text-gray-400 mt-2">Wordt verstuurd naar info@reva-app.nl</p>
          </div>
        </div>
      </Card>

      {/* ── 5. Jouw data ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Jouw data"
          subtitle="Exporteer of verwijder jouw hersteldata"
        />
        <div className="flex gap-3 flex-wrap">
          <Button variant="secondary" size="sm">
            <Download size={14} /> Data exporteren
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
            <Trash2 size={14} /> Account verwijderen
          </Button>
        </div>
      </Card>

      {/* App info */}
      <div className="text-center pt-2 pb-6 space-y-1">
        <p className="text-xs" style={{ color: "#c4bfb7" }}>REVA Herstel Dashboard · Versie 0.1.0</p>
        <p className="text-xs" style={{ color: "#c4bfb7" }}>Gebouwd voor persoonlijk gebruik. Geen medisch advies.</p>
        <p className="text-xs" style={{ color: "#c4bfb7" }}>
          <span
            className="underline underline-offset-2 cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => showToast("Disclaimer en algemene voorwaarden komen binnenkort beschikbaar.")}
          >
            Disclaimer
          </span>
          {" · "}
          <span
            className="underline underline-offset-2 cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => showToast("Disclaimer en algemene voorwaarden komen binnenkort beschikbaar.")}
          >
            Algemene voorwaarden
          </span>
          {" · "}
          <span
            className="underline underline-offset-2 cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => showToast("Disclaimer en algemene voorwaarden komen binnenkort beschikbaar.")}
          >
            Privacybeleid
          </span>
        </p>
      </div>
    </div>
  );
}
