"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Building2, MapPin, HeartPulse, Activity,
  MessageSquare, Camera, Loader2, Check, UserPlus, AlertCircle,
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
  PLANS, PLAN_ORDER, UNLIMITED, YEARLY_MONTHS_CHARGED, PATIENT_WARNING_RATIO,
  priceLabel, limitLabel, formatEuro, type PlanKey,
} from "@/lib/plans";
import { trialState, isoDatePlusDays, dayLabel, DEFAULT_TRIAL_DAYS, TRIAL_GRACE_DAYS } from "@/lib/trial";
import {
  loadAdminOrganizationDetail, updateAdminOrganization, uploadOrganizationLogo,
  loadAdminOrgLocations, loadAdminOrgMembers, loadAdminOrgPatientStats, loadAdminOrgUsage,
  loadAdminRoles, findExistingAccountByEmail, linkExistingAccountToOrg,
  inviteAdminOrgMember, loadAdminOrgInvites, resendAdminOrgInvite, cancelAdminOrgInvite, relinkAdminOrgMember,
  type AdminOrganizationDetail, type AdminOrgLocation, type AdminOrgMember,
  type AdminOrgPatientStats, type AdminOrgUsage, type AdminRoleOption,
  type AdminAccountMatch, type AdminOrgInvite,
} from "@/lib/services/adminService";
import { resetStaffMfa } from "@/lib/services/portalService";

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

const ROLE_ORDER = ["organization_owner", "therapist"];

function roleBadgeVariant(roleKey: string): "accent" | "blue" | "purple" | "default" {
  if (roleKey === "organization_owner") return "accent";
  if (roleKey === "therapist") return "blue";
  return "default";
}

export default function AdminOrganizationDetailPage() {
  return (
    <Suspense fallback={<div className="p-4 sm:p-6 max-w-5xl mx-auto"><p className="text-sm text-gray-400">Laden…</p></div>}>
      <AdminOrganizationDetailContent />
    </Suspense>
  );
}

function AdminOrganizationDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = params.id as string;
  const inviteErrorFromRedirect = searchParams.get("inviteError");

  const [org, setOrg] = useState<AdminOrganizationDetail | null>(null);
  const [initialOrg, setInitialOrg] = useState<AdminOrganizationDetail | null>(null);
  const [locations, setLocations] = useState<AdminOrgLocation[]>([]);
  const [members, setMembers] = useState<AdminOrgMember[]>([]);
  const [invites, setInvites] = useState<AdminOrgInvite[]>([]);
  const [patientStats, setPatientStats] = useState<AdminOrgPatientStats | null>(null);
  const [usage, setUsage] = useState<AdminOrgUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [resettingMfaUserId, setResettingMfaUserId] = useState<string | null>(null);
  const [mfaResetMessage, setMfaResetMessage] = useState<{ userId: string; text: string; ok: boolean } | null>(null);
  const [relinkingUserId, setRelinkingUserId] = useState<string | null>(null);
  const [relinkMessage, setRelinkMessage] = useState<{ userId: string; text: string; ok: boolean } | null>(null);

  async function handleMfaReset(userId: string) {
    if (!window.confirm("Tweestapsverificatie resetten voor deze medewerker? Diegene moet dan opnieuw instellen bij de volgende keer inloggen.")) return;
    setResettingMfaUserId(userId);
    setMfaResetMessage(null);
    const { error } = await resetStaffMfa(userId, orgId);
    setResettingMfaUserId(null);
    setMfaResetMessage({ userId, ok: !error, text: error ?? "Gereset." });
    setTimeout(() => setMfaResetMessage(null), 4000);
  }

  async function handleRelink(member: AdminOrgMember) {
    if (!window.confirm(`Nieuwe activatielink sturen naar ${member.fullName || member.email}? De oude link (indien nog niet gebruikt) werkt daarna niet meer.`)) return;
    setRelinkingUserId(member.userId);
    setRelinkMessage(null);
    const { error } = await relinkAdminOrgMember(orgId, member);
    setRelinkingUserId(null);
    setRelinkMessage({ userId: member.userId, ok: !error, text: error ?? "Nieuwe link verstuurd." });
    setTimeout(() => setRelinkMessage(null), 4000);
  }
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [roles, setRoles] = useState<AdminRoleOption[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberFirstName, setMemberFirstName] = useState("");
  const [memberLastName, setMemberLastName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRoleId, setMemberRoleId] = useState("");
  const [memberLocationId, setMemberLocationId] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState("");
  const [pendingMatch, setPendingMatch] = useState<AdminAccountMatch | null>(null);
  const [invitedNotice, setInvitedNotice] = useState("");
  const [inviteRowBusyId, setInviteRowBusyId] = useState<string | null>(null);
  const [inviteRowMessages, setInviteRowMessages] = useState<Record<string, string>>({});

  async function refreshMembersAndInvites() {
    const [mems, invs] = await Promise.all([loadAdminOrgMembers(orgId), loadAdminOrgInvites(orgId)]);
    setMembers(mems);
    setInvites(invs);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadAdminOrganizationDetail(orgId),
      loadAdminOrgLocations(orgId),
      loadAdminOrgMembers(orgId),
      loadAdminOrgInvites(orgId),
      loadAdminOrgPatientStats(orgId),
      loadAdminOrgUsage(orgId),
      loadAdminRoles(),
    ]).then(([detail, locs, mems, invs, pStats, use, roleOptions]) => {
      if (cancelled) return;
      setOrg(detail);
      setInitialOrg(detail);
      setLocations(locs);
      setMembers(mems);
      setInvites(invs);
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

  function resetAddMemberForm() {
    setMemberFirstName("");
    setMemberLastName("");
    setMemberEmail("");
    setMemberLocationId("");
    setPendingMatch(null);
    setAddMemberError("");
  }

  async function handleAddMemberSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberEmail.trim() || !memberRoleId) {
      setAddMemberError("Vul een e-mailadres in en kies een rol");
      return;
    }

    if (pendingMatch) {
      setAddingMember(true);
      setAddMemberError("");
      const { error } = await linkExistingAccountToOrg(orgId, pendingMatch.id, memberRoleId, memberLocationId || null);
      setAddingMember(false);
      if (error) { setAddMemberError(error); return; }
      resetAddMemberForm();
      setShowAddMember(false);
      setInvitedNotice("Bestaand account gekoppeld — er is geen e-mail verstuurd.");
      setTimeout(() => setInvitedNotice(""), 6000);
      refreshMembersAndInvites();
      return;
    }

    setAddingMember(true);
    setAddMemberError("");
    const match = await findExistingAccountByEmail(memberEmail.trim());
    if (match) {
      setAddingMember(false);
      setPendingMatch(match);
      return;
    }

    if (!memberFirstName.trim() || !memberLastName.trim()) {
      setAddingMember(false);
      setAddMemberError("Vul voornaam en achternaam in — dit e-mailadres heeft nog geen account, dus er gaat een uitnodiging uit.");
      return;
    }

    const { error } = await inviteAdminOrgMember(orgId, {
      firstName: memberFirstName, lastName: memberLastName, email: memberEmail, roleId: memberRoleId, locationId: memberLocationId || null,
    });
    setAddingMember(false);
    if (error) { setAddMemberError(error); return; }
    resetAddMemberForm();
    setShowAddMember(false);
    setInvitedNotice("Uitnodiging verstuurd.");
    setTimeout(() => setInvitedNotice(""), 6000);
    refreshMembersAndInvites();
  }

  function showInviteRowMessage(id: string, text: string) {
    setInviteRowMessages((prev) => ({ ...prev, [id]: text }));
    setTimeout(() => setInviteRowMessages((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    }), 5000);
  }

  async function handleResendInvite(invite: AdminOrgInvite) {
    setInviteRowBusyId(invite.id);
    const { error } = await resendAdminOrgInvite(invite.id);
    setInviteRowBusyId(null);
    showInviteRowMessage(invite.id, error ?? "Uitnodiging opnieuw verstuurd.");
  }

  async function handleCancelInvite(invite: AdminOrgInvite) {
    setInviteRowBusyId(invite.id);
    const { error } = await cancelAdminOrgInvite(invite.id);
    setInviteRowBusyId(null);
    if (error) { showInviteRowMessage(invite.id, error); return; }
    refreshMembersAndInvites();
  }

  const isDirty = !!org && !!initialOrg && JSON.stringify(org) !== JSON.stringify(initialOrg);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  function handleBackNavigation() {
    if (isDirty && !window.confirm("Je hebt niet-opgeslagen wijzigingen. Weet je zeker dat je wilt vertrekken zonder op te slaan?")) {
      return;
    }
    router.push("/admin/organisaties");
  }

  async function handleSave() {
    if (!org) return;
    setSaving(true);
    setSaved(false);
    const { error } = await updateAdminOrganization(orgId, {
      name: org.name,
      status: org.status,
      trialEndsAt: org.trialEndsAt,
      kvkNumber: org.kvkNumber,
      btwNumber: org.btwNumber,
      website: org.website,
      contactName: org.contactName,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      addressStreet: org.addressStreet,
      addressPostalCode: org.addressPostalCode,
      addressCity: org.addressCity,
      supportNotes: org.supportNotes,
      lastContactAt: org.lastContactAt,
      maxLocations: org.maxLocations,
      maxMembers: org.maxMembers,
      plan: org.plan,
      billingInterval: org.billingInterval,
      customMonthlyPriceCents: org.customMonthlyPriceCents,
      maxPatients: org.maxPatients,
    });
    setSaving(false);
    if (!error) {
      setSaved(true);
      setInitialOrg(org);
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
        <EmptyState icon={Building2} title="Bedrijf niet gevonden" />
      </div>
    );
  }

  const membersByRole = [...members].sort(
    (a, b) => ROLE_ORDER.indexOf(a.roleKey) - ROLE_ORDER.indexOf(b.roleKey)
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <button
        onClick={handleBackNavigation}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft size={14} />
        Terug naar bedrijven
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
          {orgStatusBadge(org.status, org.trialEndsAt)}
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

      {/* ── Pakket (migratie 130) ─────────────────────────────────────────── */}
      <PlanCard
        org={org}
        onChange={setOrg}
        usage={{
          members: members.filter((m) => m.membershipStatus !== "suspended").length + invites.length,
          locations: locations.filter((l) => !l.archived).length,
          patients: patientStats?.active ?? null,
        }}
      />

      {/* ── 1. Algemene gegevens ─────────────────────────────────────────── */}
      <Card>
        <CardHeader title="Algemene gegevens" subtitle="Basisinformatie over dit bedrijf" />
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
            <TextField label="Bedrijfsnaam" value={org.name} onChange={(v) => setOrg({ ...org, name: v })} />
            <div>
              <FieldLabel>Status</FieldLabel>
              <select
                value={org.status}
                onChange={(e) => setOrg({
                  ...org,
                  status: e.target.value,
                  trialEndsAt: e.target.value === "trial" && !org.trialEndsAt ? isoDatePlusDays(DEFAULT_TRIAL_DAYS) : org.trialEndsAt,
                })}
                className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none"
                style={inputStyle}
              >
                <option value="trial">Trial</option>
                <option value="active">Actief</option>
                <option value="paused">Gepauzeerd</option>
              </select>
              {org.status === "trial" && <TrialEndEditor value={org.trialEndsAt} onChange={(v) => setOrg({ ...org, trialEndsAt: v })} />}
              {org.status === "paused" && (
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  Medewerkers kunnen de portal niet meer gebruiken. Patiënten houden toegang tot hun eigen gegevens.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="KvK-nummer" value={org.kvkNumber ?? ""} onChange={(v) => setOrg({ ...org, kvkNumber: v })} />
          <TextField label="BTW-nummer" value={org.btwNumber ?? ""} onChange={(v) => setOrg({ ...org, btwNumber: v })} />
          <TextField label="Website" value={org.website ?? ""} onChange={(v) => setOrg({ ...org, website: v })} placeholder="https://" />
          <TextField label="Contactpersoon" value={org.contactName ?? ""} onChange={(v) => setOrg({ ...org, contactName: v })} />
          <TextField label="E-mailadres" value={org.contactEmail ?? ""} onChange={(v) => setOrg({ ...org, contactEmail: v })} type="email" />
          <TextField label="Telefoonnummer" value={org.contactPhone ?? ""} onChange={(v) => setOrg({ ...org, contactPhone: v })} type="tel" />
          <div className="sm:col-span-2">
            <TextField label="Straatnaam" value={org.addressStreet ?? ""} onChange={(v) => setOrg({ ...org, addressStreet: v })} />
          </div>
          <TextField label="Postcode" value={org.addressPostalCode ?? ""} onChange={(v) => setOrg({ ...org, addressPostalCode: v })} placeholder="1234 AB" />
          <TextField label="Plaats" value={org.addressCity ?? ""} onChange={(v) => setOrg({ ...org, addressCity: v })} />
        </div>
      </Card>

      {/* ── 3. Locaties ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Locaties"
          subtitle={`${locations.length} ${locations.length === 1 ? "locatie" : "locaties"}`}
          action={<MapPin size={15} className="text-gray-400" />}
        />
        {locations.length === 0 ? (
          <p className="text-sm text-gray-400 mt-2">Geen locaties.</p>
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
          subtitle="Medewerkers binnen dit bedrijf"
          action={
            <Button size="sm" variant="secondary" onClick={() => { resetAddMemberForm(); setShowAddMember((v) => !v); }}>
              <UserPlus size={13} />
              Toevoegen
            </Button>
          }
        />

        {inviteErrorFromRedirect && (
          <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-4 text-sm" style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626" }}>
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{inviteErrorFromRedirect}</span>
          </div>
        )}
        {invitedNotice && (
          <p className="text-sm mb-4" style={{ color: "#16a34a" }}>{invitedNotice}</p>
        )}

        {showAddMember && (
          <form onSubmit={handleAddMemberSubmit} className="rounded-xl p-4 mb-4 space-y-3" style={{ background: "#f8f7f4" }}>
            {pendingMatch ? (
              <>
                <p className="text-sm text-gray-700">
                  Dit e-mailadres hoort al bij een bestaand account: <span className="font-medium">{pendingMatch.fullName || memberEmail}</span>.
                  Koppelen als <span className="font-medium">{roles.find((r) => r.id === memberRoleId)?.name}</span> aan dit bedrijf?
                </p>
                <p className="text-xs text-gray-400">Er wordt geen e-mail verstuurd — dit account kan direct inloggen met het bestaande wachtwoord.</p>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500">
                  Bestaat er al een REVA-account met dit e-mailadres, dan wordt het direct gekoppeld (na bevestiging). Anders ontvangt deze persoon een e-mail om zelf een wachtwoord in te stellen.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text" value={memberFirstName} onChange={(e) => setMemberFirstName(e.target.value)}
                    placeholder="Voornaam" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={{ ...inputStyle, background: "#ffffff" }}
                  />
                  <input
                    type="text" value={memberLastName} onChange={(e) => setMemberLastName(e.target.value)}
                    placeholder="Achternaam" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={{ ...inputStyle, background: "#ffffff" }}
                  />
                </div>
              </>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <FieldLabel>E-mailadres</FieldLabel>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="naam@praktijk.nl"
                  disabled={!!pendingMatch}
                  className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60"
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
                <FieldLabel>Locatie (optioneel)</FieldLabel>
                <select
                  value={memberLocationId}
                  onChange={(e) => setMemberLocationId(e.target.value)}
                  className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none"
                  style={{ ...inputStyle, background: "#ffffff" }}
                >
                  <option value="">Heel bedrijf</option>
                  {locations.filter((l) => !l.archived).map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {addMemberError && <p className="text-xs" style={{ color: "#dc2626" }}>{addMemberError}</p>}
            <div className="flex gap-2">
              {pendingMatch && (
                <Button type="button" size="sm" variant="secondary" onClick={() => setPendingMatch(null)}>Annuleren</Button>
              )}
              <Button type="submit" size="sm" disabled={addingMember}>
                {addingMember ? <Loader2 size={13} className="animate-spin" /> : pendingMatch ? "Bevestigen" : "Toevoegen"}
              </Button>
            </div>
          </form>
        )}

        {membersByRole.length === 0 && invites.length === 0 ? (
          <p className="text-sm text-gray-400 mt-2">
            Nog geen medewerkers gekoppeld.
          </p>
        ) : (
          <div className="space-y-0 mt-2">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-3 flex-wrap gap-2" style={{ borderBottom: "1px solid #f8f7f4" }}>
                <div>
                  <p className="text-sm font-medium text-gray-800">{inv.firstName} {inv.lastName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {inviteRowMessages[inv.id] ?? `${inv.locationName || "Heel bedrijf"} · Uitgenodigd ${formatDate(inv.invitedAt)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="warning">Uitgenodigd</Badge>
                  <Badge variant={roleBadgeVariant(inv.roleKey)}>{inv.roleName}</Badge>
                  <Button size="sm" variant="secondary" disabled={inviteRowBusyId === inv.id} onClick={() => handleResendInvite(inv)}>Opnieuw uitnodigen</Button>
                  <Button size="sm" variant="secondary" disabled={inviteRowBusyId === inv.id} onClick={() => handleCancelInvite(inv)}>Annuleren</Button>
                </div>
              </div>
            ))}
            {membersByRole.map((m) => (
              <div key={m.userId} className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid #f8f7f4" }}>
                <div>
                  <p className="text-sm font-medium text-gray-800">{m.fullName || m.email || "Onbekend"}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {m.locationName || "Heel bedrijf"} · Laatste login {m.lastSignInAt ? formatDate(m.lastSignInAt) : "nooit"}
                  </p>
                  {mfaResetMessage?.userId === m.userId && (
                    <p className="text-[11px] mt-0.5" style={{ color: mfaResetMessage.ok ? "#16a34a" : "#dc2626" }}>
                      {mfaResetMessage.text}
                    </p>
                  )}
                  {relinkMessage?.userId === m.userId && (
                    <p className="text-[11px] mt-0.5" style={{ color: relinkMessage.ok ? "#16a34a" : "#dc2626" }}>
                      {relinkMessage.text}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={roleBadgeVariant(m.roleKey)}>{m.roleName}</Badge>
                  <button
                    type="button"
                    disabled={relinkingUserId === m.userId}
                    onClick={() => handleRelink(m)}
                    className="text-xs font-medium hover:opacity-70 disabled:opacity-40"
                    style={{ color: "#9ca3af" }}
                    title="Stuur een nieuwe link waarmee deze medewerker opnieuw een wachtwoord en 2FA kan instellen"
                  >
                    Nieuwe link versturen
                  </button>
                  <button
                    type="button"
                    disabled={resettingMfaUserId === m.userId}
                    onClick={() => handleMfaReset(m.userId)}
                    className="text-xs font-medium hover:opacity-70 disabled:opacity-40"
                    style={{ color: "#9ca3af" }}
                  >
                    2FA resetten
                  </button>
                </div>
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

/** Einddatum van de proefperiode, met snelknoppen om te verlengen (migratie 129). */
function TrialEndEditor({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  const state = trialState("trial", value);
  const summary =
    state.kind === "trial" ? (state.daysLeft === 0 ? "Vandaag is de laatste dag." : `Nog ${dayLabel(state.daysLeft)}.`)
    : state.kind === "grace" ? `Verlopen — nog ${dayLabel(state.graceDaysLeft + 1)} speling, daarna geen toegang meer.`
    : state.kind === "expired" ? "Verlopen: medewerkers hebben geen toegang meer."
    : "";
  return (
    <div className="mt-3 space-y-2">
      <FieldLabel>Proefperiode tot en met</FieldLabel>
      <DatePicker value={value ?? ""} onChange={(v) => v && onChange(v)} placeholder="Kies een einddatum" />
      <div className="flex flex-wrap gap-1.5">
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onChange(isoDatePlusDays(d, value))}
            className="text-xs font-medium rounded-lg border px-2.5 py-1 hover:bg-gray-50"
            style={{ borderColor: "#e8e5df", color: "#4b5563" }}
          >
            +{d} dagen
          </button>
        ))}
      </div>
      <p className="text-xs leading-relaxed" style={{ color: state.kind === "trial" ? "#6b7280" : "#b91c1c" }}>
        {summary} Na de einddatum nog {TRIAL_GRACE_DAYS} dagen speling, daarna werkt het als &quot;Gepauzeerd&quot;. Vergeet niet op te slaan.
      </p>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm font-medium rounded-xl border px-3.5 py-2 transition-colors"
      style={active
        ? { background: "#1a1a1a", borderColor: "#1a1a1a", color: "#ffffff" }
        : { background: "#ffffff", borderColor: "#e8e5df", color: "#4b5563" }}
    >
      {children}
    </button>
  );
}

function UsageStat({ label, used, max }: { label: string; used: number | null; max: number | null }) {
  const unlimited = max === null || max >= UNLIMITED;
  const ratio = !unlimited && used !== null && max! > 0 ? used / max! : 0;
  const color = ratio > 1 ? "#b91c1c" : ratio >= PATIENT_WARNING_RATIO ? "#c2410c" : "#1a1a1a";
  return (
    <div className="rounded-xl px-4 py-3" style={{ background: "#f8f7f4" }}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold mt-0.5" style={{ color }}>
        {used ?? "—"} <span className="text-sm font-normal text-gray-400">/ {limitLabel(max)}</span>
      </p>
      {!unlimited && (
        <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: "#e8e5df" }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, ratio * 100)}%`, background: color }} />
        </div>
      )}
    </div>
  );
}

function LimitInput({ label, value, onChange, allowEmpty }: { label: string; value: number | null; onChange: (v: number | null) => void; allowEmpty?: boolean }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number"
        min={0}
        value={value === null || value >= UNLIMITED ? "" : value}
        placeholder="Onbeperkt"
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (raw === "") { onChange(allowEmpty ? null : UNLIMITED); return; }
          onChange(Math.max(0, Math.floor(Number(raw) || 0)));
        }}
        className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none transition-colors"
        style={inputStyle}
      />
    </div>
  );
}

/**
 * Pakket, betaalperiode en limieten. Solo t/m Praktijk Plus nemen de aantallen
 * uit lib/plans.ts over; Enterprise en Maatwerk zijn vrij in te vullen.
 * Medewerkers en vestigingen zijn harde limieten, patiënten een zachte.
 */
function PlanCard({
  org, onChange, usage,
}: {
  org: AdminOrganizationDetail;
  onChange: (org: AdminOrganizationDetail) => void;
  usage: { members: number; locations: number; patients: number | null };
}) {
  const plan = org.plan ? PLANS[org.plan] : null;

  function choosePlan(key: PlanKey) {
    const def = PLANS[key];
    onChange({
      ...org,
      plan: key,
      maxMembers: def.maxMembers,
      maxLocations: def.maxLocations,
      maxPatients: def.maxPatients,
      customMonthlyPriceCents: def.customizable && def.monthlyPrice !== null ? def.monthlyPrice * 100 : null,
    });
  }

  const priceEuros = org.customMonthlyPriceCents === null ? "" : String(org.customMonthlyPriceCents / 100);

  return (
    <Card>
      <CardHeader
        title="Pakket"
        subtitle={plan ? `${plan.name} · ${priceLabel(org.plan, org.customMonthlyPriceCents, org.billingInterval)}` : "Nog geen pakket gekozen"}
      />
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {PLAN_ORDER.map((key) => (
            <Pill key={key} active={org.plan === key} onClick={() => choosePlan(key)}>
              {PLANS[key].name}
              {PLANS[key].monthlyPrice !== null && (
                <span className="ml-1.5 font-normal opacity-60">
                  {PLANS[key].priceIsFrom ? "vanaf " : ""}{formatEuro(PLANS[key].monthlyPrice!)}
                </span>
              )}
            </Pill>
          ))}
        </div>

        {plan && (
          <>
            <div>
              <FieldLabel>Betaalperiode</FieldLabel>
              <div className="flex flex-wrap gap-2">
                <Pill active={org.billingInterval === "month"} onClick={() => onChange({ ...org, billingInterval: "month" })}>Maandelijks</Pill>
                <Pill active={org.billingInterval === "year"} onClick={() => onChange({ ...org, billingInterval: "year" })}>
                  Jaarlijks <span className="ml-1 font-normal opacity-60">{12 - YEARLY_MONTHS_CHARGED} maanden gratis</span>
                </Pill>
              </div>
            </div>

            {plan.customizable && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <FieldLabel>Maandprijs (€)</FieldLabel>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={priceEuros}
                    placeholder="Volgens afspraak"
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      onChange({ ...org, customMonthlyPriceCents: raw === "" ? null : Math.round(Math.max(0, Number(raw) || 0) * 100) });
                    }}
                    className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none transition-colors"
                    style={inputStyle}
                  />
                </div>
                <LimitInput label="Max. medewerkers" value={org.maxMembers} onChange={(v) => onChange({ ...org, maxMembers: v ?? UNLIMITED })} />
                <LimitInput label="Max. vestigingen" value={org.maxLocations} onChange={(v) => onChange({ ...org, maxLocations: v ?? UNLIMITED })} />
                <LimitInput label="Max. actieve patiënten" value={org.maxPatients} onChange={(v) => onChange({ ...org, maxPatients: v })} allowEmpty />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <UsageStat label="Medewerkers (incl. openstaande uitnodigingen)" used={usage.members} max={org.maxMembers} />
              <UsageStat label="Vestigingen" used={usage.locations} max={org.maxLocations} />
              <UsageStat label="Actieve patiënten" used={usage.patients} max={org.maxPatients} />
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Medewerkers en vestigingen zijn een harde grens: daarboven kan de praktijk niemand meer uitnodigen of toevoegen.
              Patiënten zijn een zachte grens: de praktijkeigenaar krijgt vanaf {Math.round(PATIENT_WARNING_RATIO * 100)}% een melding, maar er wordt niets geblokkeerd.
              {!plan.customizable && " Aantallen komen uit het pakket; kies Maatwerk om ze aan te passen."}
              {" "}Vergeet niet op te slaan.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
