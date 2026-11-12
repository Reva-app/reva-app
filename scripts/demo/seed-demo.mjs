// Demopraktijk "Fysiotherapie De Linde" vullen voor demo's.
//
//   node scripts/demo/seed-demo.mjs <map-met-assets>
//
// Leest NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY uit .env.local.
// Alles komt in één organisatie; alle accounts gebruiken @demo.reva-app.nl.
// Opruimen: node scripts/demo/cleanup-demo.mjs
//
// Herstelplannen worden gekopieerd zoals assign_protocol_to_patient dat doet
// (die RPC vraagt een ingelogde fysio met 2FA, dus hier in het script).

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, randomBytes } from "node:crypto";

// ─── Config ──────────────────────────────────────────────────────────────────
const root = fileURLToPath(new URL("../..", import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; })
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const ASSETS = process.argv[2];
if (!URL_ || !KEY) throw new Error("Supabase-config ontbreekt");
if (!ASSETS || !existsSync(ASSETS)) throw new Error("Geef de map met demo-assets mee");

export const DOMAIN = "demo.reva-app.nl";
const ORG_NAME = "Fysiotherapie De Linde";
const PASSWORD = `Linde-${randomBytes(4).toString("hex")}-Demo!`;
const TODAY = new Date(); TODAY.setHours(12, 0, 0, 0);

