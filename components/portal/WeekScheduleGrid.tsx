"use client";

import { weekDates } from "@/lib/dateUtils";
import type { PortalRoom, PortalReservation, PortalStaffLeave, PortalOpeningHours } from "@/lib/services/portalService";

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAY_LABELS_SHORT = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

const ROOM_COLORS = [
  "#e8632a", "#3b82f6", "#16a34a", "#8b5cf6", "#eab308", "#ec4899", "#0d9488", "#6366f1",
];

const PX_PER_MINUTE = 1.1;
const FALLBACK_START_MIN = 8 * 60;
const FALLBACK_END_MIN = 18 * 60;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function isoTimeToMinutes(iso: string): number {
  return timeToMinutes(iso.slice(11, 16));
}

function fmtTime(iso: string): string {
  return iso.slice(11, 16);
}

/**
 * Tijdsbereik van het raster: standaard de locatie-openingstijden (min
 * `from`/max `to` over de week), opgerekt zodra een reservering daarbuiten
 * valt zodat niets wordt afgesneden. Zonder openingstijden (of ruimtes
 * archief-locatie) een redelijke vaste vangnet-marge.
 */
function computeGridBounds(openingHours: PortalOpeningHours | null, reservations: PortalReservation[]): { startMin: number; endMin: number } {
  let startMin = Infinity;
  let endMin = -Infinity;

  if (openingHours) {
    for (const key of DAY_KEYS) {
      const day = openingHours[key];
      if (!day?.open) continue;
      startMin = Math.min(startMin, timeToMinutes(day.from));
      endMin = Math.max(endMin, timeToMinutes(day.to));
    }
  }

  for (const r of reservations) {
    startMin = Math.min(startMin, isoTimeToMinutes(r.startsAt));
    endMin = Math.max(endMin, isoTimeToMinutes(r.endsAt));
  }

  if (!isFinite(startMin) || !isFinite(endMin) || endMin <= startMin) {
    return { startMin: FALLBACK_START_MIN, endMin: FALLBACK_END_MIN };
  }
  // Afronden op hele uren zodat de uur-lijnen netjes aansluiten.
  return { startMin: Math.floor(startMin / 60) * 60, endMin: Math.ceil(endMin / 60) * 60 };
}

interface LaidOutReservation {
  reservation: PortalReservation;
  lane: number;
  laneCount: number;
}

/**
 * Klassiek kalender-event-layout-algoritme: overlappende reserveringen
 * binnen een dag komen naast elkaar te staan i.p.v. over elkaar heen.
 * Sorteert op starttijd, wijst elke reservering toe aan de eerste vrije
 * "baan", en herkent aaneengesloten clusters van overlap (zodra er een gat
 * is zonder actieve reservering, begint een nieuw cluster met zijn eigen
 * baantelling).
 */
function layoutDayEvents(reservations: PortalReservation[]): LaidOutReservation[] {
  const sorted = [...reservations].sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.endsAt.localeCompare(b.endsAt));
  const laneOf = new Map<string, number>();
  const laneCountOfCluster: { ids: string[]; laneCount: number }[] = [];

  let cluster: string[] = [];
  let clusterEnd = "";
  let lanesEnds: string[] = [];

  function flushCluster() {
    if (cluster.length === 0) return;
    laneCountOfCluster.push({ ids: cluster, laneCount: lanesEnds.length });
    cluster = [];
    lanesEnds = [];
  }

  for (const r of sorted) {
    if (cluster.length > 0 && r.startsAt >= clusterEnd) {
      flushCluster();
      clusterEnd = "";
    }
    let laneIndex = lanesEnds.findIndex((end) => end <= r.startsAt);
    if (laneIndex === -1) {
      laneIndex = lanesEnds.length;
      lanesEnds.push(r.endsAt);
    } else {
      lanesEnds[laneIndex] = r.endsAt;
    }
    laneOf.set(r.id, laneIndex);
    cluster.push(r.id);
    clusterEnd = clusterEnd === "" || r.endsAt > clusterEnd ? r.endsAt : clusterEnd;
  }
  flushCluster();

  const laneCountOf = new Map<string, number>();
  for (const c of laneCountOfCluster) {
    for (const id of c.ids) laneCountOf.set(id, c.laneCount);
  }

  return sorted.map((r) => ({ reservation: r, lane: laneOf.get(r.id) ?? 0, laneCount: laneCountOf.get(r.id) ?? 1 }));
}

