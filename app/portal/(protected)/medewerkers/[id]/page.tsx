"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatDate } from "@/lib/data";
import {
  loadPortalStaffOverview, loadPortalLocations, loadPortalRoles,
  loadMembershipLocations, updateMembershipLocations,
  loadWorkSchedule, updateWorkSchedule, DEFAULT_WORK_SCHEDULE, WEEKDAY_LABELS,
  updateStaffMember, updateStaffProfile, deleteStaffMember,
  MANAGE_STAFF_ROLES, PORTAL_STAFF_STATUS_LABELS,
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
  organization_owner: "Practice Owner heeft volledige toegang: kan medewerkers uitnodigen en verwijderen, vestigingen en huisstijl beheren, en alle patiëntdossiers inzien en bewerken.",
  therapist: "Fysiotherapeut kan patiëntdossiers aanmaken, inzien en bewerken, behandelplannen beheren en eigen werkuren instellen. Geen toegang tot vestigingen- of huisstijlbeheer.",
  practice_staff: "Praktijkmedewerker kan patiëntdossiers en contactgegevens beheren en eigen werkuren instellen. Geen toegang tot vestigingen-, huisstijl- of medewerkersbeheer.",
};

function initials(name: string | null, email: string | null) {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function Avatar({ member }: { member: PortalStaffMember }) {
  if (member.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={member.avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover shrink-0" />
    );
  }
  return (
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold text-white shrink-0"
      style={{ background: "var(--brand-accent, #e8632a)" }}
    >
      {initials(member.fullName, member.email)}
    </div>
  );
}

type TabKey = "algemeen" | "werkuren" | "vestigingen" | "rol" | "account";

const TAB_OPTIONS: { value: TabKey; label: string }[] = [
  { value: "algemeen", label: "Algemene gegevens" },
  { value: "werkuren", label: "Werkuren" },
  { value: "vestigingen", label: "Vestigingen" },
  { value: "rol", label: "Rol" },
  { value: "account", label: "Account" },
];

export default function PortalStaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const membershipId = params.id as string;
  const { checked, membership } = usePortalMembership();
  const { user } = useAuth();

  const [member, setMember] = useState<PortalStaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<TabKey>("algemeen");

  const [locations, setLocations] = useState<PortalLocationOption[]>([]);
  const [roles, setRoles] = useState<PortalRoleOption[]>([]);

  // Tab 1
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [bigNumber, setBigNumber] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Tab 2
  const [schedule, setSchedule] = useState<PortalWorkSchedule>(DEFAULT_WORK_SCHEDULE);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  // Tab 3
  const [mainLocationId, setMainLocationId] = useState("");
  const [extraLocationIds, setExtraLocationIds] = useState<string[]>([]);
  const [locationsLoaded, setLocationsLoaded] = useState(false);
  const [savingLocations, setSavingLocations] = useState(false);
  const [locationsSaved, setLocationsSaved] = useState(false);

  // Tab 4
  const [roleId, setRoleId] = useState("");
  const [savingRole, setSavingRole] = useState(false);
  const [roleSaved, setRoleSaved] = useState(false);
  const [roleError, setRoleError] = useState("");

  // Tab 5
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canManage = !!membership && MANAGE_STAFF_ROLES.includes(membership.roleKey);
  const isSelf = !!user && member?.userId === user.id;
  const canEditGeneral = canManage || isSelf;

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
    if (tab !== "werkuren" || scheduleLoaded) return;
    loadWorkSchedule(membershipId).then((data) => {
      setSchedule(data);
      setScheduleLoaded(true);
    });
  }, [tab, scheduleLoaded, membershipId]);

  useEffect(() => {
    if (tab !== "vestigingen" || locationsLoaded) return;
    loadMembershipLocations(membershipId).then((ids) => {
      setExtraLocationIds(ids);
      setLocationsLoaded(true);
    });
  }, [tab, locationsLoaded, membershipId]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!member?.userId) return;
    setSavingProfile(true);
    setProfileSaved(false);
    const { error } = await updateStaffProfile(member.userId, {
      firstName, lastName, phone: phone || null, title: title || null, bigNumber: bigNumber || null,
    });
    setSavingProfile(false);
    if (!error) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
      if (membership) refresh(membership.organizationId);
    }
  }

  async function handleSaveSchedule() {
    setSavingSchedule(true);
    setScheduleSaved(false);
    const { error } = await updateWorkSchedule(membershipId, schedule);
    setSavingSchedule(false);
    if (!error) {
      setScheduleSaved(true);
      setTimeout(() => setScheduleSaved(false), 2500);
    }
  }

  async function handleSaveLocations() {
    if (!membership) return;
    setSavingLocations(true);
    setLocationsSaved(false);
    const results = await Promise.all([
      updateStaffMember(membershipId, { locationId: mainLocationId || null }),
      updateMembershipLocations(membershipId, extraLocationIds),
    ]);
    setSavingLocations(false);
    if (!results[0].error && !results[1].error) {
      setLocationsSaved(true);
      setTimeout(() => setLocationsSaved(false), 2500);
      refresh(membership.organizationId);
    }
  }

  async function handleSaveRole() {
    if (!membership) return;
    setSavingRole(true);
    setRoleSaved(false);
    setRoleError("");
    const { error } = await updateStaffMember(membershipId, { roleId });
    setSavingRole(false);
    if (error) { setRoleError(error); return; }
    setRoleSaved(true);
    setTimeout(() => setRoleSaved(false), 2500);
    refresh(membership.organizationId);
  }

  async function handleToggleBlocked() {
    if (!membership || !member) return;
    setAccountBusy(true);
    setAccountError("");
    const { error } = await updateStaffMember(membershipId, { status: member.status === "active" ? "suspended" : "active" });
    setAccountBusy(false);
    if (error) { setAccountError(error); return; }
    refresh(membership.organizationId);
  }

  async function handleDelete() {
    setAccountBusy(true);
    setAccountError("");
    const { error } = await deleteStaffMember(membershipId);
    setAccountBusy(false);
    if (error) { setAccountError(error); return; }
    router.push("/portal/medewerkers");
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => router.push("/portal/medewerkers")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> Terug naar medewerkers
      </button>

      {loading ? (
        <p className="text-sm text-gray-400">Laden…</p>
      ) : notFound || !member ? (
        <p className="text-sm text-gray-400">Deze medewerker is niet gevonden.</p>
      ) : (
        <>
          <div className="flex items-center gap-4 flex-wrap">
            <Avatar member={member} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <SectionHeader title={member.fullName || member.email || "Onbekend"} />
                {isSelf && <span className="text-xs text-gray-400">(jij)</span>}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={member.roleKey === "organization_owner" ? "accent" : member.roleKey === "therapist" ? "blue" : "default"}>
                  {member.roleName}
                </Badge>
                {member.status === "active" ? (
                  <Badge variant="success">{PORTAL_STAFF_STATUS_LABELS.active}</Badge>
                ) : (
                  <Badge variant="muted">{PORTAL_STAFF_STATUS_LABELS.suspended}</Badge>
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
                    {savingProfile ? <Loader2 size={13} className="animate-spin" /> : profileSaved ? <><Check size={13} /> Opgeslagen</> : "Opslaan"}
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
                      <div key={day} className="flex items-center gap-3">
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
                          <div className="flex items-center gap-2">
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
                      {savingSchedule ? <Loader2 size={13} className="animate-spin" /> : scheduleSaved ? <><Check size={13} /> Opgeslagen</> : "Opslaan"}
                    </Button>
                  )}
                </div>
              )}
            </Card>
          )}

          {tab === "vestigingen" && (
            <Card>
              <CardHeader title="Vestigingen" subtitle={canManage ? undefined : "Alleen de Practice Owner kan dit bewerken."} />
              {!locationsLoaded ? (
                <p className="text-sm text-gray-400">Laden…</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <FieldLabel>Hoofdvestiging</FieldLabel>
                    <select
                      value={mainLocationId} onChange={(e) => setMainLocationId(e.target.value)} disabled={!canManage}
                      className="w-full sm:w-80 text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60" style={inputStyle}
                    >
                      <option value="">Hele organisatie</option>
                      {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Overige vestigingen</FieldLabel>
                    {locations.length === 0 ? (
                      <p className="text-sm text-gray-400">Geen andere vestigingen beschikbaar.</p>
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
                      {savingLocations ? <Loader2 size={13} className="animate-spin" /> : locationsSaved ? <><Check size={13} /> Opgeslagen</> : "Opslaan"}
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
                    {savingRole ? <Loader2 size={13} className="animate-spin" /> : roleSaved ? <><Check size={13} /> Opgeslagen</> : "Opslaan"}
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
                  <div><span className="text-gray-500">Laatste login:</span> <span className="text-gray-800">{member.lastSignInAt ? formatDate(member.lastSignInAt) : "Nog niet ingelogd"}</span></div>
                </div>

                <div className="rounded-xl border p-4" style={{ borderColor: "#e8e5df" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Tweestapsverificatie</p>
                      <p className="text-xs text-gray-400 mt-0.5">Binnenkort beschikbaar</p>
                    </div>
                    <button type="button" disabled className="w-10 h-6 rounded-full opacity-40 cursor-not-allowed" style={{ background: "#e8e5df" }}>
                      <span className="block w-4 h-4 rounded-full bg-white ml-1" />
                    </button>
                  </div>
                </div>

                {canManage && !isSelf && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" disabled={accountBusy} onClick={handleToggleBlocked}>
                      {member.status === "active" ? "Blokkeren" : "Deblokkeren"}
                    </Button>
                    <Button size="sm" variant="danger" disabled={accountBusy} onClick={() => setConfirmDelete(true)}>
                      Verwijderen
                    </Button>
                  </div>
                )}
                {accountError && <p className="text-xs" style={{ color: "#dc2626" }}>{accountError}</p>}
              </div>
            </Card>
          )}

          {confirmDelete && (
            <Modal onClose={() => setConfirmDelete(false)} maxWidth="max-w-sm">
              <div className="rounded-2xl p-6" style={{ background: "#ffffff" }}>
                <h3 className="font-semibold text-gray-900 mb-2">Medewerker verwijderen?</h3>
                <p className="text-sm text-gray-500 mb-5">
                  Dit verwijdert {member.fullName || "deze medewerker"} permanent uit jouw organisatie. Deze actie kan niet ongedaan worden gemaakt.
                </p>
                {accountError && <p className="text-xs mb-3" style={{ color: "#dc2626" }}>{accountError}</p>}
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>Annuleren</Button>
                  <Button size="sm" variant="danger" disabled={accountBusy} onClick={handleDelete}>Verwijderen</Button>
                </div>
              </div>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}
