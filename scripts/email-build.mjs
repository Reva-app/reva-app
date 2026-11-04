// Bouwt alles wat uit lib/email/ voortkomt — draai na elke wijziging daar:
//
//   npm run email:build
//
// 1. supabase/functions/send-checkin-reminder/email.ts
//    layout.ts + messages.ts samengevoegd tot één bestand (Deno kan niet uit
//    lib/ importeren, en één bestand is in het Supabase-dashboard het
//    makkelijkst bij te werken).
// 2. supabase/templates/*.html + README.md
//    De Supabase-auth-mails, om in het dashboard te plakken.
//
// Vereist Node 22.18+ / 24 (draait TypeScript direct, zonder build-stap).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const layoutSrc = readFileSync(join(root, "lib/email/layout.ts"), "utf8");
const messagesSrc = readFileSync(join(root, "lib/email/messages.ts"), "utf8");

// ── 1. Edge Function-bundel ─────────────────────────────────────────────────
const banner = `// ⚠️ GEGENEREERD door \`npm run email:build\` — niet hier wijzigen.
// Bron: lib/email/layout.ts + lib/email/messages.ts\n\n`;
const messagesWithoutImport = messagesSrc.replace(/^import .*?from "\.\/layout\.ts";\n/m, "");
if (messagesWithoutImport === messagesSrc) {
  throw new Error("Importregel van ./layout.ts niet gevonden in messages.ts");
}
writeFileSync(
  join(root, "supabase/functions/send-checkin-reminder/email.ts"),
  banner + layoutSrc + "\n" + messagesWithoutImport
);

// ── 2. Supabase-templates ───────────────────────────────────────────────────
const { renderEmailHtml } = await import(join(root, "lib/email/layout.ts"));
const m = await import(join(root, "lib/email/messages.ts"));

const templates = [
  { file: "bevestig-registratie.html", dashboardName: "Confirm signup", content: m.authConfirmSignupEmail() },
  { file: "wachtwoord-herstellen.html", dashboardName: "Reset Password", content: m.authResetPasswordEmail() },
  { file: "email-wijzigen.html", dashboardName: "Change Email Address", content: m.authChangeEmailEmail() },
];

const outDir = join(root, "supabase/templates");
mkdirSync(outDir, { recursive: true });
for (const t of templates) {
  writeFileSync(join(outDir, t.file), renderEmailHtml(t.content));
}

const readme = `# Supabase-e-mailtemplates

⚠️ Gegenereerd door \`npm run email:build\` uit \`lib/email/\` — pas de teksten dáár aan, niet hier.

## Zo zet je ze in Supabase

1. Supabase Dashboard → **Authentication** → **Emails** → tabblad **Templates**
2. Kies per rij hieronder het template, vul het **onderwerp** in en plak de **volledige inhoud** van het HTML-bestand in het veld *Message body*.
3. Klik op **Save changes**.

| Template in Supabase | Onderwerp | Bestand |
|---|---|---|
${templates.map((t) => `| ${t.dashboardName} | ${t.content.subject} | \`${t.file}\` |`).join("\n")}

De templates *Invite user*, *Magic link* en *Reauthentication* gebruikt REVA niet (uitnodigingen gaan via \`app/api/send-invite\`).

## Controleer ook

- **Authentication → URL Configuration → Site URL** moet \`https://dashboard.reva-app.nl\` zijn — de knoppen in deze mails gebruiken die waarde.
- **Authentication → Emails → SMTP Settings → Sender name**: \`REVA\` (zelfde afzendernaam als alle andere REVA-mails).
`;
writeFileSync(join(outDir, "README.md"), readme);

console.log("✓ supabase/functions/send-checkin-reminder/email.ts");
for (const t of templates) console.log(`✓ supabase/templates/${t.file}`);
console.log("✓ supabase/templates/README.md");
