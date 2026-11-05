# Checklist: zodra REVA een KvK-nummer heeft

Dingen die nu nog niet kunnen omdat er nog geen onderneming is. Werk ze van boven naar beneden af en vink ze af.

Laatst bijgewerkt: 4 november 2026

---

## 1. Inschrijven

- [ ] Inschrijven bij de KvK (eenmanszaak of bv; vraag bij twijfel een boekhouder)
- [ ] Zakelijke bankrekening openen
- [ ] Btw-nummer ontvangen van de Belastingdienst (komt automatisch na KvK-inschrijving)

## 2. Accounts op naam van het bedrijf zetten

Bij elke dienst: ga naar de factuur- of organisatie-instellingen en vul de bedrijfsnaam, het KvK-nummer en het btw-nummer in.

- [ ] Supabase (Organization → Billing)
- [ ] Vercel (Settings → Billing)
- [ ] Resend (Settings → Billing)
- [ ] Google / Firebase (Google Cloud Console → Billing)
- [ ] Sentry (Settings → Subscription)
- [ ] Domeinnaam reva-app.nl bij Hostnet op naam van het bedrijf zetten
- [ ] GitHub-organisatie `Reva-app`: factuurgegevens invullen

## 3. Verwerkersovereenkomsten tekenen (AVG)

REVA verwerkt gezondheidsgegevens, dus met elke dienst die daarbij kan meekijken heb je een verwerkersovereenkomst (DPA) nodig. Sla elk getekend document op in één map, bijvoorbeeld `Juridisch/Verwerkersovereenkomsten`.

- [ ] **Supabase** (database, de belangrijkste)
  1. Supabase Dashboard → je organisatie → **Legal Documents**
  2. Klik op **DPA** → vul bedrijfsnaam en KvK-gegevens in → ondertekenen (via PandaDoc)
  3. PDF downloaden en opslaan
- [ ] **Vercel** (hosting van de website en API)
  1. Ga naar vercel.com/legal/dpa
  2. De DPA geldt automatisch via de voorwaarden. Download de PDF en sla hem op
- [ ] **Resend** (e-mail)
  1. Ga naar resend.com/legal/dpa
  2. Download de PDF en sla hem op (bij vragen: mail naar het adres dat daar staat)
- [ ] **Google / Firebase** (pushberichten in de app)
  1. Firebase Console → je project → tandwiel → **Project settings** → **Privacy** (of: Google Cloud Console → IAM → Settings)
  2. Accepteer de **Data Processing Terms** en vul je bedrijfsgegevens in
  3. Let op: Firebase verwerkt data in de VS. Noteer dat in je verwerkingsregister (stap 4)
  4. Leg vast op welke grond die doorgifte naar de VS mag (Google valt onder het EU-US Data Privacy Framework; controleer of dat nog geldt) en zet in de subverwerkerslijst dat er via push **geen gezondheidsgegevens** worden verstuurd. Dat is sinds november 2026 zo ingebouwd.
- [ ] **Sentry** (foutmeldingen)
  1. Ga naar sentry.io/legal/dpa
  2. De DPA geldt via de voorwaarden. Download de PDF en sla hem op
  3. Sentry krijgt alleen technische foutinformatie, geen IP-adressen of patiëntgegevens

## 4. Eigen privacydocumenten

Praktijken gaan om deze documenten vragen voordat ze tekenen.

- [ ] **Verwerkersovereenkomst REVA ↔ praktijk.** De praktijk is "verwerkingsverantwoordelijke", REVA is "verwerker". Gebruik als basis het model van de Nederlandse ICT-branche (Model Verwerkersovereenkomst 4.0 van Data Pro / NLdigital) en laat hem eenmalig door een jurist nakijken.
- [ ] **Subverwerkerslijst**, die je als bijlage bij die overeenkomst meestuurt:
  - Supabase: database, Ierland (eu-west-1)
  - Vercel: hosting, Frankfurt (fra1)
  - Resend: e-mail, Ierland (eu-west-1)
  - Google Firebase: pushberichten, VS
  - Sentry: foutmeldingen, Frankfurt (EU)
- [ ] **Register van verwerkingsactiviteiten.** Een eenvoudige tabel: welke gegevens, waarom, hoe lang bewaard, welke subverwerker.
- [ ] **Privacyverklaring** op reva-app.nl
- [ ] **Algemene voorwaarden** voor praktijken (met opzegtermijn, aansprakelijkheid en wat er met data gebeurt na opzegging)
- [ ] **Datalekprocedure.** Één A4: wie doet wat, en binnen 72 uur melden bij de Autoriteit Persoonsgegevens via autoriteitpersoonsgegevens.nl
- [ ] **DPIA overwegen.** Bij gezondheidsdata op grotere schaal is een DPIA verplicht. Vraag een jurist of dat voor REVA al geldt.

## 5. Betalen en verkopen

- [ ] Stripe-account aanmaken op naam van het bedrijf (Stripe vraagt KvK-nummer en bankrekening)
- [ ] KvK-nummer en btw-nummer in de footer van reva-app.nl en in de e-mails (wettelijk verplicht op je website)
- [ ] Beroeps- en bedrijfsaansprakelijkheidsverzekering afsluiten (eventueel met cyberdekking)

## 6. Vóór de officiële lancering (techniek, niet KvK-gebonden)

Staat hier als geheugensteun. Deze punten hangen niet af van de KvK.

- [ ] Supabase **Point-in-Time Recovery** aanzetten (add-on in Supabase → Database → Backups)
- [ ] Eén keer een backup terugzetten als test
- [ ] Supabase **spend cap** heroverwegen, zodat de app niet stilvalt als je over het quotum gaat
- [ ] **Externe pentest** laten doen door een gespecialiseerd bureau, vóór de eerste betalende praktijken. Vraag om: het Practice Portal en de patiënt-app (ingelogd, met MFA), de afscherming tussen praktijken (RLS) en de API-routes. Reken op €1.500 tot €5.000. Het rapport is ook handig als een praktijk vraagt hoe veilig REVA is.
- [ ] **Pakketupdates na 19 november 2026.** De gerepareerde versies waren bij de check van 5 november nog te nieuw om veilig te installeren. Het gaat alleen om bouwgereedschap, niets dat bij gebruikers draait:
  - `@sentry/nextjs` naar 11.11 of nieuwer (lost de 5 middelmatige meldingen in `npm audit --omit=dev` op)
  - `eslint-config-next` / `typescript-eslint` bijwerken zodra die minimatch 11 gebruiken
  - daarna `npm audit` draaien en de `overrides` in package.json weer weghalen waar ze niet meer nodig zijn
- [ ] **Native app-build (Capacitor) repareren** vóór je de app in de App Store / Play Store zet: `npm run build:cap` faalt sinds het Practice Portal er is, omdat portal- en adminpagina's met een id in het pad (bv. `/admin/organisaties/[id]`) geen statische export kunnen zijn. Oplossing: de native app alleen de patiëntpagina's laten bevatten. Een paar uur werk.
- [ ] Apple- en Google Play-ontwikkelaarsaccount op bedrijfsnaam (Apple vraagt een D-U-N-S-nummer; dat vraag je gratis aan via de D-U-N-S-zoekpagina van Apple, en daarvoor heb je je KvK-inschrijving nodig)
