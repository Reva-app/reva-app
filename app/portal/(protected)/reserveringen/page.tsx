"use client";

import { useEffect, useState } from "react";
import { Plus, Sparkles, Trash2, X, Check, Loader2, DoorOpen, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { DatePicker } from "@/components/ui/DatePicker";
import { useToast } from "@/components/ui/Toast";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { mondayOfWeek, weekDates } from "@/lib/dateUtils";
import { formatDate, appointmentTypeLabel, type AppointmentType } from "@/lib/data";
import { WeekScheduleGrid } from "@/components/portal/WeekScheduleGrid";
import {
  loadPortalLocations, loadPortalMembers, loadLocationRooms, loadRoomReservations,
  loadWorkSchedulesForLocation, createReservation, deleteReservation,
  loadRoomReservationsForWeek, loadStaffLeaveForLocation, loadOrgAppointmentsForWeek, loadPortalLocationFull,
  canViewClinicalData,
  type PortalLocationOption, type PortalMember, type PortalRoom, type PortalReservation,
  type PortalStaffLeave, type PortalWeekAppointment, type PortalOpeningHours,
} from "@/lib/services/portalService";
import { suggestRoomAllocations, type RoomSuggestion, type UnassignedDemand } from "@/lib/services/roomSuggestionService";

const inputStyle = { borderColor: "#e8e5df", background: "#ffffff", color: "#1a1a1a" };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmtTime(iso: string) {
  return iso.slice(11, 16);
}

type ViewMode = "dag" | "week";

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const options: { value: ViewMode; label: string }[] = [{ value: "dag", label: "Dag" }, { value: "week", label: "Week" }];
  return (
    <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: "#f3f0eb" }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className="text-xs font-medium px-2.5 py-1 rounded-md transition-colors"
          style={
            value === o.value
              ? { background: "#ffffff", color: "#1a1a1a", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }
              : { color: "#9ca3af" }
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

interface NewReservationForm {
  roomId: string;
  membershipId: string;
  startTime: string;
  endTime: string;
}

function ReservationFormModal({
  rooms, members, initialRoomId, date, onClose, onSaved,
}: {
  rooms: PortalRoom[];
  members: PortalMember[];
  initialRoomId: string | null;
  date: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<NewReservationForm>({
    roomId: initialRoomId ?? rooms[0]?.id ?? "",
    membershipId: members[0]?.membershipId ?? "",
    startTime: "09:00",
    endTime: "10:00",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!form.roomId || !form.membershipId) return;
    if (form.endTime <= form.startTime) { setError("Eindtijd moet na de starttijd liggen."); return; }
    setSaving(true);
    setError("");
    const { error: saveError } = await createReservation({
      roomId: form.roomId, membershipId: form.membershipId,
      startsAt: `${date}T${form.startTime}:00`, endsAt: `${date}T${form.endTime}:00`,
    }, null);
    setSaving(false);
    if (saveError) { setError(saveError); return; }
    onSaved();
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-sm">
      <div className="rounded-2xl p-6" style={{ background: "#ffffff" }}>
        <h3 className="font-semibold text-gray-900 mb-4">Reservering toevoegen</h3>
        <div className="space-y-3 mb-5">
          <div>
            <FieldLabel>Ruimte</FieldLabel>
            <select value={form.roomId} onChange={(e) => setForm((p) => ({ ...p, roomId: e.target.value }))}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Fysio</FieldLabel>
            <select value={form.membershipId} onChange={(e) => setForm((p) => ({ ...p, membershipId: e.target.value }))}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
              {members.map((m) => <option key={m.membershipId} value={m.membershipId}>{m.fullName ?? m.email ?? "Onbekend"}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Van</FieldLabel>
              <input type="time" value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Tot</FieldLabel>
              <input type="time" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
          </div>
          {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={onClose} disabled={saving}>Annuleren</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || rooms.length === 0 || members.length === 0}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : "Toevoegen"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function ReserveringenPage() {
  const { checked, membership } = usePortalMembership();
  const { showToast, toastNode } = useToast();

  const [locations, setLocations] = useState<PortalLocationOption[]>([]);
  const [locationId, setLocationId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [members, setMembers] = useState<PortalMember[]>([]);
  const [rooms, setRooms] = useState<PortalRoom[]>([]);
  const [reservations, setReservations] = useState<PortalReservation[]>([]);
  const [loading, setLoading] = useState(true);

  const [formTarget, setFormTarget] = useState<{ roomId: string | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PortalReservation | null>(null);

  const [suggesting, setSuggesting] = useState(false);
  const [preview, setPreview] = useState<{ suggestions: RoomSuggestion[]; unassigned: UnassignedDemand[] } | null>(null);
  const [applyingAll, setApplyingAll] = useState(false);

  // Weekweergave (tijdas) — los van de dag-state hierboven, die blijft
  // ongewijzigd voor de bestaande AI-suggestie-flow.
  const [view, setView] = useState<ViewMode>("dag");
  const [weekStart, setWeekStart] = useState(mondayOfWeek());
  const [weekReservations, setWeekReservations] = useState<PortalReservation[]>([]);
  const [weekLeave, setWeekLeave] = useState<PortalStaffLeave[]>([]);
  const [weekAppointments, setWeekAppointments] = useState<PortalWeekAppointment[]>([]);
  const [weekOpeningHours, setWeekOpeningHours] = useState<PortalOpeningHours | null>(null);
  const [weekLoading, setWeekLoading] = useState(true);

  useEffect(() => {
    if (!checked || !membership) return;
    loadPortalLocations(membership.organizationId).then((locs) => {
      setLocations(locs);
      if (locs.length > 0) setLocationId((prev) => prev || locs[0].id);
    });
    loadPortalMembers(membership.organizationId).then(setMembers);
  }, [checked, membership]);

  function refresh() {
    if (!locationId) return;
    setLoading(true);
    Promise.all([loadLocationRooms(locationId), loadRoomReservations(locationId, date)]).then(([roomsData, reservationsData]) => {
      setRooms(roomsData.filter((r) => !r.archived));
      setReservations(reservationsData);
      setLoading(false);
    });
  }

  useEffect(() => {
    setPreview(null);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, date]);

  function refreshWeek() {
    if (!locationId || !membership) return;
    setWeekLoading(true);
    Promise.all([
      loadRoomReservationsForWeek(locationId, weekStart),
      loadStaffLeaveForLocation(locationId, weekStart),
      loadOrgAppointmentsForWeek(membership.organizationId, weekStart),
      loadPortalLocationFull(locationId),
    ]).then(([reservationsData, leaveData, appointmentsData, locationFull]) => {
      setWeekReservations(reservationsData);
      setWeekLeave(leaveData);
      setWeekAppointments(appointmentsData);
      setWeekOpeningHours(locationFull?.openingHours ?? null);
      setWeekLoading(false);
    });
  }

  useEffect(() => {
    if (view !== "week") return;
    refreshWeek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, locationId, weekStart]);

  const activeRoomsForLocation = rooms;
  const locationMembers = members.filter((m) => m.locationId === locationId);

  async function handleGenerateSuggestion() {
    setSuggesting(true);
    const [schedules, leave] = await Promise.all([
      loadWorkSchedulesForLocation(locationId),
      loadStaffLeaveForLocation(locationId, mondayOfWeek(parseLocalDate(date))),
    ]);
    const result = suggestRoomAllocations({
      date, rooms: activeRoomsForLocation, schedules, existingReservations: reservations, leave,
    });
    setSuggesting(false);
    if (result.suggestions.length === 0 && result.unassigned.length === 0) {
      showToast("Geen fysio's met werkrooster op deze locatie voor deze dag.");
      return;
    }
    setPreview(result);
  }

  function memberName(membershipId: string) {
    return members.find((m) => m.membershipId === membershipId)?.fullName ?? "Onbekend";
  }

  async function handleAcceptSuggestion(s: RoomSuggestion) {
    const { error } = await createReservation({ roomId: s.roomId, membershipId: s.membershipId, startsAt: s.startsAt, endsAt: s.endsAt, source: "ai_suggested" }, null);
    if (error) { showToast(error, "error"); return; }
    setPreview((p) => p ? { ...p, suggestions: p.suggestions.filter((x) => x !== s) } : p);
    refresh();
  }

  async function handleAcceptAllSuggestions() {
    if (!preview) return;
    setApplyingAll(true);
    for (const s of preview.suggestions) {
      await createReservation({ roomId: s.roomId, membershipId: s.membershipId, startsAt: s.startsAt, endsAt: s.endsAt, source: "ai_suggested" }, null);
    }
    setApplyingAll(false);
    setPreview(null);
    showToast("Suggesties overgenomen");
    refresh();
  }

  function handleDismissSuggestion(s: RoomSuggestion) {
    setPreview((p) => p ? { ...p, suggestions: p.suggestions.filter((x) => x !== s) } : p);
  }

  async function handleDeleteReservation() {
    if (!confirmDelete) return;
    const { error } = await deleteReservation(confirmDelete.id);
    setConfirmDelete(null);
    if (error) { showToast(error, "error"); return; }
    refresh();
  }

  const suggestionsByRoom = new Map<string, RoomSuggestion[]>();
  for (const s of preview?.suggestions ?? []) {
    suggestionsByRoom.set(s.roomId, [...(suggestionsByRoom.get(s.roomId) ?? []), s]);
  }

  const weekRangeLabel = (() => {
    const days = weekDates(weekStart);
    return `${formatDate(days[0])} – ${formatDate(days[6])}`;
  })();

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader title="Reserveringen" subtitle="Ruimteverdeling per locatie en dag" />
        <ViewToggle value={view} onChange={setView} />
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px]">
            <FieldLabel>Locatie</FieldLabel>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {view === "dag" ? (
            <>
              <div className="min-w-[180px]">
                <FieldLabel>Datum</FieldLabel>
                <DatePicker value={date} onChange={setDate} />
              </div>
              <Button size="sm" variant="secondary" onClick={handleGenerateSuggestion} disabled={suggesting || !locationId}>
                {suggesting ? <Loader2 size={13} className="animate-spin" /> : <><Sparkles size={13} /> AI-suggestie genereren</>}
              </Button>
              {preview && preview.suggestions.length > 0 && (
                <Button size="sm" onClick={handleAcceptAllSuggestions} disabled={applyingAll}>
                  {applyingAll ? <Loader2 size={13} className="animate-spin" /> : "Alle suggesties overnemen"}
                </Button>
              )}
            </>
          ) : (
            <div className="flex items-end gap-2">
              <button type="button" onClick={() => setWeekStart(mondayOfWeek(new Date(parseLocalDate(weekStart).getTime() - 7 * 86_400_000)))}
                className="w-9 h-9 rounded-xl border flex items-center justify-center hover:bg-gray-50" style={{ borderColor: "#e8e5df" }} aria-label="Vorige week">
                <ChevronLeft size={15} className="text-gray-500" />
              </button>
              <div className="min-w-[200px]">
                <FieldLabel>Week</FieldLabel>
                <div className="flex items-center gap-1.5 text-sm text-gray-800 h-[38px]">
                  <CalendarDays size={14} className="text-gray-400" /> {weekRangeLabel}
                </div>
              </div>
              <button type="button" onClick={() => setWeekStart(mondayOfWeek(new Date(parseLocalDate(weekStart).getTime() + 7 * 86_400_000)))}
                className="w-9 h-9 rounded-xl border flex items-center justify-center hover:bg-gray-50" style={{ borderColor: "#e8e5df" }} aria-label="Volgende week">
                <ChevronRight size={15} className="text-gray-500" />
              </button>
              <Button size="sm" variant="secondary" onClick={() => setWeekStart(mondayOfWeek())}>Deze week</Button>
            </div>
          )}
        </div>
      </Card>

      {view === "week" ? (
        <>
          <Card>
            {weekLoading ? (
              <p className="text-sm text-gray-400">Laden…</p>
            ) : rooms.length === 0 ? (
              <EmptyState icon={DoorOpen} title="Geen ruimtes" description="Voeg eerst ruimtes toe bij deze locatie, via Locaties → locatiedetail." />
            ) : (
              <WeekScheduleGrid
                weekStart={weekStart}
                rooms={rooms}
                reservations={weekReservations}
                leave={weekLeave}
                openingHours={weekOpeningHours}
              />
            )}
          </Card>

          <Card>
            <CardHeader
              title="Afspraken deze week"
              subtitle={canViewClinicalData(membership?.roleKey)
                ? "Patiëntafspraken, ter info: nog niet gekoppeld aan een ruimte of fysio"
                : "Fysio-afspraken van patiënten, ter info: nog niet gekoppeld aan een ruimte"}
            />
            {weekLoading ? (
              <p className="text-sm text-gray-400">Laden…</p>
            ) : weekAppointments.length === 0 ? (
              <p className="text-sm text-gray-400">Geen afspraken deze week.</p>
            ) : (
              <div className="space-y-4">
                {weekDates(weekStart).map((day) => {
                  const dayAppointments = weekAppointments.filter((a) => a.date === day);
                  if (dayAppointments.length === 0) return null;
                  return (
                    <div key={day}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{formatDate(day)}</p>
                      <div className="space-y-1.5">
                        {dayAppointments.map((a) => (
                          <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2" style={{ background: "#f8f7f4" }}>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-800 truncate">
                                {a.patientName ?? "Onbekende patiënt"}
                                {a.title ? ` · ${a.title}` : a.appointmentType ? ` · ${appointmentTypeLabel(a.appointmentType as AppointmentType)}` : ""}
                              </p>
                              <p className="text-[11px] text-gray-400 truncate">
                                {a.time ?? "Tijd onbekend"}{a.providerName ? ` · ${a.providerName}` : ""}{a.location ? ` · ${a.location}` : ""}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      ) : (
        <>
      {preview && preview.unassigned.length > 0 && (
        <div className="rounded-2xl px-4 py-3" style={{ background: "#fefce8", border: "1px solid #fde68a" }}>
          <p className="text-xs font-semibold text-amber-800 mb-1">Niet ingepland: geen vrije ruimte meer</p>
          <div className="space-y-0.5">
            {preview.unassigned.map((u, i) => (
              <p key={i} className="text-xs text-amber-700">{memberName(u.membershipId)}: {fmtTime(u.startsAt)}–{fmtTime(u.endsAt)}</p>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Laden…</p>
      ) : rooms.length === 0 ? (
        <EmptyState icon={DoorOpen} title="Geen ruimtes" description="Voeg eerst ruimtes toe bij deze locatie, via Locaties → locatiedetail." />
      ) : locationMembers.length === 0 ? (
        <div className="rounded-2xl px-4 py-3 text-sm text-gray-500" style={{ background: "#f8f7f4", border: "1px solid #e8e5df" }}>
          Geen medewerkers met deze locatie als hoofdlocatie: de AI-suggestie heeft dan niemand om in te plannen. Handmatig reserveren blijft mogelijk.
        </div>
      ) : null}

      {!loading && rooms.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => {
            const roomReservations = reservations.filter((r) => r.roomId === room.id).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
            const roomSuggestions = suggestionsByRoom.get(room.id) ?? [];
            return (
              <Card key={room.id} padding="sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><DoorOpen size={13} className="text-gray-400" /> {room.name}</h3>
                  <button type="button" onClick={() => setFormTarget({ roomId: room.id })}
                    className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-gray-100">
                    <Plus size={13} className="text-gray-400" />
                  </button>
                </div>
                {roomReservations.length === 0 && roomSuggestions.length === 0 ? (
                  <p className="text-xs text-gray-400">Geen reserveringen</p>
                ) : (
                  <div className="space-y-1.5">
                    {roomReservations.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2" style={{ background: "#f8f7f4" }}>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{r.membershipName ?? "Onbekend"}</p>
                          <p className="text-[11px] text-gray-400">{fmtTime(r.startsAt)}–{fmtTime(r.endsAt)}</p>
                        </div>
                        <button type="button" onClick={() => setConfirmDelete(r)} className="shrink-0 p-1 text-gray-300 hover:text-red-400">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    {roomSuggestions.map((s, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 border-2 border-dashed" style={{ background: "#fff8f5", borderColor: "#e8632a55" }}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="accent">Suggestie</Badge>
                          </div>
                          <p className="text-xs font-medium text-gray-800 truncate mt-1">{memberName(s.membershipId)}</p>
                          <p className="text-[11px] text-gray-400">{fmtTime(s.startsAt)}–{fmtTime(s.endsAt)}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button type="button" onClick={() => handleAcceptSuggestion(s)} className="p-1 text-gray-400 hover:text-green-600" aria-label="Overnemen">
                            <Check size={13} />
                          </button>
                          <button type="button" onClick={() => handleDismissSuggestion(s)} className="p-1 text-gray-300 hover:text-red-400" aria-label="Negeren">
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
        </>
      )}

      {formTarget && (
        <ReservationFormModal
          rooms={rooms}
          members={members}
          initialRoomId={formTarget.roomId}
          date={date}
          onClose={() => setFormTarget(null)}
          onSaved={() => { setFormTarget(null); showToast("Reservering toegevoegd"); refresh(); }}
        />
      )}

      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)} maxWidth="max-w-sm">
          <div className="rounded-2xl p-6" style={{ background: "#ffffff" }}>
            <h3 className="font-semibold text-gray-900 mb-2">Reservering verwijderen?</h3>
            <p className="text-sm text-gray-500 mb-5">
              {confirmDelete.membershipName ?? "Onbekend"}, {fmtTime(confirmDelete.startsAt)}–{fmtTime(confirmDelete.endsAt)} wordt verwijderd.
            </p>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(null)}>Annuleren</Button>
              <Button size="sm" onClick={handleDeleteReservation}>Verwijderen</Button>
            </div>
          </div>
        </Modal>
      )}
      {toastNode}
    </div>
  );
}
