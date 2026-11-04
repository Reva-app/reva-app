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

## 4. Eigen privacydocumenten

Praktijken gaan om deze documenten vragen voordat ze tekenen.

- [ ] **Verwerkersovereenkomst REVA ↔ praktijk.** De praktijk is "verwerkingsverantwoordelijke", REVA is "verwerker". Gebruik als basis het model van de Nederlandse ICT-branche (Model Verwerkersovereenkomst 4.0 van Data Pro / NLdigital) en laat hem eenmalig door een jurist nakijken.
- [ ] **Subverwerkerslijst**, die je als bijlage bij die overeenkomst meestuurt:
  - Supabase: database, Ierland (eu-west-1)
  - Vercel: hosting, Frankfurt (fra1)
  - Resend: e-mail, Ierland (eu-west-1)
  - Google Firebase: pushberichten, VS
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
- [ ] Apple- en Google Play-ontwikkelaarsaccount op bedrijfsnaam (Apple vraagt een D-U-N-S-nummer; dat vraag je gratis aan via de D-U-N-S-zoekpagina van Apple, en daarvoor heb je je KvK-inschrijving nodig)
