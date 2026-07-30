import type { Appointment } from "@/lib/data";

/**
 * Genereert een .ics-bestand voor een afspraak zodat de patiënt hem kan
 * toevoegen aan de agenda-app van zijn eigen keuze (Apple Kalender, Google
 * Agenda, Outlook, ...) — geen OAuth-koppeling nodig, alleen een download.
 * Tijden zijn bewust "floating" (geen tijdzone-suffix): de afspraak staat in
 * de lokale tijd zoals de patiënt hem in REVA ziet, wat voor een
 * Nederlandse gebruiker altijd het gewenste resultaat geeft.
 */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function toIcsLocalDateTime(date: string, time: string): string {
  const [y, m, d] = date.split("-");
  const [hh, mm] = time.split(":");
  return `${y}${m}${d}T${hh}${mm}00`;
}

function toIcsDate(date: string): string {
  return date.replace(/-/g, "");
}

function addOneHour(time: string): string {
  const [hh, mm] = time.split(":").map(Number);
  const total = (hh * 60 + mm + 60) % (24 * 60);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function buildAppointmentIcs(appointment: Appointment): string {
  const uid = `${appointment.id}@reva-app.nl`;
  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const descriptionParts = [
    appointment.behandelaar ? `Behandelaar: ${appointment.behandelaar}` : "",
    appointment.voorbereiding ? `Voorbereiding: ${appointment.voorbereiding}` : "",
    appointment.meenemen ? `Mee te nemen: ${appointment.meenemen}` : "",
    appointment.notities ? `Notities: ${appointment.notities}` : "",
  ].filter(Boolean);
  const description = descriptionParts.join("\\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//REVA App//NL",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
  ];

  if (appointment.time) {
    lines.push(`DTSTART:${toIcsLocalDateTime(appointment.date, appointment.time)}`);
    lines.push(`DTEND:${toIcsLocalDateTime(appointment.date, addOneHour(appointment.time))}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(appointment.date)}`);
  }

  lines.push(`SUMMARY:${escapeIcsText(appointment.title)}`);
  if (appointment.location) lines.push(`LOCATION:${escapeIcsText(appointment.location)}`);
  if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}

export function downloadAppointmentIcs(appointment: Appointment): void {
  const content = buildAppointmentIcs(appointment);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(appointment.title || "afspraak").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
