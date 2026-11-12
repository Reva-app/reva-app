// Demo-testen voor Fysiotherapie De Linde (migratie 145): per patiënt een paar
// testen met metingen in de tijd, zodat het tabblad Testen overtuigend oogt.
// Herhaalbaar: verwijdert eerst de bestaande testen van deze demopatiënten.
//
//   node scripts/demo/seed-demo-tests.mjs
//
// Leest NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY uit .env.local.

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
const ORG_NAME = "Fysiotherapie De Linde";

async function api(method, path, body) {
  const r = await fetch(REST + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

const day = (offset) => { const d = new Date(); d.setDate(d.getDate() - offset); return d.toISOString().slice(0, 10); };

// Per patiënt (voornaam): testen met metingen [dagen geleden, waarde | [links, rechts], notitie?]
const PLAN = {
  Lotte: [
    { test: "Single leg hop test", side: "right", target: 150, results: [[150, [148, 82]], [100, [151, 104]], [55, [150, 122]], [12, [152, 139], "Stabiele landing, nog wat aarzeling"]] },
    { test: "Quadricepskracht (dynamometer)", side: "right", results: [[170, [42, 24]], [120, [43, 30]], [70, [44, 35]], [14, [45, 40]]] },
    { test: "KOOS (knie)", target: 85, results: [[175, 48], [120, 61], [60, 72], [10, 81]] },
    { test: "Return-to-sport vragenlijst (ACL-RSI)", target: 65, results: [[60, 46], [10, 58]] },
  ],
  Monique: [
    { test: "Handknijpkracht", side: "right", results: [[50, [31, 17]], [28, [31, 22]], [6, [32, 26]]] },
    { test: "QuickDASH", target: 15, results: [[52, 48], [27, 36], [5, 25]] },
  ],
  Ruben: [
    { test: "Oswestry Disability Index", target: 20, results: [[60, 44], [50, 40]] },
    { test: "Biering-Sørensen test", results: [[58, 45], [49, 62]] },
  ],
  Youssef: [
    { test: "Hamstringkracht (dynamometer)", side: "left", results: [[18, [21, 30]], [4, [25, 31]]] },
    { test: "Yo-Yo intermittent recovery test", target: 1600, results: [[16, 840, "Gestopt door strak gevoel achter in bovenbeen"], [3, 1120]] },
  ],
  Gerard: [
    { test: "30 seconden stoeltest", target: 14, results: [[80, 8], [45, 11], [9, 13]] },
    { test: "Timed Up and Go", target: 9, results: [[80, 14.2], [45, 11.5], [9, 9.8]] },
  ],
};

const [org] = await api("GET", `organizations?name=eq.${encodeURIComponent(ORG_NAME)}&select=id`);
if (!org) throw new Error("Demopraktijk niet gevonden");
const patients = await api("GET", `patients?organization_id=eq.${org.id}&select=id,first_name,assigned_therapist_id`);
const library = await api("GET", `test_library?scope=eq.reva&select=*`);

for (const [firstName, tests] of Object.entries(PLAN)) {
  const p = patients.find((x) => x.first_name === firstName);
  if (!p) { console.log("– overgeslagen:", firstName); continue; }
  await api("DELETE", `patient_tests?patient_id=eq.${p.id}`);
  const [assignment] = await api("GET", `patient_protocols?patient_id=eq.${p.id}&status=in.(active,paused)&select=id`);
  const phases = assignment ? await api("GET", `patient_protocol_phases?patient_protocol_id=eq.${assignment.id}&select=id,status`) : [];
  const activePhase = phases.find((x) => x.status === "active") ?? null;

  for (const t of tests) {
    const lib = library.find((x) => x.name === t.test);
    if (!lib) throw new Error("Test niet in bibliotheek: " + t.test);
    const oldest = Math.max(...t.results.map((r) => r[0]));
    const [row] = await api("POST", "patient_tests", {
      patient_id: p.id, library_test_id: lib.id, name: lib.name, category: lib.category, unit: lib.unit,
      higher_is_better: lib.higher_is_better, bilateral: lib.bilateral, involved_side: lib.bilateral ? t.side ?? null : null,
      instructions: lib.instructions, target_value: t.target ?? null, added_by: p.assigned_therapist_id,
      phase_id: t.results.length <= 2 && activePhase ? activePhase.id : null,
      created_at: new Date(Date.now() - oldest * 86_400_000).toISOString(),
    });
    await api("POST", "patient_test_results", t.results.map(([ago, v, note]) => ({
      patient_test_id: row.id, patient_id: p.id, measured_on: day(ago), measured_by: p.assigned_therapist_id,
      value: Array.isArray(v) ? null : v,
      // In PLAN staat [gezonde zijde, aangedane zijde]; zet ze op de juiste kant.
      value_left: Array.isArray(v) ? (t.side === "left" ? v[1] : v[0]) : null,
      value_right: Array.isArray(v) ? (t.side === "left" ? v[0] : v[1]) : null,
      note: note ?? null,
    })));
  }
  console.log("✓", firstName, tests.length, "testen");
}
