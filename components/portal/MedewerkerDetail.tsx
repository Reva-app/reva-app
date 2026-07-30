"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, MessageSquare, Camera } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/ui/Avatar";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatDate } from "@/lib/data";
import { apiUrl } from "@/lib/apiBase";
import {
  loadPortalStaffOverview, loadPortalLocations, loadPortalRoles, loadTherapistWorkload,
  loadMembershipLocations, updateMembershipLocations,
  loadWorkSchedule, updateWorkSchedule, DEFAULT_WORK_SCHEDULE, WEEKDAY_LABELS,
  updateStaffMember, updateStaffProfile, deleteStaffMember, resetStaffMfa, uploadOwnAvatar,
  MANAGE_STAFF_ROLES, PORTAL_STAFF_STATUS_LABELS, STAFF_INACTIVITY_THRESHOLD_DAYS, isDateStale,
  type PortalStaffMember, type PortalLocationOption, type PortalRoleOption,
  type PortalWorkSchedule, type PortalWeekday,
} from "@/lib/services/portalService";

const inputStyle = {
  borderColor: "#e8e5df",
  background: "#ffffff",
  color: "#1a1a1a",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

const WEEKDAY_ORDER: PortalWeekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const ROLE_EXPLANATIONS: Record<string, string> = {
  organization_owner: "Praktijk eigenaar heeft volledige toegang: kan medewerkers uitnodigen en verwijderen, locaties beheren, analyses inzien, en alle patiëntdossiers en herstelplannen beheren.",
  therapist: "Fysiotherapeut kan patiëntdossiers aanmaken, inzien en bewerken, en herstelplannen, schema's en oefeningen beheren. Geen toegang tot medewerkers- of locatiebeheer, en geen inzage in de praktijkbrede analyses.",
};

type TabKey = "algemeen" | "werkuren" | "locaties" | "rol" | "account";

const TAB_OPTIONS: { value: TabKey; label: string }[] = [
  { value: "algemeen", label: "Algemene gegevens" },
  { value: "werkuren", label: "Werkuren" },
  { value: "locaties", label: "Locaties" },
  { value: "rol", label: "Rol" },
  { value: "account", label: "Account" },
];

/**
 * Gedeeld door de medewerkerslijst-detailpagina (`/portal/medewerkers/[id]`)
 * en de zelfbedienings-accountpagina (`/portal/account`) — beide renderen
 * hetzelfde tabblad-gedrag voor dezelfde membership-rij, alleen bereikt via
 * een andere route/rol. `backHref`/`backLabel` alleen tonen als beide zijn
 * meegegeven — de accountpagina heeft geen "terug naar een lijst"-concept,
 * die is bereikbaar via de permanente sidebar.
 */
export function MedewerkerDetail({
  membershipId, backHref, backLabel, hideAccountDangerActions, initialTab,
}: {
  membershipId: string;
  backHref?: string;
  backLabel?: string;
  hideAccountDangerActions?: boolean;
  initialTab?: TabKey;
}) {
  const router = useRouter();
  const { checked, membership } = usePortalMembership();
  const { user } = useAuth();

  const [member, setMember] = useState<PortalStaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<TabKey>(initialTab ?? "algemeen");

  const [locations, setLocations] = useState<PortalLocationOption[]>([]);
  const [roles, setRoles] = useState<PortalRoleOption[]>([]);
  const [patientCount, setPatientCount] = useState<number | null>(null);

  const { showToast, toastNode } = useToast();

  // Tab 1
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [bigNumber, setBigNumber] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Tab 2
  const [schedule, setSchedule] = useState<PortalWorkSchedule>(DEFAULT_WORK_SCHEDULE);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Tab 3
  const [mainLocationId, setMainLocationId] = useState("");
  const [extraLocationIds, setExtraLocationIds] = useState<string[]>([]);
  const [locationsLoaded, setLocationsLoaded] = useState(false);
  const [savingLocations, setSavingLocations] = useState(false);

  // Tab 4
  const [roleId, setRoleId] = useState("");
  const [savingRole, setSavingRole] = useState(false);
  const [roleError, setRoleError] = useState("");

  // Tab 5
  const [accountBusy, setAccountBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmMfaReset, setConfirmMfaReset] = useState(false);

  // Feedback (zelfde flow als de patiëntkant, app/(app)/instellingen/page.tsx)
  const [fbCategorie, setFbCategorie] = useState("");
  const [fbOnderwerp, setFbOnderwerp] = useState("");
  const [fbBericht, setFbBericht] = useState("");
  const [fbSending, setFbSending] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const canManage = !!membership && MANAGE_STAFF_ROLES.includes(membership.roleKey);
  const isSelf = !!user && member?.userId === user.id;
  const canEditGeneral = canManage || isSelf;
  const canShowDangerActions = canManage && !isSelf && !hideAccountDangerActions;

  function refresh(organizationId: string) {
    loadPortalStaffOverview(organizationId).then((all) => {
      const found = all.find((m) => m.id === membershipId && m.kind === "member") ?? null;
      setMember(found);
      setNotFound(!found);
      if (found) {
        setFirstName(found.firstName ?? "");
        setLastName(found.lastName ?? "");
        setPhone(found.phone ?? "");
        setTitle(found.title ?? "");
        setBigNumber(found.bigNumber ?? "");
        setMainLocationId(found.locationId ?? "");
        setRoleId(found.roleId);
      }
      setLoading(false);
    });
  }

  useEffect(() => {
    if (!checked || !membership) return;
    let cancelled = false;
    Promise.all([
      loadPortalStaffOverview(membership.organizationId),
      loadPortalLocations(membership.organizationId),
      loadPortalRoles(),
    ]).then(([all, locationsData, rolesData]) => {
      if (cancelled) return;
      const found = all.find((m) => m.id === membershipId && m.kind === "member") ?? null;
      setMember(found);
      setNotFound(!found);
      setLocations(locationsData);
      setRoles(rolesData);
      if (found) {
        setFirstName(found.firstName ?? "");
        setLastName(found.lastName ?? "");
        setPhone(found.phone ?? "");
        setTitle(found.title ?? "");
        setBigNumber(found.bigNumber ?? "");
        setMainLocationId(found.locationId ?? "");
        setRoleId(found.roleId);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [checked, membership, membershipId]);

  useEffect(() => {
    if (!checked || !membership || !canManage) return;
    let cancelled = false;
    loadTherapistWorkload(membership.organizationId).then(({ rows }) => {
      if (cancelled) return;
      const row = rows.find((r) => r.userId === member?.userId);
      setPatientCount(row?.patientCount ?? 0);
    });
    return () => { cancelled = true; };
  }, [checked, membership, canManage, member?.userId]);

  useEffect(() => {
    if (tab !== "werkuren" || scheduleLoaded) return;
    loadWorkSchedule(membershipId).then((data) => {
      setSchedule(data);
      setScheduleLoaded(true);
    });
  }, [tab, scheduleLoaded, membershipId]);

  useEffect(() => {
    if (tab !== "locaties" || locationsLoaded) return;
    loadMembershipLocations(membershipId).then((ids) => {
      setExtraLocationIds(ids);
      setLocationsLoaded(true);
    });
  }, [tab, locationsLoaded, membershipId]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!member?.userId) return;
    setSavingProfile(true);
    const { error } = await updateStaffProfile(member.userId, {
      firstName, lastName, phone: phone || null, title: title || null, bigNumber: bigNumber || null,
    });
    setSavingProfile(false);
    if (error) { showToast("Opslaan mislukt: " + error, "error"); return; }
    showToast("Gegevens opgeslagen");
    if (membership) refresh(membership.organizationId);
  }

  async function handleUploadAvatar(file: File) {
    setUploadingAvatar(true);
    const { avatarUrl, error } = await uploadOwnAvatar(file);
    setUploadingAvatar(false);
    if (error) { showToast(error, "error"); return; }
    setMember((prev) => (prev ? { ...prev, avatarUrl } : prev));
    showToast("Profielfoto bijgewerkt");
  }

  async function handleSaveSchedule() {
    setSavingSchedule(true);
    const { error } = await updateWorkSchedule(membershipId, schedule);
    setSavingSchedule(false);
    if (error) { showToast("Opslaan mislukt: " + error, "error"); return; }
    showToast("Werkuren opgeslagen");
  }

  async function handleSaveLocations() {
    if (!membership) return;
    setSavingLocations(true);
    const results = await Promise.all([
      updateStaffMember(membershipId, { locationId: mainLocationId || null }),
      updateMembershipLocations(membershipId, extraLocationIds),
    ]);
    setSavingLocations(false);
    const failed = results.find((r) => r.error);
    if (failed) { showToast("Opslaan mislukt: " + failed.error, "error"); return; }
    showToast("Locaties opgeslagen");
    refresh(membership.organizationId);
  }

  async function handleSaveRole() {
    if (!membership) return;
    setSavingRole(true);
    setRoleError("");
    const { error } = await updateStaffMember(membershipId, { roleId });
    setSavingRole(false);
    if (error) { setRoleError(error); return; }
    showToast("Rol opgeslagen");
    refresh(membership.organizationId);
  }

  async function handleToggleBlocked() {
    if (!membership || !member) return;
    setAccountBusy(true);
    const nextBlocked = member.status === "active";
    const { error } = await updateStaffMember(membershipId, { status: nextBlocked ? "suspended" : "active" });
    setAccountBusy(false);
    if (error) { showToast(error, "error"); return; }
    showToast(nextBlocked ? "Medewerker geblokkeerd" : "Medewerker gedeblokkeerd");
    refresh(membership.organizationId);
  }

  async function handleDelete() {
    setAccountBusy(true);
    const { error } = await deleteStaffMember(membershipId);
    setAccountBusy(false);
    setConfirmDelete(false);
    if (error) { showToast(error, "error"); return; }
    router.push(backHref ?? "/portal/medewerkers");
  }

  async function handleMfaReset() {
    if (!membership || !member?.userId) return;
    setAccountBusy(true);
    const { error } = await resetStaffMfa(member.userId, membership.organizationId);
    setAccountBusy(false);
    setConfirmMfaReset(false);
    if (error) { showToast(error, "error"); return; }
    showToast(`Tweestapsverificatie gereset: ${member?.fullName || "deze medewerker"} moet opnieuw instellen bij de volgende keer inloggen.`);
  }

  async function handleFeedback() {
    if (!member || !fbOnderwerp.trim() || !fbBericht.trim()) return;
    setFbSending(true);
    try {
      const res = await fetch(apiUrl("/api/feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categorie: fbCategorie,
          onderwerp: fbOnderwerp,
          bericht: fbBericht,
          naam: member.fullName ?? "",
          email: member.email ?? "",
        }),
      });
      if (!res.ok) throw new Error();
      setFbCategorie(""); setFbOnderwerp(""); setFbBericht("");
      showToast("Feedback verstuurd, bedankt!");
    } catch {
      showToast("Versturen van feedback is niet gelukt.", "error");
    } finally {
      setFbSending(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {backHref && backLabel && (
        <Link href={backHref} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={14} /> {backLabel}
        </Link>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Laden…</p>
      ) : notFound || !member ? (
        <p className="text-sm text-gray-400">Deze medewerker is niet gevonden.</p>
      ) : (
        <>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative shrink-0">
              <Avatar fullName={member.fullName} email={member.email} avatarUrl={member.avatarUrl} size={64} />
              {isSelf && (
                <label
                  className="absolute inset-0 rounded-full flex items-center justify-center cursor-pointer transition-opacity opacity-0 hover:opacity-100"
                  style={{ background: "rgba(0,0,0,0.45)" }}
                  title="Profielfoto wijzigen"
                >
                  {uploadingAvatar ? (
                    <Loader2 size={18} className="animate-spin text-white" />
                  ) : (
                    <Camera size={18} className="text-white" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingAvatar}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) handleUploadAvatar(file);
                    }}
                  />
                </label>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <SectionHeader title={member.fullName || member.email || "Onbekend"} />
                {isSelf && <span className="text-xs text-gray-400">(jij)</span>}
              </div>
              {isSelf && (
                <label className="inline-flex items-center gap-1.5 text-xs font-medium mt-1 cursor-pointer hover:opacity-75 transition-opacity" style={{ color: "var(--brand-accent, #e8632a)" }}>
                  {uploadingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                  {uploadingAvatar ? "Bezig met uploaden…" : "Profielfoto wijzigen"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingAvatar}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) handleUploadAvatar(file);
                    }}
                  />
                </label>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={member.roleKey === "organization_owner" ? "accent" : member.roleKey === "therapist" ? "blue" : "default"}>
                  {member.roleName}
                </Badge>
                {member.status === "active" ? (
                  <Badge variant="success">{PORTAL_STAFF_STATUS_LABELS.active}</Badge>
                ) : (
                  <Badge variant="muted">{PORTAL_STAFF_STATUS_LABELS.suspended}</Badge>
                )}
                {canManage && patientCount !== null && (
                  <span className="text-xs text-gray-400">{patientCount} patiënten</span>
                )}
              </div>
            </div>
          </div>

          <Tabs options={TAB_OPTIONS} value={tab} onChange={setTab} />

          {tab === "algemeen" && (
            <Card>
              <CardHeader title="Algemene gegevens" subtitle={canEditGeneral ? undefined : "Alleen de medewerker zelf of de Practice Owner kan dit bewerken."} />
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Voornaam</FieldLabel>
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={!canEditGeneral}
                      className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60" style={inputStyle} />
                  </div>
                  <div>
                    <FieldLabel>Achternaam</FieldLabel>
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={!canEditGeneral}
                      className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60" style={inputStyle} />
                  </div>
                  <div>
                    <FieldLabel>E-mailadres</FieldLabel>
                    <input type="email" value={member.email ?? ""} disabled
                      className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none opacity-60" style={inputStyle} />
                  </div>
                  <div>
                    <FieldLabel>Telefoonnummer</FieldLabel>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!canEditGeneral}
                      className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60" style={inputStyle} />
                  </div>
                  <div>
                    <FieldLabel>Functietitel</FieldLabel>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEditGeneral}
                      placeholder="Bijv. Fysiotherapeut" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60" style={inputStyle} />
                  </div>
                  <div>
                    <FieldLabel>BIG-nummer</FieldLabel>
                    <input type="text" value={bigNumber} onChange={(e) => setBigNumber(e.target.value)} disabled={!canEditGeneral}
                      className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60" style={inputStyle} />
                  </div>
                </div>
                {canEditGeneral && (
                  <Button type="submit" size="sm" disabled={savingProfile}>
                    {savingProfile ? <Loader2 size={13} className="animate-spin" /> : "Opslaan"}
                  </Button>
                )}
              </form>
            </Card>
          )}

          {tab === "werkuren" && (
            <Card>
              <CardHeader title="Werkuren" subtitle={canEditGeneral ? undefined : "Alleen de medewerker zelf of de Practice Owner kan dit bewerken."} />
              {!scheduleLoaded ? (
                <p className="text-sm text-gray-400">Laden…</p>
              ) : (
                <div className="space-y-2">
                  {WEEKDAY_ORDER.map((day) => {
                    const d = schedule[day];
                    return (
                      <div key={day} className="flex items-center gap-3 flex-wrap gap-y-2">
                        <label className="flex items-center gap-2 w-32 shrink-0 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={!d.isOff}
                            disabled={!canEditGeneral}
                            onChange={(e) => setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], isOff: !e.target.checked } }))}
                            className="rounded"
                          />
                          {WEEKDAY_LABELS[day]}
                        </label>
                        {!d.isOff ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <input type="time" value={d.startTime} disabled={!canEditGeneral}
                              onChange={(e) => setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], startTime: e.target.value } }))}
                              className="text-sm rounded-lg border px-2 py-1.5 focus:outline-none disabled:opacity-60" style={inputStyle} />
                            <span className="text-gray-400 text-sm">tot</span>
                            <input type="time" value={d.endTime} disabled={!canEditGeneral}
                              onChange={(e) => setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], endTime: e.target.value } }))}
                              className="text-sm rounded-lg border px-2 py-1.5 focus:outline-none disabled:opacity-60" style={inputStyle} />
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Vrij</span>
                        )}
                      </div>
                    );
                  })}
                  {canEditGeneral && (
                    <Button size="sm" className="mt-2" disabled={savingSchedule} onClick={handleSaveSchedule}>
                      {savingSchedule ? <Loader2 size={13} className="animate-spin" /> : "Opslaan"}
                    </Button>
                  )}
                </div>
              )}
            </Card>
          )}

          {tab === "locaties" && (
            <Card>
              <CardHeader title="Locaties" subtitle={canManage ? undefined : "Alleen de Practice Owner kan dit bewerken."} />
              {!locationsLoaded ? (
                <p className="text-sm text-gray-400">Laden…</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <FieldLabel>Hoofdlocatie</FieldLabel>
                    <select
                      value={mainLocationId} onChange={(e) => setMainLocationId(e.target.value)} disabled={!canManage}
                      className="w-full sm:w-80 text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60" style={inputStyle}
                    >
                      <option value="">Hele organisatie</option>
                      {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Overige locaties</FieldLabel>
                    {locations.length === 0 ? (
                      <p className="text-sm text-gray-400">Geen andere locaties beschikbaar.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {locations.map((l) => (
                          <label key={l.id} className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={extraLocationIds.includes(l.id)}
                              disabled={!canManage}
                              onChange={(e) => setExtraLocationIds((prev) => e.target.checked ? [...prev, l.id] : prev.filter((id) => id !== l.id))}
                              className="rounded"
                            />
                            {l.name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {canManage && (
                    <Button size="sm" disabled={savingLocations} onClick={handleSaveLocations}>
                      {savingLocations ? <Loader2 size={13} className="animate-spin" /> : "Opslaan"}
                    </Button>
                  )}
                </div>
              )}
            </Card>
          )}

          {tab === "rol" && (
            <Card>
              <CardHeader title="Rol" subtitle={canManage ? undefined : "Alleen de Practice Owner kan dit bewerken."} />
              <div className="space-y-3">
                <div>
                  <FieldLabel>Rol</FieldLabel>
                  <select
                    value={roleId} onChange={(e) => setRoleId(e.target.value)} disabled={!canManage}
                    className="w-full sm:w-80 text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60" style={inputStyle}
                  >
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <p className="text-sm text-gray-500 rounded-xl p-3" style={{ background: "#f8f7f4" }}>
                  {ROLE_EXPLANATIONS[roles.find((r) => r.id === roleId)?.key ?? ""] ?? ""}
                </p>
                {roleError && <p className="text-xs" style={{ color: "#dc2626" }}>{roleError}</p>}
                {canManage && (
                  <Button size="sm" disabled={savingRole} onClick={handleSaveRole}>
                    {savingRole ? <Loader2 size={13} className="animate-spin" /> : "Opslaan"}
                  </Button>
                )}
              </div>
            </Card>
          )}

          {tab === "account" && (
            <Card>
              <CardHeader title="Account" />
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div><span className="text-gray-500">Status:</span> <span className="text-gray-800">{member.status === "active" ? PORTAL_STAFF_STATUS_LABELS.active : PORTAL_STAFF_STATUS_LABELS.suspended}</span></div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Laatste login:</span>
                    <span className="text-gray-800">{member.lastSignInAt ? formatDate(member.lastSignInAt) : "Nog niet ingelogd"}</span>
                    {member.status === "active" && isDateStale(member.lastSignInAt, STAFF_INACTIVITY_THRESHOLD_DAYS) && (
                      <Badge variant="warning">Niet recent ingelogd</Badge>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border p-4" style={{ borderColor: "#e8e5df" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Tweestapsverificatie</p>
                      <p className="text-xs text-gray-400 mt-0.5">Verplicht voor alle medewerkers</p>
                    </div>
                    {canShowDangerActions && (
                      <Button size="sm" variant="secondary" disabled={accountBusy} onClick={() => setConfirmMfaReset(true)}>
                        Opnieuw laten instellen
                      </Button>
                    )}
                  </div>
                </div>

                {canShowDangerActions && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" disabled={accountBusy} onClick={handleToggleBlocked}>
                      {member.status === "active" ? "Blokkeren" : "Deblokkeren"}
                    </Button>
                    <Button size="sm" variant="danger" disabled={accountBusy} onClick={() => setConfirmDelete(true)}>
                      Verwijderen
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {tab === "account" && isSelf && (
            <Card>
              <CardHeader title="Feedback" subtitle="Deel jouw ervaring of meld een probleem" action={<MessageSquare size={16} className="text-gray-400" />} />
              <div className="space-y-4">
                <div>
                  <FieldLabel>Categorie</FieldLabel>
                  <select value={fbCategorie} onChange={(e) => setFbCategorie(e.target.value)} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
                    <option value="">Kies een categorie</option>
                    <option value="bug">Bug</option>
                    <option value="idee">Idee</option>
                    <option value="vraag">Vraag</option>
                    <option value="overig">Overig</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Onderwerp</FieldLabel>
                  <input type="text" value={fbOnderwerp} onChange={(e) => setFbOnderwerp(e.target.value)} placeholder="Waar gaat jouw feedback over?"
                    className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
                </div>
                <div>
                  <FieldLabel>Bericht</FieldLabel>
                  <textarea value={fbBericht} onChange={(e) => setFbBericht(e.target.value)} placeholder="Beschrijf jouw feedback zo duidelijk mogelijk..." rows={4}
                    className="w-full text-sm rounded-xl border px-3 py-2.5 focus:outline-none resize-none" style={inputStyle} />
                </div>
                <div>
                  <Button size="sm" disabled={fbSending || !fbOnderwerp.trim() || !fbBericht.trim()} onClick={handleFeedback}>
                    {fbSending ? "Versturen..." : "Verstuur feedback"}
                  </Button>
                  <p className="text-[11px] text-gray-400 mt-2">Wordt verstuurd naar info@reva-app.nl</p>
                </div>
              </div>
            </Card>
          )}

          {confirmDelete && (
            <ConfirmDialog
              title="Medewerker verwijderen?"
              message={`Dit verwijdert ${member.fullName || "deze medewerker"} permanent uit jouw organisatie. Deze actie kan niet ongedaan worden gemaakt.`}
              confirmLabel="Verwijderen"
              loading={accountBusy}
              onCancel={() => setConfirmDelete(false)}
              onConfirm={handleDelete}
            />
          )}

          {confirmMfaReset && (
            <ConfirmDialog
              title="Tweestapsverificatie resetten?"
              message={`${member.fullName || "Deze medewerker"} moet dan bij de volgende keer inloggen opnieuw een authenticator-app koppelen.`}
              confirmLabel="Resetten"
              loading={accountBusy}
              onCancel={() => setConfirmMfaReset(false)}
              onConfirm={handleMfaReset}
            />
          )}
        </>
      )}
      {toastNode}
    </div>
  );
}
