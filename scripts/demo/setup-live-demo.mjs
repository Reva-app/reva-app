// Vaste, lege demo-omgeving voor live demo's met een lead.
// Maakt eenmalig de praktijk "Demopraktijk" aan met:
//   - eigenaar  demo@demo.reva-app.nl     (Practice Portal)
//   - patiënt   patient@demo.reva-app.nl  (patiënten-app; wordt gekoppeld zodra
//     je in de demo een patiënt met dit e-mailadres aanmaakt)
// Na de demo maak je alles weer leeg met de knop "Demo leegmaken"
// (Account → Account in de portal, of de praktijkpagina in het beheer).
//
//   node scripts/demo/setup-live-demo.mjs
//
// Schrijft het organisatie-id en het wachtwoord naar de console; zet het id in
// lib/demo.ts (DEMO_ORG_IDS).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, randomBytes } from "node:crypto";

const root = fileURLToPath(new URL("../..", import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; })
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const ORG_NAME = "Demopraktijk";
const OWNER = { email: "demo@demo.reva-app.nl", first: "Stef", last: "Robberts" };
const PATIENT_EMAIL = "patient@demo.reva-app.nl";
const PASSWORD = `Demo-${randomBytes(4).toString("hex")}-Reva!`;

async function rest(method, path, body) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, { method, headers: { ...H, Prefer: "return=representation" }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
async function createUser(email, fullName) {
  const res = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST", headers: H,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: fullName } }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`createUser ${email}: ${JSON.stringify(json)}`);
  return json.id;
}

const existing = await rest("GET", `organizations?select=id&name=eq.${encodeURIComponent(ORG_NAME)}`);
if (existing.length) throw new Error(`"${ORG_NAME}" bestaat al (${existing[0].id})`);

const orgId = randomUUID();
const locId = randomUUID();
await rest("POST", "organizations", { id: orgId, name: ORG_NAME, status: "active", plan: "behandelaar", billing_interval: "month", max_members: 999, max_locations: 999, max_patients: null });
await rest("POST", "locations", { id: locId, organization_id: orgId, name: "Hoofdlocatie", is_main_location: true });
const roles = Object.fromEntries((await rest("GET", "roles?select=id,key")).map((r) => [r.key, r.id]));

// Eigenaar: via een uitnodiging, zodat de trigger het lidmaatschap aanmaakt (zoals in het echt).
await rest("POST", "membership_invites", { organization_id: orgId, email: OWNER.email, first_name: OWNER.first, last_name: OWNER.last, role_id: roles.organization_owner, location_id: locId, status: "pending" });
const ownerId = await createUser(OWNER.email, `${OWNER.first} ${OWNER.last}`);
await rest("PATCH", `profiles?id=eq.${ownerId}`, { first_name: OWNER.first, last_name: OWNER.last, full_name: `${OWNER.first} ${OWNER.last}`, title: "Fysiotherapeut" });

// Patiënt: alleen het account. Zonder dossier zou de trigger een persoonlijke
// werkruimte aanmaken; die ruimen we direct op (en de reset doet dat ook).
const patientId = await createUser(PATIENT_EMAIL, "");
const own = await rest("GET", `patients?select=id,organization_id&user_id=eq.${patientId}`);
for (const p of own) await rest("DELETE", `organizations?id=eq.${p.organization_id}`);

console.log(JSON.stringify({ orgId, ownerId, patientUserId: patientId, password: PASSWORD }, null, 2));