// ─── Helpers ─────────────────────────────────────────────────────────────────
let seed = 20261112;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dayStr = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(TODAY); d.setDate(d.getDate() - n); return d; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const iso = (d, h = 10, m = 0) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x.toISOString(); };

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
/** Bulk-insert vraagt overal dezelfde kolommen: ontbrekende velden aanvullen met null. */
function normalize(body) {
  if (!Array.isArray(body) || body.length < 2) return body;
  const keys = [...new Set(body.flatMap((r) => Object.keys(r)))];
  return body.map((r) => Object.fromEntries(keys.map((k) => [k, r[k] ?? null])));
}
async function rest(method, path, body, prefer = "return=representation") {
  body = normalize(body);
  const res = await fetch(`${URL_}/rest/v1/${path}`, { method, headers: { ...H, Prefer: prefer }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}
const get = (path) => rest("GET", path);
const insert = (table, rows) => rest("POST", table, rows);
async function insertMany(table, rows, size = 500) {
  for (let i = 0; i < rows.length; i += size) await rest("POST", table, rows.slice(i, i + size), "return=minimal");
}
const patch = (path, body) => rest("PATCH", path, body, "return=minimal");

async function createUser(email, fullName) {
  const res = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST", headers: H,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: fullName } }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`createUser ${email}: ${JSON.stringify(json)}`);
  return json.id;
}
async function upload(bucket, path, file, contentType) {
  const res = await fetch(`${URL_}/storage/v1/object/${bucket}/${path}`, {
    method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": contentType, "x-upsert": "true" },
    body: readFileSync(join(ASSETS, file)),
  });
  if (!res.ok) throw new Error(`upload ${bucket}/${path}: ${await res.text()}`);
  return path;
}

// ─── Gegevens ────────────────────────────────────────────────────────────────
const STAFF = [
  { key: "joost", first: "Joost", last: "Peters", role: "organization_owner", title: "Fysiotherapeut en praktijkhouder", loc: "centrum", phone: "030 234 5610" },
  { key: "sanne", first: "Sanne", last: "de Vries", role: "therapist", title: "Sportfysiotherapeut", loc: "centrum", phone: "030 234 5611" },
  { key: "mark", first: "Mark", last: "van Leeuwen", role: "therapist", title: "Manueel therapeut", loc: "rijn", phone: "030 234 5612" },
  { key: "lisa", first: "Lisa", last: "Hoekstra", role: "therapist", title: "Bekkenfysiotherapeut", loc: "rijn", phone: "030 234 5613" },
  { key: "daan", first: "Daan", last: "Mulder", role: "therapist", title: "Fysiotherapeut", loc: "centrum", phone: "030 234 5614" },
];

// state: active | signals | inactive | discharged | invited | intake_requested | intake_submitted
const PATIENTS = [
  { first: "Lotte", last: "Jansen", g: "vrouw", born: "1996-04-12", th: "sanne", loc: "centrum", inj: "acl", reason: "surgery", proto: "ACL-reconstructie herstelprotocol", start: 262, surgery: 241, adh: 0.92, sport: "Korfbal", job: "Leerkracht basisonderwijs", showcase: true },
  { first: "Henk", last: "Willems", g: "man", born: "1957-09-03", th: "joost", loc: "centrum", inj: "knieprothese", reason: "surgery", proto: "Totale knieprothese herstelprotocol", start: 110, surgery: 96, adh: 0.85, job: "Gepensioneerd" },
  { first: "Femke", last: "de Graaf", g: "vrouw", born: "1989-11-21", th: "lisa", loc: "rijn", inj: "diastase_recti", reason: "rehabilitation", proto: "Herstelplan diastase recti (buikwandscheiding)", start: 72, adh: 0.8, job: "Marketingadviseur" },
  { first: "Youssef", last: "El Idrissi", g: "man", born: "2001-02-17", th: "sanne", loc: "centrum", inj: "hamstring", reason: "sports_injury", proto: "Herstelplan hamstringblessure (voetbal)", start: 21, adh: 0.95, sport: "Voetbal", job: "Student" },
  { first: "Marieke", last: "Vos", g: "vrouw", born: "1975-06-30", th: "mark", loc: "rijn", inj: "nekklachten", reason: "chronic_complaint", proto: "Herstelplan chronische nekklachten", start: 46, adh: 0.7, job: "Administratief medewerker" },
  { first: "Bram", last: "Kuipers", g: "man", born: "1993-03-08", th: "daan", loc: "centrum", inj: "enkel", reason: "sports_injury", proto: "Herstelplan enkelverzwikking (hardlopen)", start: 12, adh: 0.9, sport: "Hardlopen", job: "Software-ontwikkelaar" },
  { first: "Ingrid", last: "Smit", g: "vrouw", born: "1951-12-14", th: "joost", loc: "centrum", inj: "heupprothese", reason: "surgery", proto: "Totale heupprothese herstelprotocol, voorste (anterieure) benadering", start: 40, surgery: 31, adh: 0.88, job: "Gepensioneerd" },
  { first: "Ruben", last: "Hendriks", g: "man", born: "1986-07-25", th: "mark", loc: "rijn", inj: "rug", reason: "chronic_complaint", proto: "Herstelplan lage rugklachten met uitstraling (radiculair)", start: 36, adh: 0.75, job: "Magazijnmedewerker", state: "signals" },
  { first: "Noor", last: "Bakker", g: "vrouw", born: "2004-05-02", th: "sanne", loc: "centrum", inj: "enkel", reason: "sports_injury", proto: "Herstelplan enkelverzwikking (voetbal)", start: 150, adh: 0.85, sport: "Voetbal", job: "Student", state: "discharged", outcome: "fully_recovered", endAgo: 64 },
  { first: "Pieter", last: "van Dijk", g: "man", born: "1968-10-19", th: "daan", loc: "centrum", inj: "lopersknie", reason: "overuse", proto: "Herstelplan lopersknie (patellofemoraal pijnsyndroom)", start: 62, adh: 0.6, sport: "Hardlopen", job: "Accountmanager", state: "inactive", stopAgo: 26 },
  { first: "Esther", last: "Meijer", g: "vrouw", born: "1982-01-27", th: "lisa", loc: "rijn", inj: "bekkenbodemklachten", reason: "rehabilitation", proto: "Herstelplan bekkenbodemklachten", start: 91, adh: 0.82, job: "Verpleegkundige" },
  { first: "Kevin", last: "Bos", g: "man", born: "1997-08-11", th: "sanne", loc: "centrum", inj: "schouderluxatie", reason: "sports_injury", proto: "ORG:De Linde: schouderprogramma werpsporters", start: 41, adh: 0.9, sport: "Handbal", job: "Monteur" },
  { first: "Annelies", last: "Mulder", g: "vrouw", born: "1963-04-05", th: "mark", loc: "rijn", inj: "bevroren_schouder", reason: "chronic_complaint", proto: "Herstelplan bevroren schouder (frozen shoulder)", start: 122, adh: 0.78, job: "Docent" },
  { first: "Sven", last: "de Wit", g: "man", born: "1990-09-22", th: "daan", loc: "centrum", inj: "achilles", reason: "overuse", proto: "Herstelplan achillespees-tendinopathie", start: 76, adh: 0.83, sport: "Hardlopen", job: "Projectleider" },
  { first: "Fleur", last: "Visser", g: "vrouw", born: "1999-03-16", th: "sanne", loc: "centrum", inj: "meniscus", reason: "surgery", proto: "Herstelplan partiële meniscectomie", start: 30, surgery: 17, adh: 0.9, sport: "Hockey", job: "Fysiotherapie-student", state: "signals" },
  { first: "Gerard", last: "Peeters", g: "man", born: "1954-02-09", th: "joost", loc: "centrum", inj: "knieartrose", reason: "chronic_complaint", proto: "Herstelplan knieartrose", start: 183, adh: 0.8, job: "Gepensioneerd" },
  { first: "Iris", last: "van den Berg", g: "vrouw", born: "1994-08-28", th: "lisa", loc: "rijn", inj: "bekkeninstabiliteit", reason: "rehabilitation", proto: "Herstelplan bekkeninstabiliteit", start: 26, adh: 0.85, job: "Grafisch ontwerper", pregnancy: true },
  { first: "Thijs", last: "Verbeek", g: "man", born: "2003-12-01", th: "sanne", loc: "centrum", inj: "knieband", reason: "sports_injury", proto: "Herstelplan kniebandletsel MCL (voetbal)", start: 34, adh: 0.92, sport: "Hockey", job: "Student" },
  { first: "Monique", last: "Dekker", g: "vrouw", born: "1970-05-18", th: "mark", loc: "rijn", inj: "elleboogklachten", reason: "overuse", proto: "Herstelplan elleboogklachten (tennis-/golferselleboog)", start: 56, adh: 0.72, sport: "Tennis", job: "Kapper" },
  { first: "Jeroen", last: "Koster", g: "man", born: "1979-11-07", th: "daan", loc: "centrum", inj: "hielspoor", reason: "overuse", proto: "Herstelplan hielspoor (fasciitis plantaris)", start: 210, adh: 0.7, job: "Postbezorger", state: "discharged", outcome: "partially_recovered", endAgo: 40 },
  { first: "Sophie", last: "Brouwer", g: "vrouw", born: "2000-07-14", th: "daan", loc: "centrum", inj: "kuitblessure", reason: "sports_injury", proto: "Herstelplan kuitblessure (spierverrekking)", start: 3, sport: "Hardlopen", job: "Barista", state: "invited" },
  { first: "Martin", last: "de Haan", g: "man", born: "1972-03-29", th: "mark", loc: "rijn", inj: null, reason: null, proto: null, start: 1, state: "intake_requested" },
  { first: "Laura", last: "Schouten", g: "vrouw", born: "1987-10-10", th: "sanne", loc: "centrum", inj: "anders", reason: "other", proto: null, start: 9, state: "intake_submitted", job: "Fotograaf" },
  { first: "Rick", last: "Janssen", g: "man", born: "1992-06-03", th: "daan", loc: "centrum", inj: "scheenbeenvliesklachten", reason: "overuse", proto: "ORG:De Linde: hardloopopbouw na blessure", start: 52, adh: 0.86, sport: "Hardlopen", job: "Brandweerman" },
];

const NOTES = [
  "Goed gesprek gehad over de opbouw. Patiënt is gemotiveerd en houdt de oefeningen goed bij.",
  "Pijn na de training was de volgende ochtend weer gezakt; we houden het huidige schema aan.",
  "Belasting iets verhoogd. Afgesproken om bij toename van zwelling contact op te nemen.",
  "Techniek van de squat verbeterd; let op knie boven de voet.",
  "Patiënt geeft aan beter te slapen. Mooie vooruitgang in de check-ins te zien.",
  "Werkhervatting besproken; start met halve dagen.",
];

// ─── Hoofdprogramma ──────────────────────────────────────────────────────────
const existing = await get(`organizations?select=id&name=eq.${encodeURIComponent(ORG_NAME)}`);
if (existing.length) throw new Error(`"${ORG_NAME}" bestaat al — draai eerst cleanup-demo.mjs`);

console.log("Praktijk en locaties…");
const orgId = randomUUID();
await insert("organizations", {
  id: orgId, name: ORG_NAME, status: "active", primary_color: "#2f6f62", plan: "behandelaar", billing_interval: "year",
  max_members: 999, max_locations: 999, max_patients: null,
  website: "https://www.example.com", contact_name: "Joost Peters", contact_email: `info@${DOMAIN}`, contact_phone: "030 234 5600",
  address_street: "Lindeplein 12", address_postal_code: "3511 AB", address_city: "Utrecht",
});
const logoPath = await upload("organization-logos", `${orgId}/logo.png`, "logo.png", "image/png");
await patch(`organizations?id=eq.${orgId}`, { logo_path: logoPath });
const LOC = { centrum: randomUUID(), rijn: randomUUID() };
await insert("locations", [
  { id: LOC.centrum, organization_id: orgId, name: "De Linde Centrum", street: "Lindeplein", house_number: "12", postal_code: "3511 AB", city: "Utrecht", phone: "030 234 5600", email: `centrum@${DOMAIN}`, is_main_location: true },
  { id: LOC.rijn, organization_id: orgId, name: "De Linde Leidsche Rijn", street: "Rijnboog", house_number: "48", postal_code: "3541 CD", city: "Utrecht", phone: "030 234 5620", email: `leidscherijn@${DOMAIN}`, is_main_location: false },
]);

const roles = Object.fromEntries((await get("roles?select=id,key")).map((r) => [r.key, r.id]));

console.log("Team…");
const STAFF_ID = {};
for (const s of STAFF) {
  const email = `${s.first}.${s.last}`.toLowerCase().replace(/\s+/g, "") + `@${DOMAIN}`;
  await insert("membership_invites", { organization_id: orgId, email, first_name: s.first, last_name: s.last, role_id: roles[s.role], location_id: LOC[s.loc], status: "pending" });
  const uid = await createUser(email, `${s.first} ${s.last}`);
  STAFF_ID[s.key] = uid;
  s.email = email;
  await patch(`profiles?id=eq.${uid}`, { title: s.title, phone: s.phone, first_name: s.first, last_name: s.last, full_name: `${s.first} ${s.last}` });
  await patch(`memberships?user_id=eq.${uid}&organization_id=eq.${orgId}`, { welcomed_at: new Date().toISOString(), location_id: LOC[s.loc] });
}

// ─── Kennisbank inlezen ──────────────────────────────────────────────────────
console.log("Kennisbank inlezen…");
const protocols = await get("protocols?select=*&archived=eq.false");
const phasesAll = await get("protocol_phases?select=*&order=sort_order");
const critAll = await get("protocol_phase_criteria?select=*&order=sort_order");
const milAll = await get("protocol_phase_milestones?select=*&order=sort_order");
const eduAll = await get("protocol_phase_education_items?select=*&order=sort_order");
const linksAll = await get("protocol_phase_schedule_links?select=*&order=sort_order");
const schedAll = await get("schedule_library?select=*");
const schedExAll = await get("schedule_library_exercises?select=*&order=sort_order");
const exAll = await get("exercise_library?select=*&limit=5000");
const byKey = (rows, k) => rows.reduce((m, r) => ((m[r[k]] ??= []).push(r), m), {});
const PH = byKey(phasesAll, "protocol_id"), CR = byKey(critAll, "phase_id"), MI = byKey(milAll, "phase_id"),
  ED = byKey(eduAll, "phase_id"), LK = byKey(linksAll, "phase_id"), SE = byKey(schedExAll, "schedule_id");
const SCHED = Object.fromEntries(schedAll.map((s) => [s.id, s])), EX = Object.fromEntries(exAll.map((e) => [e.id, e]));

// ─── Eigen herstelplannen van de praktijk ────────────────────────────────────
console.log("Eigen herstelplannen…");
async function duplicateProtocol(sourceName, name, description) {
  const src = protocols.find((p) => p.name === sourceName && p.scope === "reva");
  if (!src) throw new Error(`Bronplan niet gevonden: ${sourceName}`);
  const pid = randomUUID();
  await insert("protocols", { id: pid, scope: "organization", organization_id: orgId, source_protocol_id: src.id, injury_category: src.injury_category, name, description, created_by: STAFF_ID.joost });
  const newPhases = [];
  for (const ph of PH[src.id] ?? []) {
    const nid = randomUUID();
    newPhases.push({ ...ph, id: nid, protocol_id: pid });
    await insert("protocol_phases", { id: nid, protocol_id: pid, sort_order: ph.sort_order, name: ph.name, description: ph.description, therapist_notes: ph.therapist_notes, forbidden_activities: ph.forbidden_activities, week_range_label: ph.week_range_label });
    const cr = (CR[ph.id] ?? []).map((c) => ({ id: randomUUID(), phase_id: nid, description: c.description, sort_order: c.sort_order }));
    const mi = (MI[ph.id] ?? []).map((c) => ({ id: randomUUID(), phase_id: nid, title: c.title, sort_order: c.sort_order }));
    const ed = (ED[ph.id] ?? []).map((c) => ({ id: randomUUID(), phase_id: nid, title: c.title, body: c.body, sort_order: c.sort_order }));
    if (cr.length) await insert("protocol_phase_criteria", cr);
    if (mi.length) await insert("protocol_phase_milestones", mi);
    if (ed.length) await insert("protocol_phase_education_items", ed);
    CR[nid] = cr; MI[nid] = mi; ED[nid] = ed;
    LK[nid] = [];
    for (const l of LK[ph.id] ?? []) {
      const s = SCHED[l.schedule_id];
      const sid = randomUUID();
      await insert("schedule_library", { id: sid, scope: "organization", organization_id: orgId, source_schedule_id: s.id, title: s.title, description: s.description, created_by: STAFF_ID.joost });
      const rows = (SE[s.id] ?? []).map((r) => ({ schedule_id: sid, exercise_id: r.exercise_id, sort_order: r.sort_order, prescribed_sets: r.prescribed_sets, prescribed_reps: r.prescribed_reps, prescribed_duration_seconds: r.prescribed_duration_seconds, prescribed_load_text: r.prescribed_load_text, prescription_note: r.prescription_note }));
      if (rows.length) await insert("schedule_library_exercises", rows);
      SCHED[sid] = { ...s, id: sid }; SE[sid] = rows;
      const link = { id: randomUUID(), phase_id: nid, schedule_id: sid, frequency_per_week: l.frequency_per_week, sort_order: l.sort_order };
      await insert("protocol_phase_schedule_links", link);
      LK[nid].push(link);
    }
  }
  PH[pid] = newPhases;
  const p = { ...src, id: pid, name, scope: "organization" };
  protocols.push(p);
  return p;
}
await duplicateProtocol("Herstelplan scheenbeenvliesklachten (mediaal tibiaal stresssyndroom)", "De Linde: hardloopopbouw na blessure",
  "Ons eigen loopopbouwschema voor hardlopers na een overbelastingsblessure, met extra aandacht voor cadans en krachtonderhoud.");
await duplicateProtocol("Herstelplan schouderluxatie (conservatief)", "De Linde: schouderprogramma werpsporters",
  "Schouderprogramma voor handbal-, volleybal- en honkbalspelers, met een uitgebreide werpopbouw in de laatste fase.");

// Twee eigen oefeningen
await insert("exercise_library", [
  { scope: "organization", organization_id: orgId, title: "Lindeloop: 4 × 4 minuten tempo", exercise_type: "conditie", description: "Intervalloop die we in de praktijk gebruiken als laatste stap voor de terugkeer naar wedstrijden.", instructions: "Warm 10 minuten rustig op. Loop daarna 4 blokken van 4 minuten op stevig tempo met 3 minuten wandelen tussendoor.", default_sets: 4, default_reps: null, default_duration_seconds: 240, tags: ["hardlopen"], created_by: STAFF_ID.daan },
  { scope: "organization", organization_id: orgId, title: "Muurworp met elastiek (werpsport)", exercise_type: "kracht", description: "Werpbeweging tegen een elastiek, zoals in onze werpsportgroep.", instructions: "Bevestig een elastiek achter je op schouderhoogte. Maak 10 rustige werpbewegingen en daarna 5 op wedstrijdtempo.", default_sets: 3, default_reps: 15, tags: ["schouder", "werpen"], created_by: STAFF_ID.sanne },
]);

// ─── Patiënten ───────────────────────────────────────────────────────────────
const weekRange = (label) => {
  const m = /(\d+)\s*[-–]\s*(\d+)/.exec(label ?? "") ?? /(\d+)\s*\+/.exec(label ?? "");
  if (!m) return null;
  return { from: Number(m[1]), to: m[2] ? Number(m[2]) : Number(m[1]) + 8 };
};

const credentials = [];
let totalCheckins = 0, totalSessions = 0;

for (const [index, p] of PATIENTS.entries()) {
  const state = p.state ?? "active";
  const fullName = `${p.first} ${p.last}`;
  const email = `${p.first}.${p.last}`.toLowerCase().replace(/\s+/g, "").normalize("NFD").replace(/[̀-ͯ]/g, "") + `@${DOMAIN}`;
  const startDate = daysAgo(p.start);
  const anchor = p.surgery ? daysAgo(p.surgery) : startDate;
  const therapistId = STAFF_ID[p.th];
  const patientId = randomUUID();
  const hasAccount = !["invited", "intake_requested"].includes(state);
  const endDate = state === "discharged" ? daysAgo(p.endAgo) : TODAY;
  console.log(`Patiënt ${index + 1}/${PATIENTS.length}: ${fullName} (${state})`);

  await insert("patients", {
    id: patientId, organization_id: orgId, location_id: LOC[p.loc], first_name: p.first, last_name: p.last, email,
    phone: `06 ${String(10000000 + Math.floor(rnd() * 89999999))}`, date_of_birth: p.born, gender: p.g,
    assigned_therapist_id: therapistId, injury_type: p.inj, injury_date: p.inj ? dayStr(startDate) : null,
    surgery_date: p.surgery ? dayStr(anchor) : null, treatment_start_date: dayStr(startDate),
    status: state === "discharged" ? "inactive" : "active",
    invited_at: iso(daysAgo(Math.max(0, p.start - 1)), 9),
    created_at: iso(daysAgo(p.start), 9),
    discharged_at: state === "discharged" ? dayStr(endDate) : null,
    discharge_outcome: state === "discharged" ? p.outcome : null,
  });

  // Intake
  const proto = p.proto ? protocols.find((x) => x.name === p.proto.replace(/^ORG:/, "")) : null;
  if (p.proto && !proto) throw new Error(`Herstelplan niet gevonden: ${p.proto}`);
  const intakeBase = {
    patient_id: patientId, organization_id: orgId, created_by: therapistId,
    visit_reason: p.reason, pain_score_now: 4 + Math.floor(rnd() * 4), pain_worst: 6 + Math.floor(rnd() * 3),
    swelling: p.reason === "surgery" ? "significant" : pick(["none", "mild"]),
    onset_mechanism: p.reason === "surgery" ? null : p.reason === "sports_injury" ? "sudden" : "gradual",
    symptom_course: "stable", night_pain: rnd() < 0.3, sleep_impact: pick(["none", "some"]),
    occupation: p.job ?? null, work_load: p.job === "Gepensioneerd" ? "not_working" : pick(["sedentary", "standing", "physical"]),
    sport_frequency: p.sport ? "3_4" : "1_2", sport_level: p.sport ? "competitive" : null,
    return_to_sport_goal: !!p.sport, sport_type: p.sport ?? null, return_to_work_goal: !!p.job && p.job !== "Gepensioneerd" && p.job !== "Student",
    referral_source: p.reason === "surgery" ? "specialist" : pick(["direct", "gp"]),
    imaging: p.inj === "acl" || p.inj === "meniscus" ? ["mri"] : p.reason === "surgery" ? ["xray"] : [],
    fear_of_movement: rnd() < 0.25, pregnancy_related: !!p.pregnancy,
    patient_goal_text: p.sport ? `Weer volledig ${p.sport.toLowerCase()} spelen zonder angst` : "Zonder pijn de dagelijkse dingen kunnen doen",
    goal_timeframe_months: p.reason === "surgery" ? 9 : 3,
  };
  if (state === "intake_requested") {
    await insert("patient_intakes", { patient_id: patientId, organization_id: orgId, created_by: therapistId, filled_by: "patient", status: "requested", requested_at: iso(daysAgo(1), 10), completed_at: null });
  } else if (state === "intake_submitted") {
    await insert("patient_intakes", { ...intakeBase, filled_by: "patient", status: "submitted", requested_at: iso(daysAgo(9), 10), submitted_at: iso(daysAgo(1), 20), completed_at: null,
      injury_description: "Van de fiets gevallen en op mijn rechterpols opgevangen. De pols is nu stijf en doet pijn bij draaien, bijvoorbeeld bij het openen van potten.",
      pain_location: "Rechterpols, aan de duimkant", pain_triggers: "Draaien, tillen van de camera", sport_frequency: "1_2", sport_level: "recreational", return_to_sport_goal: false, sport_type: null, return_to_work_goal: true,
      patient_goal_text: "Weer de hele dag kunnen fotograferen zonder pijn", patient_expectation: "Weten welke oefeningen ik zelf kan doen" });
  } else {
    await insert("patient_intakes", { ...intakeBase, filled_by: "therapist", status: "completed", completed_at: iso(startDate, 11),
      ai_summary: `${fullName} komt voor ${proto?.name.toLowerCase() ?? "herstel"}. ${p.sport ? `Sport: ${p.sport.toLowerCase()}, wil weer op het oude niveau terugkeren.` : "Wil weer zonder beperkingen functioneren."}`,
      ai_recommended_protocol_id: proto?.id ?? null, ai_attention_points: [], staged_goals: [] });
  }

  if (!hasAccount) { credentials.push({ name: fullName, email, note: state === "invited" ? "uitgenodigd, nog geen account" : "vult intake zelf in, nog geen account" }); }

  // Herstelplan kopiëren (zoals assign_protocol_to_patient)
  let assignment = null;
  if (proto) {
    const ppId = randomUUID();
    const done = state === "discharged";
    await insert("patient_protocols", { id: ppId, patient_id: patientId, source_protocol_id: proto.id, name: proto.name, injury_category: proto.injury_category, status: done ? "completed" : "active", assigned_by: therapistId, assigned_at: iso(startDate, 11) });
    const phases = PH[proto.id] ?? [];
    const weeksElapsed = (endDate - anchor) / (7 * 86400000);
    // Fase bepalen op basis van weekbereik
    let activeIdx = phases.findIndex((ph) => { const r = weekRange(ph.week_range_label); return r && weeksElapsed >= r.from && weeksElapsed < r.to; });
    if (activeIdx < 0) activeIdx = weeksElapsed < 1 ? 0 : phases.length - 1;
    if (state === "invited") activeIdx = 0;
    const phaseRows = [];
    for (const [i, ph] of phases.entries()) {
      const r = weekRange(ph.week_range_label) ?? { from: i * 4, to: i * 4 + 4 };
      const pStart = addDays(anchor, Math.round(r.from * 7));
      const pEnd = addDays(anchor, Math.round(r.to * 7));
      const status = done ? "completed" : i < activeIdx ? "completed" : i === activeIdx ? "active" : "not_started";
      const pid = randomUUID();
      const completedAt = status === "completed" ? (done && i === phases.length - 1 ? endDate : pEnd < endDate ? pEnd : endDate) : null;
      phaseRows.push({ id: pid, src: ph, status, start: i === 0 ? startDate : pStart, end: completedAt ?? endDate });
      await insert("patient_protocol_phases", {
        id: pid, patient_protocol_id: ppId, source_phase_id: ph.id, sort_order: ph.sort_order, name: ph.name, description: ph.description,
        therapist_notes: ph.therapist_notes, forbidden_activities: ph.forbidden_activities, week_range_label: ph.week_range_label, status,
        started_at: status !== "not_started" ? iso(i === 0 ? startDate : pStart, 10) : null,
        completed_at: completedAt ? iso(completedAt, 16) : null,
        transition_pain_score: status === "completed" ? clamp(Math.round(5 - i * 1.2 + rnd()), 0, 10) : null,
        transition_mobility_score: status === "completed" ? clamp(2 + i, 1, 5) : null,
        transition_swelling: status === "completed" ? i === 0 : null,
        transition_satisfaction_score: status === "completed" ? clamp(3 + Math.round(rnd() * 2), 1, 5) : null,
        transition_progress_vs_expected: status === "completed" ? pick(["as_expected", "as_expected", "better"]) : null,
        transition_note: status === "completed" ? pick(["Criteria behaald, door naar de volgende fase.", "Mooi verloop, patiënt is gemotiveerd.", "Iets langer in deze fase gebleven, nu klaar voor de volgende stap."]) : null,
      });
      const met = status === "completed";
      const crit = (CR[ph.id] ?? []).map((c, k) => ({ phase_id: pid, source_criterion_id: c.id, description: c.description, sort_order: c.sort_order,
        met: met || (status === "active" && k === 0 && rnd() < 0.6), met_at: met ? iso(completedAt, 15) : null, met_by: met ? therapistId : null }));
      const mil = (MI[ph.id] ?? []).map((c, k) => ({ phase_id: pid, source_milestone_id: c.id, title: c.title, sort_order: c.sort_order,
        completed: met || (status === "active" && k === 0), completed_at: met ? iso(addDays(completedAt, -3), 18) : status === "active" && k === 0 ? iso(daysAgo(4), 18) : null,
        reflection_text: met && k === 0 ? pick(["Voelde echt als een overwinning!", "Ging beter dan verwacht.", "Even spannend, maar het lukte."]) : null,
        pain_score: met ? clamp(Math.round(3 - i * 0.5 + rnd()), 0, 10) : null }));
      const edu = (ED[ph.id] ?? []).map((c) => ({ phase_id: pid, source_item_id: c.id, title: c.title, body: c.body, sort_order: c.sort_order }));
      if (crit.length) await insert("patient_protocol_phase_criteria", crit);
      if (mil.length) await insert("patient_protocol_phase_milestones", mil);
      if (edu.length) await insert("patient_protocol_phase_education_items", edu);
      phaseRows.at(-1).schedules = [];
      for (const l of LK[ph.id] ?? []) {
        const s = SCHED[l.schedule_id];
        const sid = randomUUID();
        await insert("patient_protocol_schedules", { id: sid, phase_id: pid, source_schedule_id: s.id, title: s.title, frequency_per_week: l.frequency_per_week, sort_order: l.sort_order });
        const exRows = (SE[s.id] ?? []).map((r) => {
          const e = EX[r.exercise_id];
          return { id: randomUUID(), schedule_id: sid, source_exercise_id: r.exercise_id, sort_order: r.sort_order, title: e.title, description: e.description, instructions: e.instructions, media_path: e.media_path, media_type: e.media_type,
            prescribed_sets: r.prescribed_sets, prescribed_reps: r.prescribed_reps, prescribed_duration_seconds: r.prescribed_duration_seconds, prescribed_load_text: r.prescribed_load_text, prescription_note: r.prescription_note };
        });
        if (exRows.length) await insert("patient_protocol_schedule_exercises", exRows);
        phaseRows.at(-1).schedules.push({ id: sid, freq: l.frequency_per_week, exercises: exRows });
      }
    }
    assignment = phaseRows;
  }

  if (!hasAccount) continue;

  // Account aanmaken → koppelt via e-mail aan het dossier
  const userId = await createUser(email, fullName);
  credentials.push({ name: fullName, email, note: p.showcase ? "voorbeeldpatiënt (8 maanden traject)" : state });
  await patch(`profiles?id=eq.${userId}`, { first_name: p.first, last_name: p.last, full_name: fullName });
  await patch(`settings?user_id=eq.${userId}`, { setup_completed: true, checkin_reminder_enabled: true, checkin_reminder_time: "20:00", trial_start_date: dayStr(startDate) });
  await patch(`patients?id=eq.${patientId}`, { welcomed_at: iso(startDate, 12) });

  if (state === "intake_submitted") continue; // nog geen herstelplan, nog geen data

  // ── Check-ins ──
  const total = Math.max(1, (TODAY - anchor) / 86400000);
  const curve = p.reason === "surgery" ? 200 : p.reason === "chronic_complaint" ? 160 : 70; // dagen tot "goed"
  const stop = state === "inactive" ? daysAgo(p.stopAgo) : endDate;
  const checkins = [];
  for (let d = new Date(startDate); d <= stop; d = addDays(d, 1)) {
    if (rnd() > p.adh) continue;
    const t = Math.max(0, (d - anchor) / 86400000);
    const prog = clamp(t / curve, 0, 1);
    const postOpDip = p.surgery && d >= anchor && t < 10 ? 1.5 : 0;
    const noise = () => (rnd() - 0.5) * 1.6;
    let pain = clamp(Math.round(6.5 - 5.5 * prog + postOpDip + noise()), 0, 10);
    let day = clamp(Math.round(2 + 2.6 * prog - postOpDip / 2 + noise() / 1.5), 1, 5);
    const swelling = prog < 0.3 ? rnd() < 0.7 : rnd() < 0.08;
    const isLast = dayStr(d) === dayStr(stop) || addDays(d, 1) > stop;
    if (state === "signals" && (TODAY - d) / 86400000 < 4) { pain = 8; day = 2; }
    checkins.push({
      user_id: userId, patient_id: patientId, date: dayStr(d), day_score: day, pain_score: pain,
      mobility_score: clamp(Math.round(1.5 + 3.3 * prog + noise() / 1.5), 1, 5), energy_score: clamp(Math.round(2.5 + 2 * prog + noise() / 1.5), 1, 5),
      sleep_score: clamp(Math.round(2.5 + 2 * prog + noise() / 1.5), 1, 5), mood_score: clamp(Math.round(2.7 + 2 * prog + noise() / 1.5), 1, 5),
      swelling: state === "signals" && (TODAY - d) / 86400000 < 4 ? true : swelling,
      note: isLast && state === "signals" ? "Na de training gisteren veel meer pijn en de knie is dikker. Vanochtend moeilijk opgestaan." : rnd() < 0.06 ? pick(["Goede dag, veel gewandeld.", "Oefeningen gedaan, voelde stabiel.", "Wat stijf na lang zitten op werk.", "Slecht geslapen, wel oefeningen gedaan.", "Eerste keer weer zonder krukken naar de supermarkt!"]) : null,
      training_done: rnd() < 0.6, medication_used: prog < 0.25 ? rnd() < 0.7 : rnd() < 0.05,
    });
  }
  await insertMany("checkins", checkins);
  totalCheckins += checkins.length;

  // ── Trainingssessies ──
  if (assignment) {
    const sessions = [], exLogs = [];
    for (const ph of assignment) {
      if (ph.status === "not_started") continue;
      for (const s of ph.schedules) {
        for (let d = new Date(ph.start); d <= (ph.end < stop ? ph.end : stop); d = addDays(d, 1)) {
          if (rnd() > (s.freq / 7) * p.adh) continue;
          const sid = randomUUID();
          sessions.push({ id: sid, patient_id: patientId, schedule_id: s.id, date: dayStr(d), completed_at: iso(d, 18, 30), reflection: rnd() < 0.07 ? pick(["Ging lekker vandaag.", "Laatste set was zwaar.", "Geen pijn tijdens de oefeningen."]) : null });
          for (const e of s.exercises) {
            const timed = !e.prescribed_reps && e.prescribed_duration_seconds;
            exLogs.push({ patient_id: patientId, session_log_id: sid, schedule_exercise_id: e.id, date: dayStr(d), completed: true,
              sets: e.prescribed_sets, reps: timed ? null : e.prescribed_reps, duration_seconds: timed ? e.prescribed_duration_seconds : null,
              weight_kg: !timed && /gewicht|kg|dumbbell|halter/i.test(e.prescribed_load_text ?? "") ? 5 + Math.round(rnd() * 10) : null,
              pain_score: clamp(Math.round(3 + rnd() * 2 - (TODAY - d) / -60), 0, 10) });
          }
        }
      }
    }
    await insertMany("patient_protocol_session_logs", sessions);
    await insertMany("patient_protocol_exercise_logs", exLogs);
    totalSessions += sessions.length;
  }

  // ── Medicatie ──
  const meds = [];
  const medDays = p.reason === "surgery" ? 35 : 14;
  for (let k = 0; k < medDays; k++) {
    const d = addDays(p.surgery ? anchor : startDate, k);
    if (d > stop) break;
    const times = k < medDays / 3 ? ["08:00", "14:00", "21:00"] : k < (2 * medDays) / 3 ? ["08:00", "21:00"] : rnd() < 0.5 ? ["21:00"] : [];
    for (const t of times) meds.push({ user_id: userId, patient_id: patientId, date: dayStr(d), time: t, medication_name: "Paracetamol", dosage: "1000 mg", quantity: "2 tabletten", reason: "Pijn", effect: pick(["Goed", "Redelijk", null]) });
    if (p.reason === "surgery" && k < 10 && rnd() < 0.5) meds.push({ user_id: userId, patient_id: patientId, date: dayStr(d), time: "12:00", medication_name: "Naproxen", dosage: "250 mg", quantity: "1 tablet", reason: "Zwelling en pijn", effect: "Goed" });
  }
  if (meds.length) await insertMany("medication_logs", meds);

  // ── Afspraken ──
  const th = STAFF.find((s) => s.key === p.th);
  const locName = p.loc === "centrum" ? "De Linde Centrum, Utrecht" : "De Linde Leidsche Rijn, Utrecht";
  const apps = [];
  if (p.surgery) {
    apps.push({ title: "Consult orthopeed", appointment_type: "ziekenhuis", date: dayStr(addDays(anchor, -18)), time: "10:30", location: "Ziekenhuis Rijnstede (fictief)", provider_name: "Dr. M. Verhoeven", outcome_after: "Operatie gepland." });
    if (p.inj === "acl" || p.inj === "meniscus") apps.push({ title: "MRI knie", appointment_type: "mri", date: dayStr(addDays(anchor, -25)), time: "08:45", location: "Ziekenhuis Rijnstede (fictief)", provider_name: "Radiologie" });
    apps.push({ title: "Operatie", appointment_type: "operatie", date: dayStr(anchor), time: "07:30", location: "Ziekenhuis Rijnstede (fictief)", provider_name: "Dr. M. Verhoeven" });
    apps.push({ title: "Nacontrole orthopeed", appointment_type: "nacontrole", date: dayStr(addDays(anchor, 42)), time: "11:15", location: "Ziekenhuis Rijnstede (fictief)", provider_name: "Dr. M. Verhoeven", outcome_after: addDays(anchor, 42) < TODAY ? "Goed herstel, verder met fysiotherapie." : null });
  }
  for (let d = addDays(startDate, 3); d <= addDays(stop, 6); d = addDays(d, (TODAY - d) / 86400000 > 90 ? 14 : 7)) {
    const past = d < TODAY;
    if (!past && state !== "active" && state !== "signals") break;
    apps.push({ title: "Fysiotherapie", appointment_type: "fysio", date: dayStr(d), time: pick(["08:30", "09:15", "13:30", "16:45", "17:30"]), location: locName, provider_name: `${th.first} ${th.last}`, reminder_enabled: !past });
    if (!past) break;
  }
  await insertMany("appointments", apps.map((a) => ({ user_id: userId, patient_id: patientId, reminder_enabled: false, ...a })));

  // ── Doelen ──
  const goals = [
    { goal_type: "main", icon: p.sport ? "🏆" : "🎯", title: p.sport ? `Terug op het ${p.sport.toLowerCase()}veld` : "Pijnvrij door de dag", description: intakeBase.patient_goal_text, target_date: dayStr(addDays(anchor, p.reason === "surgery" ? 270 : 100)), completed: state === "discharged" },
    { goal_type: "regular", icon: "🚶", title: "30 minuten wandelen zonder pijn", completed: (TODAY - anchor) / 86400000 > 45, completed_at: (TODAY - anchor) / 86400000 > 45 ? iso(addDays(anchor, 45), 19) : null },
    { goal_type: "regular", icon: "💪", title: "Elke week mijn oefeningen 3× doen", completed: false },
  ];
  await insert("goals", goals.map((g) => ({ user_id: userId, patient_id: patientId, description: null, target_date: null, completed_at: null, ...g })));

  // ── Contacten ──
  await insert("dossier_contacts", [
    { user_id: userId, patient_id: patientId, name: `${th.first} ${th.last}`, role: th.title, organization: ORG_NAME, phone: th.phone, email: th.email },
    ...(p.surgery ? [{ user_id: userId, patient_id: patientId, name: "Dr. M. Verhoeven", role: "Orthopedisch chirurg", organization: "Ziekenhuis Rijnstede (fictief)", phone: "030 999 1234" }] : []),
  ]);

  // ── Notities van de behandelaar ──
  const notes = [];
  const nNotes = Math.min(5, 1 + Math.floor(p.start / 40));
  for (let k = 0; k < nNotes; k++) {
    const d = addDays(startDate, Math.round(((k + 1) * Math.min(p.start, 300)) / (nNotes + 1)));
    notes.push({ patient_id: patientId, organization_id: orgId, author_id: therapistId, note: NOTES[(index + k) % NOTES.length], created_at: iso(d, 17), updated_at: iso(d, 17) });
  }
  if (state === "signals") notes.push({ patient_id: patientId, organization_id: orgId, author_id: therapistId, note: "Check-in laat meer pijn en zwelling zien. Bellen en belasting tijdelijk terugschroeven.", created_at: iso(daysAgo(0), 9), updated_at: iso(daysAgo(0), 9) });
  await insert("patient_staff_notes", notes);

  // ── Voorbeeldpatiënt: foto's en documenten ──
  if (p.showcase) {
    const photos = [["w2", 14, "Twee weken na de operatie. Nog flink dik."], ["w6", 42, "Zwelling neemt af, buigen gaat beter."], ["w12", 84, "Bijna geen zwelling meer."], ["w24", 168, "Litteken mooi genezen, knie voelt sterk."]];
    for (const [w, off, note] of photos) {
      const path = await upload("dossier-photos", `${userId}/demo-${w}.png`, `knee_${w}.png`, "image/png");
      await insert("dossier_photo_updates", { user_id: userId, patient_id: patientId, date: dayStr(addDays(anchor, off)), image_url: path, note });
    }
    for (const [file, title, type, off, prov, desc] of [
      ["mri.pdf", "MRI-verslag rechterknie", "scan", -24, "Ziekenhuis", "Volledige ruptuur van de voorste kruisband, menisci intact."],
      ["operatieverslag.pdf", "Operatieverslag VKB-reconstructie", "verslag", 0, "Ziekenhuis", "Reconstructie met hamstringpees, ongecompliceerd verlopen."],
    ]) {
      const path = await upload("dossier-documents", `${userId}/demo-${file}`, file, "application/pdf");
      await insert("dossier_documents", { user_id: userId, patient_id: patientId, title, file_name: file, file_url: path, file_type: type, provider_type: prov, provider_name: "Ziekenhuis Rijnstede (fictief)", date: dayStr(addDays(anchor, off)), description: desc });
    }
  }
}

const staffCreds = STAFF.map((s) => ({ name: `${s.first} ${s.last}`, email: s.email, note: s.title + (s.role === "organization_owner" ? " (praktijkeigenaar)" : "") }));
const out = { organization: ORG_NAME, organizationId: orgId, password: PASSWORD, staff: staffCreds, patients: credentials, totals: { checkins: totalCheckins, sessions: totalSessions } };
writeFileSync(join(ASSETS, "..", "demo-credentials.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.totals), "klaar");
