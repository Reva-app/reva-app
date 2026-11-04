// Buitentest: wat kan iemand zonder account (alleen de openbare anon-sleutel)?
// Probeert elke tabel te lezen en elke RPC aan te roepen. Wijzigt niets.
//
// Gebruik: npm run test:rls   (leest .env.local)
// Draai na elke migratie. Exitcode 1 bij een bevinding.

import { readFileSync } from "node:fs";

function loadEnv(path) {
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch { /* geen .env.local: gebruik de omgeving */ }
}
loadEnv(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anon || !service) {
  console.error("NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY en SUPABASE_SERVICE_ROLE_KEY zijn nodig.");
  process.exit(2);
}

// Functies die anon bewust mag uitvoeren: hulpfuncties die in policies staan
// (moeten voor anon "false" geven, geen foutmelding) — zie migratie 125.
const ANON_RPC_ALLOWED = new Set([
  "can_access_patient", "can_manage_patient", "can_manage_patient_protocol_content",
  "can_manage_org_branding", "can_manage_org_locations", "can_manage_org_patients",
  "can_manage_org_protocols", "can_manage_org_staff", "can_view_audit_log",
  "can_view_org_analytics", "is_org_member", "is_platform_admin", "is_staff_member",
  "session_has_aal2",
]);

// Alleen het schema (welke tabellen en functies er zijn) — geen data.
const spec = await fetch(`${url}/rest/v1/`, {
  headers: { apikey: service, Authorization: `Bearer ${service}` },
}).then((r) => r.json());

const tables = Object.keys(spec.definitions ?? {}).sort();
const rpcs = Object.keys(spec.paths ?? {})
  .filter((p) => p.startsWith("/rpc/"))
  .map((p) => p.slice(5))
  .sort();

const anonHeaders = { apikey: anon, Authorization: `Bearer ${anon}` };
const problems = [];

for (const table of tables) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, {
    headers: { ...anonHeaders, Prefer: "count=exact" },
  });
  const total = Number(res.headers.get("content-range")?.split("/")[1] ?? 0);
  if (res.ok && total > 0) problems.push(`tabel ${table}: ${total} rijen leesbaar zonder in te loggen`);
}

// Neutrale dummywaarden: we willen alleen weten of anon de functie mag starten.
function dummyArgs(fn) {
  const params = spec.paths[`/rpc/${fn}`]?.post?.parameters ?? [];
  const schema = params.find((p) => p.in === "body")?.schema ?? {};
  const args = {};
  for (const [name, prop] of Object.entries(schema.properties ?? {})) {
    const f = prop.format ?? prop.type;
    args[name] = f === "uuid" ? "00000000-0000-0000-0000-000000000000"
      : f === "integer" || prop.type === "integer" ? 1
      : f === "date" ? "2026-01-01"
      : prop.type === "boolean" ? false
      : "x@example.invalid";
  }
  return args;
}

for (const fn of rpcs) {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { ...anonHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(dummyArgs(fn)),
  });
  const body = await res.json().catch(() => ({}));
  const denied = body?.code === "42501";
  if (!denied && !ANON_RPC_ALLOWED.has(fn)) {
    problems.push(`functie ${fn}: aan te roepen zonder in te loggen (status ${res.status}${body?.code ? `, ${body.code}` : ""})`);
  }
}

console.log(`Gecontroleerd: ${tables.length} tabellen, ${rpcs.length} functies.`);
if (problems.length === 0) {
  console.log("✅ Niets leesbaar of aanroepbaar zonder in te loggen.");
} else {
  console.log(`❌ ${problems.length} bevinding(en):`);
  for (const p of problems) console.log(`   - ${p}`);
  process.exit(1);
}