export function WeekScheduleGrid({
  weekStart, rooms, reservations, leave, openingHours,
}: {
  weekStart: string;
  rooms: PortalRoom[];
  reservations: PortalReservation[];
  leave: PortalStaffLeave[];
  openingHours: PortalOpeningHours | null;
}) {
  const days = weekDates(weekStart);
  const { startMin, endMin } = computeGridBounds(openingHours, reservations);
  const totalMin = endMin - startMin;
  const gridHeight = totalMin * PX_PER_MINUTE;
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const hourMarks: number[] = [];
  for (let m = Math.ceil(startMin / 60) * 60; m <= endMin; m += 60) hourMarks.push(m);

  const roomColor = (roomId: string) => {
    const idx = rooms.findIndex((r) => r.id === roomId);
    return ROOM_COLORS[idx >= 0 ? idx % ROOM_COLORS.length : 0];
  };
  const roomName = (roomId: string) => rooms.find((r) => r.id === roomId)?.name ?? "Onbekende ruimte";

  return (
    <div className="overflow-x-auto">
      <div className="flex" style={{ minWidth: 880 }}>
        <div className="w-14 shrink-0" />
        {days.map((day, i) => {
          const dayLeave = leave.filter((l) => l.startsOn <= day && day <= l.endsOn);
          const isToday = day === today;
          return (
            <div key={day} className="flex-1 min-w-[120px] px-1 text-center">
              <p className={`text-xs font-semibold ${isToday ? "" : "text-gray-500"}`} style={isToday ? { color: "var(--brand-accent, #e8632a)" } : undefined}>
                {DAY_LABELS_SHORT[i]} {day.slice(8, 10)}
              </p>
              {dayLeave.length > 0 && (
                <p className="text-[11px] text-subtle mt-0.5 truncate" title={dayLeave.map((l) => l.membershipName ?? "Onbekend").join(", ")}>
                  Op verlof: {dayLeave.map((l) => l.membershipName ?? "Onbekend").join(", ")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex mt-2" style={{ minWidth: 880 }}>
        <div className="w-14 shrink-0 relative" style={{ height: gridHeight }}>
          {hourMarks.map((m) => (
            <span
              key={m}
              className="absolute right-2 text-[11px] text-subtle -translate-y-1/2"
              style={{ top: (m - startMin) * PX_PER_MINUTE }}
            >
              {String(Math.floor(m / 60)).padStart(2, "0")}:00
            </span>
          ))}
        </div>

        {days.map((day) => {
          const dayReservations = reservations.filter((r) => r.startsAt.slice(0, 10) === day);
          const laidOut = layoutDayEvents(dayReservations);
          const isToday = day === today;
          return (
            <div
              key={day}
              className="flex-1 min-w-[120px] relative mx-0.5 rounded-lg"
              style={{ height: gridHeight, background: isToday ? "#fff8f5" : "#faf9f6", border: "1px solid #f0eee8" }}
            >
              {hourMarks.map((m) => (
                <div key={m} className="absolute left-0 right-0" style={{ top: (m - startMin) * PX_PER_MINUTE, borderTop: "1px solid #f0eee8" }} />
              ))}
              {laidOut.map(({ reservation, lane, laneCount }) => {
                const top = (isoTimeToMinutes(reservation.startsAt) - startMin) * PX_PER_MINUTE;
                const height = Math.max(18, (isoTimeToMinutes(reservation.endsAt) - isoTimeToMinutes(reservation.startsAt)) * PX_PER_MINUTE);
                const widthPct = 100 / laneCount;
                return (
                  <div
                    key={reservation.id}
                    className="absolute rounded-md px-1.5 py-1 overflow-hidden text-white"
                    style={{
                      top, height,
                      left: `calc(${lane * widthPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      background: roomColor(reservation.roomId),
                    }}
                    title={`${roomName(reservation.roomId)} · ${reservation.membershipName ?? "Onbekend"} · ${fmtTime(reservation.startsAt)}–${fmtTime(reservation.endsAt)}`}
                  >
                    <p className="text-[10px] font-semibold leading-tight truncate">{reservation.membershipName ?? "Onbekend"}</p>
                    <p className="text-[9px] leading-tight truncate opacity-90">{roomName(reservation.roomId)}</p>
                    <p className="text-[9px] leading-tight truncate opacity-90">{fmtTime(reservation.startsAt)}–{fmtTime(reservation.endsAt)}</p>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {rooms.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4">
          {rooms.map((room, i) => (
            <div key={room.id} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ROOM_COLORS[i % ROOM_COLORS.length] }} />
              <span className="text-xs text-gray-500">{room.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
