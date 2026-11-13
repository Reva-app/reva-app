"use client";

import { useMemo, useRef, useState } from "react";
import { X, Upload, Download, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { parseCsv, parseDutchDate } from "@/lib/csv";
import { BLESSURE_TYPEN } from "@/lib/data";
import {
  createPortalPatient, invitePortalPatient,
  type PortalLocationOption, type PortalMember, type PortalPatient,
} from "@/lib/services/portalService";

type FieldKey = "firstName" | "lastName" | "email" | "phone" | "dateOfBirth" | "gender" | "injuryType" | "injuryDate" | "surgeryDate" | "therapist" | "location";

const FIELDS: { key: FieldKey; label: string; required?: boolean; synonyms: string[] }[] = [
  { key: "firstName", label: "Voornaam", required: true, synonyms: ["voornaam", "first name", "firstname", "roepnaam", "naam"] },
  { key: "lastName", label: "Achternaam", required: true, synonyms: ["achternaam", "last name", "lastname", "surname", "familienaam"] },
  { key: "email", label: "E-mailadres", synonyms: ["email", "e-mail", "e-mailadres", "emailadres", "mail"] },
  { key: "phone", label: "Telefoon", synonyms: ["telefoon", "telefoonnummer", "mobiel", "phone", "tel"] },
  { key: "dateOfBirth", label: "Geboortedatum", synonyms: ["geboortedatum", "geboren", "date of birth", "dob", "birthdate"] },
  { key: "gender", label: "Geslacht", synonyms: ["geslacht", "gender", "sekse"] },
  { key: "injuryType", label: "Blessure", synonyms: ["blessure", "blessuretype", "klacht", "diagnose", "injury"] },
  { key: "injuryDate", label: "Datum blessure", synonyms: ["datum blessure", "blessuredatum", "ontstaan", "injury date"] },
  { key: "surgeryDate", label: "Operatiedatum", synonyms: ["operatiedatum", "datum operatie", "operatie", "surgery date"] },
  { key: "therapist", label: "Behandelaar", synonyms: ["behandelaar", "therapeut", "fysiotherapeut", "fysio", "therapist"] },
  { key: "location", label: "Locatie", synonyms: ["locatie", "vestiging", "location"] },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

function autoMap(headers: string[]): Record<FieldKey, number> {
  const map = {} as Record<FieldKey, number>;
  for (const f of FIELDS) {
    const i = headers.findIndex((h) => f.synonyms.some((s) => norm(h) === norm(s)));
    const j = i >= 0 ? i : headers.findIndex((h) => f.synonyms.some((s) => norm(h).includes(norm(s))));
    map[f.key] = j;
  }
  return map;
}

function matchInjury(v: string): string {
  const n = norm(v);
  if (!n) return "";
  const exact = BLESSURE_TYPEN.find((b) => norm(b.value) === n || norm(b.label) === n);
  if (exact) return exact.value;
  const part = BLESSURE_TYPEN.find((b) => norm(b.label).includes(n) || n.includes(norm(b.value)));
  return part?.value ?? "";
}

function matchGender(v: string): string {
  const n = norm(v);
  if (["m", "man", "male", "heer", "dhr"].includes(n)) return "man";
  if (["v", "vrouw", "female", "f", "mevr", "mevrouw"].includes(n)) return "vrouw";
  return n ? "anders" : "";
}

interface RowCheck {
  index: number;
  firstName: string; lastName: string; email: string; phone: string; dateOfBirth: string; gender: string;
  injuryType: string; injuryDate: string; surgeryDate: string; therapistId: string | null; locationId: string | null;
  errors: string[]; warnings: string[]; duplicate: boolean;
}

const TEMPLATE = "voornaam;achternaam;email;telefoon;geboortedatum;geslacht;blessure;datum blessure;operatiedatum;behandelaar;locatie\nAnna;de Jong;anna@voorbeeld.nl;0612345678;14-03-1988;vrouw;Voorste kruisband (ACL) blessure;02-09-2026;20-09-2026;Sanne de Vries;Centrum\n";

/**
 * Patiënten importeren uit een CSV-bestand (bv. een export uit het oude
 * systeem): kolommen koppelen, controleren en in één keer aanmaken.
 * Optioneel krijgen patiënten met een e-mailadres meteen een uitnodiging.
 */
export function ImportPatientsModal({ organizationId, members, locations, existing, onClose, onDone }: {
  organizationId: string;
  members: PortalMember[];
  locations: PortalLocationOption[];
  existing: PortalPatient[];
  onClose: () => void;
  onDone: (imported: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Record<FieldKey, number> | null>(null);
  const [defaultTherapist, setDefaultTherapist] = useState("");
  const [defaultLocation, setDefaultLocation] = useState(locations[0]?.id ?? "");
  const [invite, setInvite] = useState(false);
  const [phase, setPhase] = useState<"pick" | "check" | "busy" | "done">("pick");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ imported: number; invited: number; failed: string[] } | null>(null);
  const [parseError, setParseError] = useState("");

  const therapists = members.filter((m) => m.membershipStatus === "active" && ["therapist", "organization_owner"].includes(m.roleKey));

  async function onFile(f: File) {
    setParseError("");
    const text = await f.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) { setParseError("Het bestand bevat geen gegevens. Zorg voor een kopregel en minstens één patiënt."); return; }
    if (parsed.length > 1001) { setParseError("Maximaal 1.000 patiënten per keer. Splits het bestand op."); return; }
    setRows(parsed);
    setFileName(f.name);
    setMapping(autoMap(parsed[0]));
    setPhase("check");
  }

  const checks: RowCheck[] = useMemo(() => {
    if (!rows || !mapping) return [];
    const get = (r: string[], k: FieldKey) => (mapping[k] >= 0 ? r[mapping[k]] ?? "" : "");
    const existingEmails = new Set(existing.map((p) => p.email?.toLowerCase()).filter(Boolean));
    const existingNames = new Set(existing.map((p) => `${norm(p.fullName ?? "")}|${p.dateOfBirth ?? ""}`));
    const seen = new Set<string>();
    return rows.slice(1).map((r, i) => {
      const errors: string[] = [], warnings: string[] = [];
      const firstName = get(r, "firstName").trim(), lastName = get(r, "lastName").trim();
      const email = get(r, "email").trim().toLowerCase();
      if (!firstName) errors.push("Voornaam ontbreekt");
      if (!lastName) errors.push("Achternaam ontbreekt");
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("E-mailadres klopt niet");
      const dates = (["dateOfBirth", "injuryDate", "surgeryDate"] as const).map((k) => {
        const raw = get(r, k);
        const v = parseDutchDate(raw);
        if (raw && !v) warnings.push(`${FIELDS.find((f) => f.key === k)!.label} niet herkend`);
        return v ?? "";
      });
      const injRaw = get(r, "injuryType");
      const injuryType = matchInjury(injRaw);
      if (injRaw && !injuryType) warnings.push("Blessure niet herkend");
      const thRaw = norm(get(r, "therapist"));
      const th = thRaw ? therapists.find((m) => norm(m.fullName ?? "") === thRaw || norm(m.email ?? "") === thRaw || norm(m.fullName ?? "").startsWith(thRaw)) : null;
      if (thRaw && !th) warnings.push("Behandelaar niet gevonden");
      const locRaw = norm(get(r, "location"));
      const loc = locRaw ? locations.find((l) => norm(l.name).includes(locRaw)) : null;
      if (locRaw && !loc) warnings.push("Locatie niet gevonden");
      const key = email || `${norm(`${firstName} ${lastName}`)}|${dates[0]}`;
      const duplicate = (email && existingEmails.has(email)) || existingNames.has(`${norm(`${firstName} ${lastName}`)}|${dates[0]}`) || seen.has(key);
      seen.add(key);
      return {
        index: i + 2, firstName, lastName, email, phone: get(r, "phone").trim(), dateOfBirth: dates[0], gender: matchGender(get(r, "gender")),
        injuryType, injuryDate: dates[1], surgeryDate: dates[2],
        therapistId: th?.userId ?? (defaultTherapist || null), locationId: loc?.id ?? (defaultLocation || null),
        errors, warnings, duplicate: !!duplicate,
      };
    });
  }, [rows, mapping, existing, therapists, locations, defaultTherapist, defaultLocation]);

  const importable = checks.filter((c) => c.errors.length === 0 && !c.duplicate);

  async function runImport() {
    setPhase("busy");
    let imported = 0, invited = 0;
    const failed: string[] = [];
    for (let i = 0; i < importable.length; i++) {
      const c = importable[i];
      const { id, error } = await createPortalPatient(organizationId, {
        firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone, dateOfBirth: c.dateOfBirth, gender: c.gender,
        locationId: c.locationId, therapistId: c.therapistId, surgeryDate: c.surgeryDate, injuryDate: c.injuryDate, injuryType: c.injuryType,
      });
      if (error || !id) failed.push(`Regel ${c.index} (${c.firstName} ${c.lastName}): ${error ?? "onbekende fout"}`);
      else {
        imported++;
        if (invite && c.email) {
          const res = await invitePortalPatient(id, organizationId, c.email);
          if (!res.error) invited++;
          else failed.push(`Regel ${c.index}: uitnodiging niet verstuurd (${res.error})`);
        }
      }
      setProgress(i + 1);
    }
    setResult({ imported, invited, failed });
    setPhase("done");
  }

  function downloadTemplate() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + TEMPLATE], { type: "text/csv;charset=utf-8" }));
    a.download = "reva-patienten-voorbeeld.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Modal onClose={phase === "busy" ? () => {} : onClose} maxWidth="max-w-4xl" dismissOnBackdropClick={phase !== "check"}>
      <Card padding="none">
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <CardHeader title="Patiënten importeren" subtitle={fileName ? `Uit ${fileName}` : "Uit een CSV-bestand, bijvoorbeeld een export van je huidige systeem"} />
            {phase !== "busy" && <button type="button" onClick={onClose} aria-label="Sluiten" className="relative tap-target text-subtle hover:text-gray-600 shrink-0 -mt-1"><X size={18} /></button>}
          </div>

          {phase === "pick" && (
            <>
              <button type="button" onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void onFile(f); }}
                className="w-full rounded-2xl border-2 border-dashed p-10 flex flex-col items-center gap-2 text-center hover:bg-[#faf9f7]" style={{ borderColor: "#d9d4cc" }}>
                <Upload size={24} style={{ color: "var(--brand-accent, #e8632a)" }} />
                <span className="text-sm font-medium text-gray-900">Kies een CSV-bestand of sleep het hierheen</span>
                <span className="text-xs text-gray-500">Excel: Opslaan als → CSV (puntkomma). Maximaal 1.000 patiënten per keer.</span>
              </button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }} />
              {parseError && <p className="text-sm" style={{ color: "#dc2626" }}>{parseError}</p>}
              <div className="rounded-xl p-4 text-sm text-gray-600" style={{ background: "#f8f7f4" }}>
                <p className="font-medium text-gray-800">Welke kolommen?</p>
                <p className="mt-1">Verplicht: voornaam en achternaam. Optioneel: e-mail, telefoon, geboortedatum, geslacht, blessure, datum blessure, operatiedatum, behandelaar en locatie. De kolomnamen mogen afwijken; je koppelt ze in de volgende stap.</p>
                <button type="button" onClick={downloadTemplate} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--brand-accent, #e8632a)" }}><Download size={14} /> Voorbeeldbestand downloaden</button>
              </div>
            </>
          )}

          {phase === "check" && rows && mapping && (
            <>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">1. Kolommen koppelen</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {FIELDS.map((f) => (
                    <Field key={f.key} label={`${f.label}${f.required ? " *" : ""}`}>
                      <Select value={mapping[f.key]} onChange={(e) => setMapping({ ...mapping, [f.key]: Number(e.target.value) })}>
                        <option value={-1}>Niet importeren</option>
                        {rows[0].map((h, i) => <option key={i} value={i}>{h || `Kolom ${i + 1}`}</option>)}
                      </Select>
                    </Field>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Behandelaar als die ontbreekt">
                  <Select value={defaultTherapist} onChange={(e) => setDefaultTherapist(e.target.value)}>
                    <option value="">Niet toewijzen</option>
                    {therapists.map((m) => <option key={m.userId} value={m.userId}>{m.fullName ?? m.email}</option>)}
                  </Select>
                </Field>
                <Field label="Locatie als die ontbreekt">
                  <Select value={defaultLocation} onChange={(e) => setDefaultLocation(e.target.value)}>
                    <option value="">Geen locatie</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </Select>
                </Field>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">2. Controleren</p>
                <div className="flex flex-wrap gap-2 text-xs mb-2">
                  <span className="rounded-full px-2.5 py-1 bg-green-50 text-green-700">{importable.length} klaar om te importeren</span>
                  {checks.some((c) => c.duplicate) && <span className="rounded-full px-2.5 py-1 bg-gray-100 text-gray-600">{checks.filter((c) => c.duplicate).length} bestaan al (overgeslagen)</span>}
                  {checks.some((c) => c.errors.length) && <span className="rounded-full px-2.5 py-1 bg-red-50 text-red-700">{checks.filter((c) => c.errors.length).length} met fouten (overgeslagen)</span>}
                </div>
                <div className="rounded-xl border max-h-72 overflow-auto" style={{ borderColor: "#e8e5df" }}>
                  <table className="w-full text-xs">
                    <thead className="sticky top-0" style={{ background: "#faf9f7" }}>
                      <tr className="text-left text-gray-500"><th className="px-3 py-2 font-medium">Regel</th><th className="px-3 py-2 font-medium">Naam</th><th className="px-3 py-2 font-medium">E-mail</th><th className="px-3 py-2 font-medium">Blessure</th><th className="px-3 py-2 font-medium">Behandelaar</th><th className="px-3 py-2 font-medium">Status</th></tr>
                    </thead>
                    <tbody>
                      {checks.slice(0, 200).map((c) => (
                        <tr key={c.index} className="border-t" style={{ borderColor: "#f0ede8" }}>
                          <td className="px-3 py-1.5 text-gray-400">{c.index}</td>
                          <td className="px-3 py-1.5 text-gray-900">{c.firstName} {c.lastName}</td>
                          <td className="px-3 py-1.5 text-gray-600">{c.email || "—"}</td>
                          <td className="px-3 py-1.5 text-gray-600">{BLESSURE_TYPEN.find((b) => b.value === c.injuryType)?.label ?? "—"}</td>
                          <td className="px-3 py-1.5 text-gray-600">{therapists.find((m) => m.userId === c.therapistId)?.fullName ?? "—"}</td>
                          <td className="px-3 py-1.5">
                            {c.errors.length ? <span className="inline-flex items-center gap-1 text-red-700"><XCircle size={12} /> {c.errors.join(", ")}</span>
                              : c.duplicate ? <span className="text-gray-500">Bestaat al</span>
                              : c.warnings.length ? <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle size={12} /> {c.warnings.join(", ")}</span>
                              : <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 size={12} /> Klaar</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {checks.length > 200 && <p className="text-xs text-gray-500 mt-1">De eerste 200 van {checks.length} regels worden getoond.</p>}
              </div>

              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="checkbox" className="rounded mt-0.5" checked={invite} onChange={(e) => setInvite(e.target.checked)} />
                <span>Patiënten met een e-mailadres meteen uitnodigen voor de app<span className="block text-xs text-gray-500">Laat dit uit als je ze liever later zelf uitnodigt, bijvoorbeeld bij de volgende afspraak.</span></span>
              </label>

              <div className="flex justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setRows(null); setMapping(null); setPhase("pick"); }}>Ander bestand</Button>
                <Button size="sm" onClick={runImport} disabled={importable.length === 0 || mapping.firstName < 0 || mapping.lastName < 0}>
                  {importable.length === 1 ? "1 patiënt importeren" : `${importable.length} patiënten importeren`}
                </Button>
              </div>
            </>
          )}

          {phase === "busy" && (
            <div className="py-8 text-center">
              <Loader2 size={24} className="animate-spin mx-auto" style={{ color: "var(--brand-accent, #e8632a)" }} />
              <p className="text-sm text-gray-700 mt-3">Bezig met importeren: {progress} van {importable.length}</p>
              <div className="mt-3 h-2 rounded-full max-w-sm mx-auto overflow-hidden" style={{ background: "#efece6" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(progress / Math.max(1, importable.length)) * 100}%`, background: "var(--brand-accent, #e8632a)" }} />
              </div>
              <p className="text-xs text-gray-500 mt-2">Sluit dit venster niet.</p>
            </div>
          )}

          {phase === "done" && result && (
            <div className="space-y-3">
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "#f0fdf4" }}>
                <CheckCircle2 size={20} className="text-green-700 shrink-0" />
                <p className="text-sm text-green-800">
                  {result.imported} {result.imported === 1 ? "patiënt" : "patiënten"} geïmporteerd{invite ? `, ${result.invited} uitgenodigd` : ""}.
                </p>
              </div>
              {result.failed.length > 0 && (
                <div className="rounded-xl p-4 text-sm" style={{ background: "#fff7ed" }}>
                  <p className="font-medium text-amber-800">Niet gelukt ({result.failed.length})</p>
                  <ul className="mt-1 text-amber-800 text-xs space-y-0.5 max-h-40 overflow-auto">{result.failed.map((f, i) => <li key={i}>{f}</li>)}</ul>
                </div>
              )}
              <div className="flex justify-end"><Button size="sm" onClick={() => onDone(result.imported)}>Klaar</Button></div>
            </div>
          )}
        </div>
      </Card>
    </Modal>
  );
}
