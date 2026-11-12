// Verwijdert de demopraktijk "Fysiotherapie De Linde" volledig:
// alle accounts op @demo.reva-app.nl (met hun persoonlijke gegevens en
// bestanden) en de organisatie zelf (cascade: dossiers, plannen, notities).
//
//   node scripts/demo/cleanup-demo.mjs

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; })
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const DOMAIN = "@demo.reva-app.nl";
const ORG_NAME = "Fysiotherapie De Linde";

async function rest(method, path) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, { method, headers: { ...H, Prefer: "return=representation" } });
  if (!res.ok) throw new Error(`${method} ${path}: ${await res.text()}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}
async function removeFolder(bucket, prefix) {
  const res = await fetch(`${URL_}/storage/v1/object/list/${bucket}`, { method: "POST", headers: H, body: JSON.stringify({ prefix, limit: 1000 }) });
  const items = res.ok ? await res.json() : [];
  if (!items.length) return;
  await fetch(`${URL_}/storage/v1/object/${bucket}`, { method: "DELETE", headers: H, body: JSON.stringify({ prefixes: items.map((i) => `${prefix}/${i.name}`) }) });
}

// Alle demo-accounts
const users = [];
for (let page = 1; ; page++) {
  const res = await fetch(`${URL_}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: H });
  const json = await res.json();
  const batch = json.users ?? [];
  users.push(...batch.filter((u) => (u.email ?? "").endsWith(DOMAIN)));
  if (batch.length < 200) break;
}

const orgs = await rest("GET", `organizations?select=id&name=eq.${encodeURIComponent(ORG_NAME)}`);
for (const o of orgs) await removeFolder("organization-logos", o.id);

for (const u of users) {
  await removeFolder("dossier-photos", u.id);
  await removeFolder("dossier-documents", u.id);
  await removeFolder("avatars", u.id);
  // Persoonlijke werkruimtes die de trigger voor medewerkers aanmaakte
  const own = await rest("GET", `patients?select=organization_id&user_id=eq.${u.id}`);
  for (const p of own) {
    if (!orgs.some((o) => o.id === p.organization_id)) await rest("DELETE", `organizations?id=eq.${p.organization_id}`);
  }
}
for (const o of orgs) await rest("DELETE", `organizations?id=eq.${o.id}`);
for (const u of users) {
  const res = await fetch(`${URL_}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H });
  if (!res.ok) console.error("Account niet verwijderd:", u.email, await res.text());
}
console.log(`Verwijderd: ${orgs.length} praktijk(en), ${users.length} demo-accounts`);
