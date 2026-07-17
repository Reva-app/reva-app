"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, MapPin, HeartPulse, Activity,
  MessageSquare, Camera, Loader2, Check, UserPlus,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { DatePicker } from "@/components/ui/DatePicker";
import { formatDate } from "@/lib/data";
import { orgStatusBadge } from "../page";
import {
  loadAdminOrganizationDetail, updateAdminOrganization, uploadOrganizationLogo,
  loadAdminOrgLocations, loadAdminOrgMembers, loadAdminOrgPatientStats, loadAdminOrgUsage,
  loadAdminRoles, addAdminOrgMember,
  type AdminOrganizationDetail, type AdminOrgLocation, type AdminOrgMember,
  type AdminOrgPatientStats, type AdminOrgUsage, type AdminRoleOption,
} from "@/lib/services/adminService";

const inputStyle = {
  borderColor: "#e8e5df",
  background: "#f8f7f4",
  color: "#1a1a1a",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

function TextField({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none transition-colors"
        style={inputStyle}
      />
    </div>
  );
}

const ROLE_ORDER = [
  "organization_owner", "organization_admin", "finance",
  "location_manager", "therapist", "assistant", "reception",
];

function roleBadgeVariant(roleKey: string): "accent" | "blue" | "purple" | "default" {
  if (roleKey === "organization_owner") return "accent";
  if (roleKey === "organization_admin" || roleKey === "finance") return "purple";
  if (roleKey === "location_manager") return "blue";
  return "default";
}

export default function AdminOrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [org, setOrg] = useState<AdminOrganizationDetail | null>(null);
  const [locations, setLocations] = useState<AdminOrgLocation[]>([]);
  const [members, setMembers] = useState<AdminOrgMember[]>([]);
  const [patientStats, setPatientStats] = useState<AdminOrgPatientStats | null>(null);
  const [usage, setUsage] = useState<AdminOrgUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [roles, setRoles] = useState<AdminRoleOption[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRoleId, setMemberRoleId] = useState("");
  const [memberLocationId, setMemberLocationId] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadAdminOrganizationDetail(orgId),
      loadAdminOrgLocations(orgId),
      loadAdminOrgMembers(orgId),
      loadAdminOrgPatientStats(orgId),
      loadAdminOrgUsage(orgId),
      loadAdminRoles(),
    ]).then(([detail, locs, mems, pStats, use, roleOptions]) => {
      if (cancelled) return;
      setOrg(detail);
      setLocations(locs);
      setMembers(mems);
      setPatientStats(pStats);
      setUsage(use);
      setRoles(roleOptions);
      if (roleOptions.length > 0) setMemberRoleId(roleOptions[0].id);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!memberEmail.trim() || !memberRoleId) {
      setAddMemberError("Vul een e-mailadres in en kies een rol");
      return;
    }
    setAddingMember(true);
    setAddMemberError("");
    const { error } = await addAdminOrgMember(orgId, memberEmail.trim(), memberRoleId, memberLocationId || null);
    setAddingMember(false);
    if (error) {
      setAddMemberError(error);
      return;
    }
    setMemberEmail("");
    setMemberLocationId("");
    setShowAddMember(false);
    const updatedMembers = await loadAdminOrgMembers(orgId);
    setMembers(updatedMembers);
  }

  async function handleSave() {
    if (!org) return;
    setSaving(true);
    setSaved(false);
    const { error } = await updateAdminOrganization(orgId, {
      name: org.name,
      status: org.status,
      kvkNumber: org.kvkNumber,
      btwNumber: org.btwNumber,
      website: org.website,
      contactName: org.contactName,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      address: org.address,
      supportNotes: org.supportNotes,
      lastContactAt: org.lastContactAt,
      maxLocations: org.maxLocations,
    });
    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  async function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !org) return;
    setUploadingLogo(true);
    const { logoUrl } = await uploadOrganizationLogo(orgId, file);
    setUploadingLogo(false);
    if (logoUrl) setOrg({ ...org, logoUrl });
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <p className="text-sm text-gray-400">Laden…</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <EmptyState icon={Building2} title="Organisatie niet gevonden" />
      </div>
    );
  }

  const membersByRole = [...members].sort(
    (a, b) => ROLE_ORDER.indexOf(a.roleKey) - ROLE_ORDER.indexOf(b.roleKey)
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <button
        onClick={() => router.push("/admin/organisaties")}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft size={14} />
        Terug naar organisaties
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
          {orgStatusBadge(org.status)}
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Opslaan…
            </>
          ) : saved ? (
            <>
              <Check size={14} /> Opgeslagen
            </>
          ) : (
            "Wijzigingen opslaan"
          )}
        </Button>
      </div>

      {/* ── 1. Algemene gegevens ─────────────────────────────────────────── */}
      <Card>
        <CardHeader title="Algemene gegevens" subtitle="Basisinformatie over deze organisatie" />
        <div className="flex items-start gap-5 mb-5">
          <div className="shrink-0">
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleLogoSelect} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden border transition-colors hover:bg-gray-50 relative"
              style={{ borderColor: "#e8e5df", background: "#f8f7f4" }}
              title="Logo uploaden"
            >
              {uploadingLogo ? (
                <Loader2 size={18} className="animate-spin text-gray-400" />
              ) : org.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={org.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Camera size={18} className="text-gray-300" />
              )}
            </button>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label="Organisatienaam" value={org.name} onChange={(v) => setOrg({ ...org, name: v })} />
            <div>
              <FieldLabel>Status</FieldLabel>
              <select
                value={org.status}
                onChange={(e) => setOrg({ ...org, status: e.target.value })}
                className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none"
                style={inputStyle}
              >
                <option value="trial">Trial</option>
                <option value="active">Actief</option>
                <option value="paused">Gepauzeerd</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="KvK-nummer" value={org.kvkNumber ?? ""} onChange={(v) => setOrg({ ...org, kvkNumber: v })} />
          <TextField label="BTW-nummer" value={org.btwNumber ?? ""} onChange={(v) => setOrg({ ...org, btwNumber: v })} />
          <TextField label="Website" value={org.website ?? ""} onChange={(v) => setOrg({ ...org, website: v })} placeholder="https://" />
          <div>
            <FieldLabel>Max. aantal vestigingen</FieldLabel>
            <input
              type="number"
              min={0}
              value={org.maxLocations}
              onChange={(e) => setOrg({ ...org, maxLocations: Math.max(0, Number(e.target.value) || 0) })}
              className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none transition-colors"
              style={inputStyle}
            />
          </div>
          <TextField label="Contactpersoon" value={org.contactName ?? ""} onChange={(v) => setOrg({ ...org, contactName: v })} />
          <TextField label="E-mailadres" value={org.contactEmail ?? ""} onChange={(v) => setOrg({ ...org, contactEmail: v })} type="email" />
          <TextField label="Telefoonnummer" value={org.contactPhone ?? ""} onChange={(v) => setOrg({ ...org, contactPhone: v })} type="tel" />
          <div className="sm:col-span-2">
            <TextField label="Adres" value={org.address ?? ""} onChange={(v) => setOrg({ ...org, address: v })} />
          </div>
        </div>
      </Card>

      {/* ── 3. Vestigingen ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Vestigingen"
          subtitle={`${locations.length} ${locations.length === 1 ? "vestiging" : "vestigingen"}`}
          action={<MapPin size={15} className="text-gray-400" />}
        />
        {locations.length === 0 ? (
          <p className="text-sm text-gray-400 mt-2">Geen vestigingen.</p>
        ) : (
          <div className="space-y-0 mt-2">
            {locations.map((loc) => (
              <div key={loc.id} className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid #f8f7f4" }}>
                <div>
                  <p className="text-sm font-medium text-gray-800">{loc.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{loc.city || "Geen plaats ingesteld"} · {loc.patientCount} {loc.patientCount === 1 ? "patiënt" : "patiënten"}</p>
                </div>
                {loc.archived ? <Badge variant="muted">Gearchiveerd</Badge> : <Badge variant="success">Actief</Badge>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── 4. Gebruikers ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Gebruikers"
          subtitle="Medewerkers binnen deze organisatie"
          action={
            <Button size="sm" variant="secondary" onClick={() => setShowAddMember((v) => !v)}>
              <UserPlus size={13} />
              Toevoegen
            </Button>
          }
        />

        {showAddMember && (
          <form onSubmit={handleAddMember} className="rounded-xl p-4 mb-4 space-y-3" style={{ background: "#f8f7f4" }}>
            <p className="text-xs text-gray-500">
              Koppelt een bestaand REVA-account aan deze organisatie. Diegene moet al eerder zelf een account hebben aangemaakt.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <FieldLabel>E-mailadres</FieldLabel>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="naam@praktijk.nl"
                  className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none"
                  style={{ ...inputStyle, background: "#ffffff" }}
                />
              </div>
              <div>
                <FieldLabel>Rol</FieldLabel>
                <select
                  value={memberRoleId}
                  onChange={(e) => setMemberRoleId(e.target.value)}
                  className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none"
                  style={{ ...inputStyle, background: "#ffffff" }}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Vestiging (optioneel)</FieldLabel>
                <select
                  value={memberLocationId}
                  onChange={(e) => setMemberLocationId(e.target.value)}
                  className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none"
                  style={{ ...inputStyle, background: "#ffffff" }}
                >
                  <option value="">Hele organisatie</option>
                  {locations.filter((l) => !l.archived).map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {addMemberError && <p className="text-xs" style={{ color: "#dc2626" }}>{addMemberError}</p>}
            <Button type="submit" size="sm" disabled={addingMember}>
              {addingMember ? <Loader2 size={13} className="animate-spin" /> : "Koppelen"}
            </Button>
          </form>
        )}

        {membersByRole.length === 0 ? (
          <p className="text-sm text-gray-400 mt-2">
            Nog geen medewerkers gekoppeld.
          </p>
        ) : (
          <div className="space-y-0 mt-2">
            {membersByRole.map((m) => (
              <div key={m.userId} className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid #f8f7f4" }}>
                <div>
                  <p className="text-sm font-medium text-gray-800">{m.fullName || m.email || "Onbekend"}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {m.locationName || "Hele organisatie"} · Laatste login {m.lastSignInAt ? formatDate(m.lastSignInAt) : "nooit"}
                  </p>
                </div>
                <Badge variant={roleBadgeVariant(m.roleKey)}>{m.roleName}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── 5 + 6. Patiënten & Gebruik ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Patiënten" subtitle="Statistieken, geen persoonsgegevens" action={<HeartPulse size={15} className="text-gray-400" />} />
          <div className="grid grid-cols-2 gap-3 mt-2">
            <StatCard label="Totaal" value={patientStats?.total ?? 0} className="!p-3" />
            <StatCard label="Actief" value={patientStats?.active ?? 0} className="!p-3" />
            <StatCard label="Nieuw deze maand" value={patientStats?.newThisMonth ?? 0} className="!p-3" />
            <StatCard
              label="Laatst toegevoegd"
              value={patientStats?.lastAddedAt ? formatDate(patientStats.lastAddedAt) : "—"}
              className="!p-3"
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Gebruik" subtitle="Geeft aan hoe actief het platform wordt gebruikt" action={<Activity size={15} className="text-gray-400" />} />
          <div className="space-y-3 mt-2">
            <div className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid #f8f7f4" }}>
              <span className="text-sm text-gray-600">Laatste login</span>
              <span className="text-sm font-semibold text-gray-800">{usage?.lastSignInAt ? formatDate(usage.lastSignInAt) : "Nooit"}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">Check-ins laatste 30 dagen</span>
              <span className="text-sm font-semibold text-gray-800">{usage?.checkinsLast30Days ?? 0}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── 8. Support ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader title="Support" subtitle="Interne notities, alleen zichtbaar voor platformbeheerders" action={<MessageSquare size={15} className="text-gray-400" />} />
        <div className="space-y-4 mt-2">
          <div className="max-w-xs">
            <FieldLabel>Laatste contact</FieldLabel>
            <DatePicker
              value={org.lastContactAt ?? ""}
              onChange={(v) => setOrg({ ...org, lastContactAt: v || null })}
              placeholder="Nog geen contact geweest"
            />
          </div>
          <div>
            <FieldLabel>Notities</FieldLabel>
            <textarea
              value={org.supportNotes ?? ""}
              onChange={(e) => setOrg({ ...org, supportNotes: e.target.value })}
              placeholder="Bijv. afspraken uit een salesgesprek, openstaande vragen, wensen…"
              rows={4}
              className="w-full text-sm rounded-xl border px-4 py-3 focus:outline-none transition-colors resize-none"
              style={inputStyle}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
