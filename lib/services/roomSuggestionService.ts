// ─── Ruimteverdeling-suggestie ──────────────────────────────────────────────
// Regel-gebaseerde suggestie voor de dagelijkse ruimteverdeling, uitsluitend
// berekend uit al aanwezige data (werkrooster + bestaande reserveringen).
// Geen externe AI-dienst — zelfde stijl als lib/intakeAnalysis.ts/lib/coach.ts:
// één pure functie, geen netwerk. Wijst elke werkende fysio toe aan de eerste
// vrije ruimte voor hun tijdvak; fysio's die niet meer passen blijven expliciet
// "niet ingepland" in plaats van stil te verdwijnen. Bestaande (handmatige)
// reserveringen worden altijd gerespecteerd, nooit overschreven.

import type { PortalRoom, PortalReservation, PortalWorkSchedule, PortalStaffLeave } from "./portalService";

const WEEKDAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function weekdayForDate(date: string): (typeof WEEKDAY_KEYS)[number] {
  // "YYYY-MM-DD" als lokale datum interpreteren, niet UTC middernacht-shift.
  const [y, m, d] = date.split("-").map(Number);
  return WEEKDAY_KEYS[new Date(y, m - 1, d).getDay()];
}

interface Interval {
  startsAt: string;
  endsAt: string;
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

export interface RoomSuggestion {
  roomId: string;
  membershipId: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
}

export interface UnassignedDemand {
  membershipId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
}

export interface RoomSuggestionResult {
  suggestions: RoomSuggestion[];
  unassigned: UnassignedDemand[];
}

export interface RoomSuggestionInput {
  date: string; // "YYYY-MM-DD"
  rooms: PortalRoom[];
  schedules: { membershipId: string; workingHours: PortalWorkSchedule }[];
  existingReservations: PortalReservation[];
  /** Optioneel — medewerkers met verlof die de opgevraagde datum dekt worden niet voorgesteld. */
  leave?: PortalStaffLeave[];
}

function isOnLeave(membershipId: string, date: string, leave: PortalStaffLeave[]): boolean {
  return leave.some((l) => l.membershipId === membershipId && l.startsOn <= date && date <= l.endsOn);
}

export function suggestRoomAllocations(input: RoomSuggestionInput): RoomSuggestionResult {
  const activeRooms = input.rooms.filter((r) => !r.archived);
  if (activeRooms.length === 0) return { suggestions: [], unassigned: [] };

  const weekday = weekdayForDate(input.date);
  const leave = input.leave ?? [];

  const demands: (Interval & { membershipId: string })[] = input.schedules
    .filter((s) => !isOnLeave(s.membershipId, input.date, leave))
    .map((s) => {
      const day = s.workingHours[weekday];
      if (!day || day.isOff) return null;
      return {
        membershipId: s.membershipId,
        startsAt: `${input.date}T${day.startTime}:00`,
        endsAt: `${input.date}T${day.endTime}:00`,
      };
    })
    .filter((d): d is { membershipId: string; startsAt: string; endsAt: string } => d !== null)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  // Per ruimte: alle al bezette tijdvakken die dag (bestaande reserveringen),
  // aangevuld met wat we deze run zelf toewijzen.
  const occupiedByRoom = new Map<string, Interval[]>(
    activeRooms.map((r) => [r.id, input.existingReservations.filter((res) => res.roomId === r.id).map((res) => ({ startsAt: res.startsAt, endsAt: res.endsAt }))])
  );

  const suggestions: RoomSuggestion[] = [];
  const unassigned: UnassignedDemand[] = [];

  for (const demand of demands) {
    const freeRoom = activeRooms.find((room) => {
      const occupied = occupiedByRoom.get(room.id) ?? [];
      return !occupied.some((iv) => overlaps(iv, demand));
    });

    if (!freeRoom) {
      unassigned.push({ ...demand, reason: "Geen vrije ruimte voor dit tijdvak" });
      continue;
    }

    suggestions.push({ roomId: freeRoom.id, membershipId: demand.membershipId, startsAt: demand.startsAt, endsAt: demand.endsAt });
    occupiedByRoom.get(freeRoom.id)!.push({ startsAt: demand.startsAt, endsAt: demand.endsAt });
  }

  return { suggestions, unassigned };
}
