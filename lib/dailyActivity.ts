import type { Appointment, CheckIn, DagboekWorkout, MedicatieLog } from "@/lib/data";
import type { ProtocolSessionLogSummary } from "@/lib/services/patientProtocolService";

export interface DailyActivity {
  checkIn: CheckIn | null;
  appointments: Appointment[];
  workouts: DagboekWorkout[];
  medicatie: MedicatieLog[];
  protocolSessions: ProtocolSessionLogSummary[];
}

/**
 * Alle activiteit van één specifieke dag, uit de bronnen die stuk voor stuk
 * een "date": "YYYY-MM-DD"-veld gebruiken. checkIn is een find (één per
 * dag); de rest zijn filters (meerdere per dag mogelijk). protocolSessions
 * is optioneel — vrije training (dagboekWorkouts) en protocol-training
 * (patient_protocol_session_logs) zijn twee losse bronnen; een patiënt met
 * een actief protocol logt via de laatste, niet via addDagboekWorkout.
 */
export function getActivityForDate(
  dateStr: string,
  data: {
    checkIns: CheckIn[];
    appointments: Appointment[];
    dagboekWorkouts: DagboekWorkout[];
    medicatie: MedicatieLog[];
    protocolSessionLogs?: ProtocolSessionLogSummary[];
  }
): DailyActivity {
  return {
    checkIn: data.checkIns.find((c) => c.date === dateStr) ?? null,
    appointments: data.appointments.filter((a) => a.date === dateStr),
    workouts: data.dagboekWorkouts.filter((w) => w.date === dateStr),
    medicatie: data.medicatie.filter((m) => m.date === dateStr),
    protocolSessions: (data.protocolSessionLogs ?? []).filter((s) => s.date === dateStr),
  };
}

export function hasAnyActivity(activity: DailyActivity): boolean {
  return !!activity.checkIn || activity.appointments.length > 0 || activity.workouts.length > 0
    || activity.medicatie.length > 0 || activity.protocolSessions.length > 0;
}
