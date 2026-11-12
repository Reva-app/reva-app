// Afgeronde behandelingen voor de demopraktijk (Fysiotherapie De Linde), zodat
// de rapporten "Uitkomst bij afsluiting", "Behandelduur per blessure" en
// "Tijd per fase" in de demo gevuld zijn. Deze patiënten hebben geen
// app-account (historische dossiers). Herhaalbaar: verwijdert eerst de
// vorige historie (herkenbaar aan het e-maildomein historie.demo.reva-app.nl).
//
//   node scripts/demo/seed-demo-history.mjs

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const REST = env.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1/";
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json", Prefer: "return=representation" };
const DOMAIN = "historie.demo.reva-app.nl";

async function api(method, path, body) {
  const r = await fetch(REST + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${t}`);
  return t ? JSON.parse(t) : null;
}
const ago = (n) => { const d = new Date(); d.setHours(10, 0, 0, 0); d.setDate(d.getDate() - n); return d; };

// [voornaam, achternaam, blessure, herstelplan, behandelaar, locatie, start (dagen geleden), einde (dagen geleden), uitkomst]
const HISTORY = [
  ["Thomas", "Verbeek", "acl", "ACL-reconstructie herstelprotocol", "sanne", "centrum", 330, 95, "fully_recovered"],
  ["Lieke", "Janssens", "enkel", "Herstelplan enkelverzwikking (hardlopen)", "daan", "centrum", 160, 104, "fully_recovered"],
  ["Hans", "de Groot", "knieprothese", "Totale knieprothese herstelprotocol", "mark", "rijn", 250, 88, "partially_recovered"],
  ["Sara", "Mulders", "hamstring", "Herstelplan hamstringblessure (voetbal)", "sanne", "centrum", 120, 60, "fully_recovered"],
  ["Peter", "Bos", "rug", "Herstelplan lage rugklachten", "mark", "rijn", 140, 52, "partially_recovered"],
  ["Anouk", "Visser", "schouder", "Herstelplan schouderoverbelasting (impingement, conservatief)", "lisa", "rijn", 110, 33, "fully_recovered"],
  ["Mohamed", "Amrani", "lies", "Herstelplan liesblessure (voetbal)", "daan", "centrum", 90, 21, "fully_recovered"],
  ["Ilse", "Kramer", "heupprothese", "Totale heupprothese herstelprotocol", "lisa", "rijn", 150, 14, "partially_recovered"],
  ["Rob", "Hendriks", "achilles", "Herstelplan achillespees-tendinopathie", "daan", "centrum", 120, 9, "stopped_early"],
  ["Emma", "de Wit", "lopersknie", "Herstelplan lopersknie (patellofemoraal pijnsyndroom)", "sanne", "centrum", 75, 4, "fully_recovered"],
];

const [org] = await api("GET", `organizations?name=eq.${encodeURIComponent("Fysiotherapie De Linde")}&select=id`);
if (!org) throw new Error("Demopraktijk niet gevonden");
await api("DELETE", `patients?organization_id=eq.${org.id}&email=like.*${DOMAIN}`);

const staff = await api("GET", `profiles?email=like.*demo.reva-app.nl&select=id,first_name`);
const therapist = (key) => staff.find((s) => s.first_name?.toLowerCase() === key)?.id ?? null;
const locations = await api("GET", `locations?organization_id=eq.${org.id}&select=id,name`);
const loc = (key) => locations.find((l) => (key === "rijn" ? l.name.includes("Rijn") : l.name.includes("Centrum")))?.id ?? locations[0].id;
const protocols = await api("GET", `protocols?scope=eq.reva&select=id,name,injury_category`);

for (const [first, last, injury, plan, th, l, start, end, outcome] of HISTORY) {
  const tid = therapist(th);
  const [p] = await api("POST", "patients", {
    organization_id: org.id, location_id: loc(l), first_name: first, last_name: last,
    email: `${first}.${last}`.toLowerCase().replace(/\s+/g, "") + `@${DOMAIN}`,
    status: "inactive", assigned_therapist_id: tid, injury_type: injury,
    created_at: ago(start).toISOString(), treatment_start_date: ago(start).toISOString().slice(0, 10),
    discharged_at: ago(end).toISOString(), discharge_outcome: outcome,
  });

  const proto = protocols.find((x) => x.name === plan);
  if (!proto) { console.log("– geen herstelplan gevonden:", plan); continue; }
  const phases = await api("GET", `protocol_phases?protocol_id=eq.${proto.id}&select=name,sort_order&order=sort_order`);
  const [pp] = await api("POST", "patient_protocols", {
    patient_id: p.id, source_protocol_id: proto.id, name: proto.name, injury_category: proto.injury_category,
    status: "completed", assigned_by: tid, assigned_at: ago(start).toISOString(),
  });
  // Fases evenredig over de behandelduur, met wat variatie.
  const total = start - end;
  const n = phases.length;
  const done = outcome === "stopped_early" ? Math.max(1, n - 2) : n;
  let cursor = start;
  const rows = phases.map((ph, i) => {
    const len = Math.max(5, Math.round((total / n) * (0.8 + ((i * 37) % 5) / 10)));
    const s = cursor, e = i < done ? Math.max(end, cursor - len) : null;
    if (e !== null) cursor = e;
    return {
      patient_protocol_id: pp.id, sort_order: ph.sort_order, name: ph.name,
      status: i < done ? "completed" : "not_started",
      started_at: i < done ? ago(s).toISOString() : null,
      completed_at: e !== null ? ago(e).toISOString() : null,
    };
  });
  await api("POST", "patient_protocol_phases", rows);
  console.log("✓", first, last, `(${outcome})`);
}
