# Supabase-e-mailtemplates

⚠️ Gegenereerd door `npm run email:build` uit `lib/email/` — pas de teksten dáár aan, niet hier.

## Zo zet je ze in Supabase

1. Supabase Dashboard → **Authentication** → **Emails** → tabblad **Templates**
2. Kies per rij hieronder het template, vul het **onderwerp** in en plak de **volledige inhoud** van het HTML-bestand in het veld *Message body*.
3. Klik op **Save changes**.

| Template in Supabase | Onderwerp | Bestand |
|---|---|---|
| Confirm signup | Bevestig je e-mailadres voor REVA | `bevestig-registratie.html` |
| Reset Password | Stel een nieuw wachtwoord in voor REVA | `wachtwoord-herstellen.html` |
| Change Email Address | Bevestig de wijziging van je e-mailadres | `email-wijzigen.html` |

De templates *Invite user*, *Magic link* en *Reauthentication* gebruikt REVA niet (uitnodigingen gaan via `app/api/send-invite`).

## Controleer ook

- **Authentication → URL Configuration → Site URL** moet `https://dashboard.reva-app.nl` zijn — de knoppen in deze mails gebruiken die waarde.
- **Authentication → Emails → SMTP Settings → Sender name**: `REVA` (zelfde afzendernaam als alle andere REVA-mails).
