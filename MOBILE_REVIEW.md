# REVA: mobiele review

**Datum:** 5 november 2026
**Status:** alleen onderzoek; er is geen code gewijzigd.
**Getest op:** 375 px (kleine telefoon), 430 px (grote telefoon), 768 px (tablet staand) en 1024 px (tablet liggend).

---

## Samenvatting

Het fundament is beter dan het gevoel "werkt niet goed op mobiel" doet vermoeden. Op 46 schermen en 4 breedtes scrolt de pagina nergens horizontaal, op één scherm na. De onderbalk met "Meer"-paneel werkt prima met één duim, en safe-areas (notch, home-indicator) zijn al geregeld.

De problemen zitten niet in losse schermen maar in **vijf terugkerende patronen**:

1. **Modals vallen onder de onderbalk.** De knop "Opslaan" wordt deels bedekt. De onderbalk blijft klikbaar terwijl een formulier openstaat, dus één misklik en de invoer is weg.
2. **Lijsten zijn brede tabellen die horizontaal scrollen.** Op een telefoon is maar 35–45% van de tabel zichtbaar, en niets laat zien dat er meer staat. In de patiëntenlijst zie je alleen de naam; behandelaar, herstelplan en laatste check-in staan buiten beeld.
3. **Tikdoelen en invoervelden zijn op desktop afgestemd.** De ⋮-knoppen zijn 28×28 px, het kalendericoon 23×23 px en het wachtwoord-oog 16×16 px. Invoervelden zijn 14 px; het inzoomen bij focus wordt nu verborgen door zoomen helemaal uit te zetten, en dat is slecht voor de toegankelijkheid.
4. **Er is geen echte tabletindeling.** `md:` wordt nergens gebruikt. Tablet staand (768) krijgt een uitgerekte telefoonweergave. Tablet liggend (1024) krijgt meteen de volledige desktopweergave met sidebar, met krappe kolommen en 100% van de tikdoelen onder 44 px.
5. **Er zijn geen gedeelde formulier- en lijstcomponenten.** Invoerstijlen zijn in 10+ pagina's gekopieerd. Een reparatie per scherm moet daardoor steeds opnieuw.

**Advies:** pak dit centraal aan, met gedeelde lagen (z-index), formuliercomponenten, een responsieve lijstcomponent en afspraken over breakpoints. Repareer daarna de schermen in volgorde van dagelijks gebruik. Dat kost naar schatting 45–60 uur, dus 6–8 weken bij 5–10 uur per week. Zie het stappenplan onderaan.

**Bijvangst: een ernstige bug in de patiënt-app.** Een directe link of het opnieuw openen van de app (bijvoorbeeld `/check-in` vanuit een herinneringsmail) stuurt de patiënt naar Instellingen in plaats van naar de pagina. Zie bevinding A1. Dit is geen layoutprobleem, maar het raakt mobiel het hardst.

---

## Hoe er getest is

- **Lokale omgeving.** De app draaide lokaal (`next dev`, Next 16.4.5) en is bekeken met Playwright in Chromium, in mobiele emulatie met touch aan voor breedtes onder 1024.
- **Testdata.** Er was een tijdelijke testpraktijk met een Practice Owner (met MFA), 10 fictieve patiënten en 14 check-ins. Daarnaast een testpatiënt voor de patiënt-app.
- **Per scherm en per breedte:**
  - een screenshot, en een volledige pagina-opname;
  - automatische metingen:
    - horizontale overloop van de pagina en van de scrollcontainer `<main>`;
    - elementen buiten beeld;
    - tabellen die horizontaal scrollen, met de zichtbare breedte tegenover de totale breedte;
    - tikdoelen onder 44 px en onder 32 px;
    - invoervelden onder 16 px;
    - tekst onder 12 px;
    - invoertypes en ontbrekende labels.
- **Interacties.** Getest zijn:
  - de wizard "Patiënt toevoegen";
  - het ⋮-actiemenu;
  - het "Meer"-paneel;
  - de modal "Patiëntgegevens wijzigen", ook op 375×667 (iPhone SE);
  - de check-in-modal in de patiënt-app;
  - de tabbladen op patiëntdetail.
- **Niet visueel getest:**
  - Het **Super Admin-portal**: alleen in de code bekeken, want het vereist het platform-admin-account.
  - **Echte iOS Safari**: Chromium-emulatie benadert dit goed, maar gedrag als de dynamische werkbalk, het toetsenbord en `100vh` moet nog op een echt toestel gecontroleerd worden.
  - **Performance** is in de dev-modus niet eerlijk te meten. Die bevindingen komen uit de code (zie §3.8).
- **Screenshots** van de belangrijkste bevindingen staan in [`docs/mobile-review/`](docs/mobile-review/).

---

## Stap 1: Inventarisatie

### 1.1 Styling-opzet

| Onderdeel | Hoe het nu werkt |
|---|---|
| Framework | Next.js 16.4.5 (App Router), React 19, alles client-components |
| CSS | **Tailwind CSS v4** (`@import "tailwindcss"` in [app/globals.css](app/globals.css)). Kleuren staan als CSS-variabelen in `:root`, maar het grootste deel van de kleuren staat als **inline `style={{ … }}` met hex-codes** in de componenten. |
| Breakpoints | Standaard Tailwind. Gebruik in de code: `sm:` 264×, `lg:` 65×, `xl:` 1×, **`md:` 0×**. Op 3 plekken staan breakpoints in JavaScript (`window.innerWidth < 640`). |
| Layout | `html/body` op `h-full`. Per portaal een flex-layout met **`<main>` als scrollcontainer** (`overflow-y-auto`). Sidebar vanaf `lg` (1024), onderbalk onder `lg`. `.pb-nav` reserveert ruimte voor de onderbalk. |
| Mobiel-specifiek | Safe-area-utilities (`pt-safe`, `pb-safe`, `viewportFit: cover`), `.touch-press`, bottom-sheet-animaties, `-webkit-tap-highlight-color` uit. |
| Viewport | `maximumScale: 1` in [app/layout.tsx:59](app/layout.tsx#L59), wat zoomen blokkeert (zie F2). |
| Gedeelde UI | `components/ui/`: Button, Card, Badge, Modal, Tabs, DatePicker, TimePicker, ActionMenu, ConfirmDialog, StatCard, Toast, plus `table/` (Pagination, ScrollHintX, SortableHeader, useTableState). **Ontbreekt: Input, Select, Textarea, Field en een responsieve lijst/tabel.** |
| Native app | Capacitor-build (`build:cap`), dezelfde code als statische export. Het manifest staat op `orientation: "portrait"`. |

### 1.2 Practice Portal (fysiotherapeut): 22 schermen

| Scherm | Route | Bestand |
|---|---|---|
| Dashboard | `/portal` | [app/portal/(protected)/page.tsx](app/portal/(protected)/page.tsx) |
| Patiëntenlijst | `/portal/patienten` | [patienten/page.tsx](app/portal/(protected)/patienten/page.tsx) |
| Patiëntdetail: Overzicht / Herstelplan / Logboek (Notities, Intake, Faseovergangen) | `/portal/patienten/[id]` | [patienten/[id]/page.tsx](app/portal/(protected)/patienten/[id]/page.tsx) (1883 regels) |
| Herstelplannen (lijst, detail, fase) | `/portal/herstelplannen…` | [herstelplannen/](app/portal/(protected)/herstelplannen/) |
| Oefeningen (lijst, detail) | `/portal/oefeningen…` | [oefeningen/](app/portal/(protected)/oefeningen/) |
| Schema's (lijst, detail) | `/portal/schemas…` | [schemas/](app/portal/(protected)/schemas/) |
| Reserveringen (dag/week) | `/portal/reserveringen` | [reserveringen/page.tsx](app/portal/(protected)/reserveringen/page.tsx), [WeekScheduleGrid.tsx](components/portal/WeekScheduleGrid.tsx) |
| Medewerkers (lijst, detail met tabs Algemeen / Werkuren / Verlof / Agenda) | `/portal/medewerkers…` | [medewerkers/](app/portal/(protected)/medewerkers/), [MedewerkerDetail.tsx](components/portal/MedewerkerDetail.tsx) |
| Locaties (lijst, detail) | `/portal/locaties…` | [locaties/](app/portal/(protected)/locaties/), [LocationForm.tsx](components/portal/LocationForm.tsx) |
| Analyse | `/portal/analyse` | [analyse/page.tsx](app/portal/(protected)/analyse/page.tsx) |
| Activiteitenlog | `/portal/activiteitenlog` | [activiteitenlog/page.tsx](app/portal/(protected)/activiteitenlog/page.tsx) |
| Huisstijl | `/portal/huisstijl` | [huisstijl/page.tsx](app/portal/(protected)/huisstijl/page.tsx) |
| Abonnement | `/portal/abonnement` | [abonnement/page.tsx](app/portal/(protected)/abonnement/page.tsx) |
| Account | `/portal/account` | [account/page.tsx](app/portal/(protected)/account/page.tsx) |
| Login + MFA | `/portal/login` | [portal/login/page.tsx](app/portal/login/page.tsx), MfaEnroll- en MfaChallengeScreen |

**Modals en popups in het portal:**
- [PatientWizard](components/portal/PatientWizard.tsx), zes stappen;
- [PatientEditForm](components/portal/PatientEditForm.tsx);
- [StaffInviteForm](components/portal/StaffInviteForm.tsx);
- [LocationForm](components/portal/LocationForm.tsx);
- [ExerciseMultiSelectModal](components/portal/ExerciseMultiSelectModal.tsx);
- [PhaseTransitionModal](components/portal/PhaseTransitionModal.tsx);
- [ConfirmDialog](components/ui/ConfirmDialog.tsx);
- de check-in-geschiedenis.

De gedeelde [Modal](components/ui/Modal.tsx) wordt 17× gebruikt. Popovers: [ActionMenu](components/ui/ActionMenu.tsx), [DatePicker](components/ui/DatePicker.tsx), [TimePicker](components/ui/TimePicker.tsx) en [ColorPicker](components/ui/ColorPicker.tsx).

**Navigatie:**
- [PortalSidebar](components/layout/PortalSidebar.tsx) vanaf 1024 px;
- [PortalMobileNav](components/layout/PortalMobileNav.tsx) onder 1024 px: vast Dashboard, Patiënten, Herstelplannen en Medewerkers, plus "Meer" als bottom sheet met alle pagina's, Account en Uitloggen;
- banners: [TrialBanner](components/portal/TrialBanner.tsx) en [PlanUsageBanner](components/portal/PlanUsageBanner.tsx).

### 1.3 Patient Portal (patiënt-app): 9 schermen

Dashboard `/`, Check-in, Dagboek/Afspraken, Training, Dossier, Medicatie, Analyse, Doelstellingen en Instellingen. Ze staan in [app/(app)/](app/(app)/).

- **Navigatie:** [MobileNav](components/layout/MobileNav.tsx) met een verhoogde Check-in-knop in het midden, [TopBar](components/layout/TopBar.tsx), [QuickActionFAB](components/layout/QuickActionFAB.tsx), [NotificationPanel](components/layout/NotificationPanel.tsx), en [Sidebar](components/layout/Sidebar.tsx) vanaf 1024.
- **Modals:** [CheckInModal](components/checkin/CheckInModal.tsx), [AppointmentModal](components/dagboek/AppointmentModal.tsx), [InnameModal](components/medicatie/InnameModal.tsx), [TrainingModal](components/training/TrainingModal.tsx) en [UpgradeModal](components/subscription/UpgradeModal.tsx), plus eigen overlays in 5 pagina's. Dat zijn **10 eigen `fixed inset-0`-implementaties** naast de gedeelde Modal.

### 1.4 Overige

- **Auth:** `/login`, `/register`, `/forgot-password`, `/auth/reset-password`, `/auth/verify`, `/auth/callback`.
- **Super Admin:** `/admin` (dashboard, organisaties plus detail, gebruikers, pijplijn, statistieken) met [AdminSidebar](components/layout/AdminSidebar.tsx) en [AdminMobileNav](components/layout/AdminMobileNav.tsx). Dit is alleen in de code bekeken; het wordt vrijwel alleen door jou op desktop gebruikt en heeft daarom de laagste prioriteit.

---

## Stap 2: Resultaten per scherm

### 2.1 Metingen (Practice Portal)

De tabel toont de meting op 375 px. Op 430 en 768 zijn de cijfers vrijwel gelijk. Op 1024 is **elk** tikdoel kleiner dan 44 px, omdat daar de desktopweergave verschijnt.

| Scherm | Horizontale overloop | Tabel zichtbaar / breed | Tikdoelen < 44 px | Velden < 16 px |
|---|---|---|---|---|
| Dashboard | — | — | 15 van 24 | — |
| Patiëntenlijst | — | **341 / 942 px** | 17 van 22 | 6 van 6 |
| Patiëntdetail: Overzicht | **+160 px** (375), **+105 px** (430), afgesneden op 1024 | — | 12 van 17 | — |
| Patiëntdetail: Herstelplan | — | — | 9 van 14 | — |
| Patiëntdetail: Logboek | — | — | 12 van 17 | 1 van 1 |
| Herstelplannen | — | **341 / 1021 px** | 27 van 32 | 5 van 5 |
| Herstelplan: fase bewerken | — | — | 3 van 8 | 13 van 13 |
| Oefeningen | — | tabel | 28 van 33 | 6 van 6 |
| Oefening-detail | — | — | 4 van 9 | 8 van 8 |
| Schema's / schema-detail | — | tabel | 26 van 31 / 3 van 8 | 4/4, 2/2 |
| Reserveringen | — | weekraster `minWidth: 880` | 5 van 10 | 2 van 2 |
| Medewerkers / detail | — | — | laag | 0 / formulier |
| Locaties / detail | — | — | 4 van 9 | 1 van 1 |
| Analyse | — | — | 3 van 8 | — (16 teksten < 12 px) |
| Activiteitenlog | — | **341 / 750 px** | **54 van 60** | 5 van 5 |
| Huisstijl | — | — | 15 van 20 | 1 van 1 |
| Abonnement / Account | — | — | laag / 7 van 12 | 0 / 6 van 6 |

### 2.2 Metingen (patiënt-app en auth)

| Scherm | Tikdoelen < 44 px (375) | Velden < 16 px | Tekst < 12 px |
|---|---|---|---|
| Dashboard | 8 van 29 | — | 26 |
| Check-in | 39 van 47 (scoreknoppen 29×36) | 2 van 2 | 18 |
| Dagboek/afspraken | 6 van 12 | — | **61** (kalender en legenda) |
| Training / Dossier / Medicatie / Doelen | 3–7 | — | 5–12 |
| Analyse | 5 van 11 | — | 25 |
| Instellingen | 23 van 29 | 15 van 15 | 22 |
| Login | "Vergeten?" 58×16, wachtwoord-oog 16×16 | 2 van 2 | — |

### 2.3 Wat er per breedte opvalt

- **375 / 430 (telefoon).**
  - De structuur klopt: één kolom, onderbalk en Meer-paneel.
  - Lijsten tonen alleen de eerste kolom plus het ⋮-menu; de rest staat buiten beeld.
  - Filterblokken en statistiekkaarten duwen de echte inhoud onder de vouw. Op Patiënten staat de eerste patiënt op ±780 px, onder de onderbalk.
  - Patiëntdetail wordt ±2000 px lang, omdat de zijkolom onder elke tab herhaald wordt.
- **768 (tablet staand).**
  - Telefoonlayout, alleen breder. Statistiekkaarten staan in 4 kolommen.
  - Tabellen passen net, met afbrekende cellen.
  - De onderbalk blijft staan, met 5 knoppen over 768 px.
  - Er is geen tweekolomsindeling waar dat zou helpen: de patiëntenlijst plus detail, of formulieren.
- **1024 (tablet liggend).**
  - De desktopweergave met een sidebar van 224 px laat ±800 px over voor de inhoud.
  - Tabelcellen breken over 3 regels ("Fysio / Centrum / Utrecht").
  - Op patiëntdetail wordt het periodefilter afgesneden ("30 dagen" valt weg).
  - Alle knoppen hebben desktopmaat, terwijl een iPad een touchscherm is.

---

## Stap 3: Bevindingen

**Ernst:**
- **kritiek:** blokkeert werk of leidt tot dataverlies;
- **hoog:** dagelijks hinderlijk of fout op een kernscherm;
- **middel:** merkbaar, maar er is een omweg;
- **laag:** polish.

### 3.1 Layout

| # | Scherm | Bestand | Wat er misgaat | Breedte | Ernst |
|---|---|---|---|---|---|
| L1 | Alle portal-modals (wizard, patiënt wijzigen, uitnodigen, locatie, bevestigen) | [components/ui/Modal.tsx:15](components/ui/Modal.tsx#L15) (`z-40`) tegenover [PortalMobileNav.tsx:49](components/layout/PortalMobileNav.tsx#L49) (`z-50`) | De onderbalk ligt **bovenop** de modal. Op 375×667 valt "Opslaan" 10 px onder de balk (zie `docs/mobile-review/i-edit-bottom-375x667.png`). De balk blijft klikbaar, dus een tik op "Patiënten" verlaat de pagina en gooit niet-opgeslagen invoer weg. `max-h-[90vh]` houdt ook geen rekening met de dynamische werkbalk van iOS. | < 1024 | **Hoog** |
| L2 | Patiëntdetail: Overzicht | [patienten/[id]/page.tsx:1242-1249](app/portal/(protected)/patienten/[id]/page.tsx#L1242-L1249), `TrendRangeFilter` r. 127 | De kopregel van "Check-in status" (badge, knop Geschiedenis en filter 7/14/30) past niet. De pagina scrolt horizontaal (+160 px op 375). Op 1024 valt "30 dagen" buiten de kaart. | 375, 430, 1024 | **Hoog** |
| L3 | Patiëntdetail (alle tabs) | [patienten/[id]/page.tsx](app/portal/(protected)/patienten/[id]/page.tsx) | Op mobiel staat de zijkolom (Status, Afsluiting behandeling, Behandelgegevens) onder **elke** tab, ook onder Logboek. Daardoor ±2000 px scrollen. "Verwijderen" staat als gewone knop midden op het scherm. | < 1024 | **Hoog** |
| L4 | Patiëntdetail: Status | [patienten/[id]/page.tsx:75, 94, 248](app/portal/(protected)/patienten/[id]/page.tsx#L75) | Twee identieke badges "Actief Actief" (dossierstatus en accountstatus) zonder label. Onduidelijk op elke breedte. | alle | Middel |
| L5 | Patiënten, Oefeningen, Herstelplannen, Activiteitenlog | betreffende `page.tsx` | Statistiekkaarten en 5–6 filters staan vóór de lijst. Op 375 begint de eerste patiënt pas op ±780 px, onder de vouw. | 375–430 | Middel |
| L6 | Herstelplannen, schema-detail | [herstelplannen/page.tsx](app/portal/(protected)/herstelplannen/page.tsx), [schemas/[id]/page.tsx](app/portal/(protected)/schemas/[id]/page.tsx) | Namen worden na ±25 tekens afgekapt. Bijna alles begint met "Herstelplan …", waardoor het onderscheidende deel wegvalt ("Herstelplan hamstringbles…" twee keer). | 375–430 | Middel |
| L7 | Medewerker-detail | [components/ui/Tabs.tsx:16](components/ui/Tabs.tsx#L16) | Tabs scrollen horizontaal zonder hint. "Verlof" is half zichtbaar en "Agenda" niet. Dit geldt voor elke plek die `Tabs` met meer dan 3 opties gebruikt. | 375–430 | Middel |
| L8 | Reserveringen (week) | [WeekScheduleGrid.tsx:146, 166](components/portal/WeekScheduleGrid.tsx#L146) | `minWidth: 880`: het weekraster is op telefoon alleen horizontaal scrollend te gebruiken. Een dagweergave bestaat al en zou op mobiel de standaard moeten zijn. | < 900 | Laag |
| L9 | Alle portal-pagina's | [TrialBanner.tsx](components/portal/TrialBanner.tsx) | De proefperiodebanner neemt op telefoon 2 regels (52 px) in op elke pagina en is niet weg te klikken. | 375–430 | Laag |
| L10 | Portal-dashboard | [app/portal/(protected)/page.tsx](app/portal/(protected)/page.tsx) | Drie statistiekkaarten van "Mijn patiënten" staan in volle breedte onder elkaar (±400 px). De patiëntnaam wordt afgekapt ("Thomas …") naast de signaalbadges. | 375–430 | Laag |
| L11 | Patiënt-app: Check-in, Training (lege staat) | [QuickActionFAB.tsx:57](components/layout/QuickActionFAB.tsx#L57) | De zwevende +-knop (`z-[60]`) ligt over de inhoud, zoals de tekst van de lege staat en de scoreknoppen. Er is geen extra ruimte onderaan de pagina. | < 1024 | Middel |
| L12 | Patiënt-app: Training "Deze week" | [TrainingWeekOverview.tsx](components/training/TrainingWeekOverview.tsx) | De carrousel begint met een half afgesneden kaart links. | 375–430 | Laag |

### 3.2 Navigatie

| # | Scherm | Bestand | Wat er misgaat | Breedte | Ernst |
|---|---|---|---|---|---|
| N1 | Portal-onderbalk | [PortalMobileNav.tsx:21-26](components/layout/PortalMobileNav.tsx#L21-L26) | Vaste plekken zijn Dashboard, Patiënten, Herstelplannen en **Medewerkers**. Een fysio heeft tussen behandelingen vaker Oefeningen/Schema's of Reserveringen nodig dan Medewerkers. Er is geen rolafhankelijke invulling. | < 1024 | Middel |
| N2 | Portal-onderbalk | idem, r. 104-109 | Labels zijn 10 px in `#5a5a6a` op `#18181a`, een **contrast van 2,6:1** (norm 4,5:1). Op klein scherm is "Herstelplannen" krap. | < 1024 | Middel |
| N3 | Portal mobiel | [PortalLayout.tsx](components/layout/PortalLayout.tsx) | Er is geen topbalk. Praktijknaam, account en uitloggen staan alleen in "Meer". Dat is acceptabel, maar terug-navigatie hangt per pagina af van een kleine tekstlink "← Terug naar …" (20 px hoog). | < 1024 | Laag |
| N4 | Tablet liggend | [PortalLayout.tsx](components/layout/PortalLayout.tsx), [PortalSidebar.tsx](components/layout/PortalSidebar.tsx) | Bij precies 1024 px verschijnt een vaste sidebar van 224 px. Op een iPad liggend kost dat 22% van de breedte, en de sidebar is niet in te klappen. | 1024 | Middel |
| N5 | Patiënt-app | [AuthGate.tsx:108-117](components/auth/AuthGate.tsx#L108-L117) | Zie **A1**: directe links en het opnieuw openen van de app komen op Instellingen uit. | alle | **Kritiek** |

**Wat goed is:** beide onderbalken zitten onderin, binnen bereik van één duim, met tikvlakken van ±75×64 px en safe-area-ruimte. Het "Meer"-paneel (raster van 3 kolommen) is overzichtelijk en te sluiten via X, de achtergrond en een routewissel. Het ⋮-actiemenu blijft netjes binnen het scherm ([ActionMenu.tsx:60](components/ui/ActionMenu.tsx#L60)).

### 3.3 Tabellen en lijsten

| # | Scherm | Bestand | Wat er misgaat | Breedte | Ernst |
|---|---|---|---|---|---|
| T1 | **Patiëntenlijst** | [patienten/page.tsx:473-520](app/portal/(protected)/patienten/page.tsx#L473-L520) | 7 kolommen in `ScrollHintX`. Op 375 is **341 van 942 px** zichtbaar: naam en ⋮. Behandelaar, herstelplan, laatste check-in en status staan rechts buiten beeld. De schaduwhint verschijnt pas *na* scrollen, dus niemand weet dat er meer is. Op 768/1024 breken cellen over 2–3 regels. | 375–1024 | **Hoog** |
| T2 | Activiteitenlog | [activiteitenlog/page.tsx:151-170](app/portal/(protected)/activiteitenlog/page.tsx#L151-L170) | Zichtbaar zijn Datum, Gebruiker en Details. De kolom **"Actie"** (wat er gebeurde) en "Patiënt" vallen buiten beeld. Daardoor is de log op telefoon inhoudelijk onbruikbaar. | 375–430 | Hoog |
| T3 | Herstelplannen, Oefeningen, Schema's, Medewerkers, Locaties | betreffende `page.tsx` | Hetzelfde patroon (341 van 1021 px bij Herstelplannen). Er zijn 11 tabellen en 24 plekken met `ScrollHintX`. | 375–768 | Middel |
| T4 | Paginering | [Pagination.tsx](components/ui/table/Pagination.tsx) | De knoppen "Vorige"/"Volgende" zijn `size="sm"` (±32 px hoog). | < 1024 | Laag |

**Voorstel: kaarten in plaats van tabellen onder `md`.** Een voorbeeld voor de patiëntenlijst, de belangrijkste:

```
┌─────────────────────────────────────────────┐
│ (TB) Thomas Bakker                       ⋮  │
│      ACL-reconstructie · fase 2             │
│      ● Zwelling  ● Lage dagscore            │
│      Laatste check-in: vandaag · Sanne      │
└─────────────────────────────────────────────┘
```

- De hele kaart is tikbaar en opent het detail.
- Het ⋮-menu krijgt een tikvlak van 44 px.
- Signalen (pijn, zwelling, weinig activiteit) staan bovenaan, want daar kijkt een fysio tussen twee behandelingen naar.
- Sorteren gaat via één "Sorteren op"-keuze (`useTableState.setSort` bestaat al).
- Filters zitten achter één knop "Filters (2)", die een bottom sheet opent.

Bouw dit als één generieke component (zie §4). Dan krijgen alle 11 lijsten het tegelijk.

### 3.4 Formulieren

| # | Scherm | Bestand | Wat er misgaat | Breedte | Ernst |
|---|---|---|---|---|---|
| F1 | **Alle formulieren** (portal en app) | `inputStyle` en klassen in 10+ pagina's | Alle invoervelden zijn **14 px** (`text-sm`). iOS Safari zoomt in bij focus op velden onder 16 px. | < 1024 | **Hoog** |
| F2 | Hele app | [app/layout.tsx:59](app/layout.tsx#L59) | `maximumScale: 1` onderdrukt dat inzoomen, maar **blokkeert ook knijp-zoomen** op Android. Dat is een toegankelijkheidsprobleem (WCAG 1.4.4), zeker voor patiënten met een leesbril. De oplossing is 16 px op mobiel plus deze regel weghalen. | alle | **Hoog** |
| F3 | Codebase | `components/ui/` | Er is **geen gedeelde Input/Select/Textarea/Field**. Labels, foutmeldingen, hoogte en focusstijl worden per pagina opnieuw geschreven, met kleine verschillen in hoogte (36–44 px) en padding. | alle | Middel |
| F4 | Reserveringen, LocationForm, MedewerkerDetail (werkuren), patiënt-dashboard | [reserveringen/page.tsx:134](app/portal/(protected)/reserveringen/page.tsx#L134), [LocationForm.tsx:173](components/portal/LocationForm.tsx#L173), [MedewerkerDetail.tsx:598](components/portal/MedewerkerDetail.tsx#L598), [app/(app)/page.tsx:273](app/(app)/page.tsx#L273) | 8× een native `type="time"`, terwijl de REVA-[TimePicker](components/ui/TimePicker.tsx) bestaat. Dat is inconsistent met de afspraak om nooit native widgets te gebruiken. | alle | Middel |
| F5 | Alle filters en formulieren | — | 71 native `<select>`-elementen. Op telefoon geeft dat wél een goede native kiezer, maar visueel wijkt het af van de REVA-stijl (zie §4.2 voor de afweging). | alle | Laag |
| F6 | DatePicker | [DatePicker.tsx:180](components/ui/DatePicker.tsx#L180), [dagboek/page.tsx:171](app/(app)/dagboek/page.tsx#L171) | Rekent alleen onder **640 px** met de onderbalk, terwijl die tot **1023 px** zichtbaar is. Tussen 640 en 1023 kan de kalender achter de onderbalk openen. (Gevonden in de code, niet visueel nagespeeld.) | 640–1023 | Middel |
| F7 | Modals met formulier | [Modal.tsx](components/ui/Modal.tsx) | Op telefoon een gecentreerd venster in plaats van een bottom sheet. De knoppen scrollen mee in plaats van vast onderin te staan, waardoor je bij lange formulieren (wizard, patiënt wijzigen) eerst naar beneden moet zoeken. Er is geen "Annuleren" naast "Opslaan". | < 640 | Middel |

**Wat goed is:**
- Toetsenbordtypes kloppen op de belangrijke velden: `type="tel"` op alle telefoonvelden, `type="email"` (16×), `inputMode="numeric"` op MFA- en datumvelden, en `autoComplete` op de login- en wachtwoordvelden.
- De datumvelden gebruiken de REVA-DatePicker.
- Labels zijn bijna overal gekoppeld.

### 3.5 Tikdoelen

| # | Element | Bestand | Maat | Ernst |
|---|---|---|---|---|
| K1 | ⋮-actiemenu in **elke lijst** | [ActionMenu.tsx](components/ui/ActionMenu.tsx) | 28×28 | **Hoog** |
| K2 | Kalendericoon in DatePicker | [DatePicker.tsx](components/ui/DatePicker.tsx) | 23×23 | Middel |
| K3 | Wachtwoord-oog (login, account) | [app/(auth)/login/page.tsx:258](app/(auth)/login/page.tsx#L258), [portal/login](app/portal/login/page.tsx) | 16×16 | Middel |
| K4 | "Inklappen" (onboardingkaart), sluitknop van het Meer-paneel | [OnboardingChecklist.tsx](components/dashboard/OnboardingChecklist.tsx), [PortalMobileNav.tsx:96](components/layout/PortalMobileNav.tsx#L96) | 16×16 / 28×28 | Middel |
| K5 | Periodefilter 7/14/30 dagen | [patienten/[id]/page.tsx:134](app/portal/(protected)/patienten/[id]/page.tsx#L134) | ±64×24 | Middel |
| K6 | Tekstlinks "Bekijk alle…", "← Terug naar…", "Bekijken" (log) | diverse | 20 px / 16 px hoog | Middel |
| K7 | Pijnscore 1–10 (check-in) | [CheckInModal.tsx](components/checkin/CheckInModal.tsx), [check-in/page.tsx](app/(app)/check-in/page.tsx) | 29×36 bij 375 | Middel |
| K8 | Alle knoppen op tablet liggend | [Button.tsx](components/ui/Button.tsx) (`sm` 32 px, `md` 36 px) | 100% < 44 bij 1024 | Middel |

### 3.6 Typografie en leesbaarheid

| # | Wat | Waar | Ernst |
|---|---|---|---|
| Y1 | `text-gray-400` (#9ca3af) wordt **521×** gebruikt voor labels, kolomkoppen en subtitels. Het contrast is **2,5:1** op wit en 2,4:1 op de achtergrond (norm 4,5:1). Buiten in daglicht is dat slecht leesbaar. | hele codebase | Middel |
| Y2 | Witte tekst op de standaard-oranje knop (#e8632a) heeft een contrast van **3,4:1**. Dat is voldoende voor grote of vette tekst, maar niet voor de 14 px knoptekst. Voor praktijkkleuren regelt `accessibleAccent()` dit al, maar de REVA-standaardkleur zelf niet. | [Button.tsx](components/ui/Button.tsx), [lib/brand](lib/brand.ts) | Middel |
| Y3 | Zeer kleine tekst: `text-[9px]` 8×, `text-[10px]` 73×, `text-[11px]` 93×. De grafiekassen op patiëntdetail zijn 8 px, de kalender in het Dagboek heeft 61 teksten onder 12 px, en Analyse heeft er 16 tot 25. | diverse | Laag |
| Y4 | De koppen (18–30 px), de hiërarchie en de regelafstand van de bodytekst (14 px, `leading-relaxed` in cards) zijn goed. Geen actie nodig. | — | — |

### 3.7 Modals en popups

| # | Wat | Resultaat |
|---|---|---|
| M1 | Portal-modals | Passen in de breedte (16 px marge). Sluiten via X, Escape en de achtergrond (bij formulieren bewust uitgeschakeld). **Probleem:** onderbalk erbovenop en knoppen niet vast onderin (L1, F7). |
| M2 | "Meer"-paneel | Goed: `maxHeight: 70vh`, scrollbaar en op drie manieren te sluiten. |
| M3 | ActionMenu | Goed: blijft binnen het scherm. "Verwijderen" staat rood, maar direct onder "Archiveren" zonder scheiding (laag risico, een bevestiging volgt). |
| M4 | Patiënt-app CheckInModal | Goed: bottom sheet over de volledige hoogte, met een duidelijke sluitknop. Het voorbeeld voor de portal-modals. |
| M5 | Consistentie | Er zijn 10 eigen overlay-implementaties in de patiënt-app naast de gedeelde Modal, met verschillende z-indexen: 40, 45, 50, 55 en 60 door elkaar ([NotificationPanel](components/layout/NotificationPanel.tsx) `z-[55]`, [QuickActionFAB](components/layout/QuickActionFAB.tsx) `z-[60]`, [Toast](components/ui/Toast.tsx) `z-50`). Er is geen vaste schaal. **Middel.** |

### 3.8 Performance op mobiel

Dit is beoordeeld op basis van de code. Een betrouwbare meting vraagt een Lighthouse-run op een Vercel-preview (stap 8 van het plan).

| # | Bevinding | Bestand | Ernst |
|---|---|---|---|
| P1 | De patiënt-app laadt bij elke start **12 datasets tegelijk**, met de volledige historie: check-ins, afspraken, medicatie, training, documenten, foto's, enzovoort. Dat wordt merkbaar trager op 4G naarmate een traject langer loopt. | [lib/store.tsx:248-261](lib/store.tsx#L248-L261) | Middel |
| P2 | In de oefeningenlijst rendert elke thumbnail van een video-oefening een `<video>`-element (20 per pagina, 514 oefeningen), zonder `preload="none"` en zonder poster. | [ExerciseThumb.tsx:42](components/portal/ExerciseThumb.tsx#L42) | Middel |
| P3 | 18 plekken gebruiken `<img>` zonder `next/image` en zonder `loading="lazy"`, waaronder avatars, logo's en dossierfoto's. | o.a. [Avatar.tsx](components/ui/Avatar.tsx), [app/(app)/dossier/page.tsx](app/(app)/dossier/page.tsx) | Laag |
| P4 | Patiëntdetail is één client-component van 1883 regels. Alle tabs en modals worden meteen ingeladen. | [patienten/[id]/page.tsx](app/portal/(protected)/patienten/[id]/page.tsx) | Laag |
| P5 | Wat goed is: `public/` is maar 80 KB, het lettertype loopt via `next/font` (geen layout-verschuiving), er zijn geen zware grafiekbibliotheken (eigen SVG-grafieken) en Sentry-tracing staat op 10%. | — | — |

### 3.9 Consistentie van breakpoints

| # | Bevinding | Ernst |
|---|---|---|
| C1 | **`md:` (768) wordt nergens gebruikt.** Er zijn twee standen: telefoon (tot 1023) en desktop (vanaf 1024). Tablets vallen tussen wal en schip (zie §2.3). | Middel |
| C2 | Het omslagpunt van de navigatie is `lg` (1024), maar in JavaScript staat 640 ([DatePicker.tsx:180](components/ui/DatePicker.tsx#L180), [dagboek/page.tsx:171](app/(app)/dagboek/page.tsx#L171)). Dat zijn twee verschillende waarheden. | Middel |
| C3 | Tikmaten hangen af van de breedte, niet van het invoertype. Een iPad (touch) krijgt muismaten. Tailwind v4 ondersteunt een eigen variant voor `@media (pointer: coarse)`. | Middel |
| C4 | Kleuren staan grotendeels als inline hex-codes. Contrastreparaties (Y1, Y2) moeten daardoor op honderden plekken in plaats van op één plek in `:root`. | Laag (onderhoud) |

### 3.10 Bijvangst: patiënt-app

| # | Scherm | Bestand | Wat er misgaat | Ernst |
|---|---|---|---|---|
| **A1** | Elke pagina van de patiënt-app bij directe opening | [components/auth/AuthGate.tsx:108-117](components/auth/AuthGate.tsx#L108-L117) | Het effect dat naar `/instellingen` doorstuurt, wacht niet tot de gegevens geladen zijn (`hydrated`). Bij het laden is `setupCompleted` nog `false`, dus de patiënt wordt meteen doorgestuurd. **Lokaal 3× gereproduceerd:** `/` en `/check-in` rechtstreeks openen leidt naar `/instellingen`; navigeren binnen de app werkt wel. Dit raakt links in herinneringsmails, push-meldingen en het opnieuw openen van de app op de telefoon. **Controleer dit eerst even op productie met een echt patiëntaccount.** De oplossing is waarschijnlijk één regel: `if (!hydrated) return;` bovenaan dat effect. | **Kritiek** |

---

## Stap 4: Advies voor de aanpak

### 4.1 Centraal, niet per scherm

Vrijwel elke bevinding komt terug op meerdere schermen: lagen, veldgrootte, tikdoelen, tabellen en breakpoints. Repareer je per scherm, dan doe je hetzelfde werk 20 keer en loopt het daarna weer uit elkaar. Dat zie je nu al aan `inputStyle`, die 10× gekopieerd is. Daarom eerst een kleine set gedeelde bouwstenen, en daarna de schermen migreren in volgorde van gebruik.

### 4.2 De bouwstenen

1. **Afspraken over breakpoints**, vastgelegd in `globals.css` en een korte notitie in de README:

   | Naam | Breedte | Bedoeld voor | Navigatie | Lijsten |
   |---|---|---|---|---|
   | basis | < 640 | telefoon | onderbalk | kaarten |
   | `sm` | ≥ 640 | grote telefoon / klein tablet | onderbalk | kaarten, 2 kolommen |
   | `md` | ≥ 768 | tablet staand | onderbalk | tabel (compacte kolommen) |
   | `lg` | ≥ 1024 | tablet liggend / laptop | **inklapbare** sidebar (iconen) | tabel |
   | `xl` | ≥ 1280 | desktop | volledige sidebar | tabel |

   Daarnaast een `touch:`-variant (`@custom-variant touch (@media (pointer: coarse))`) die tikmaten op 44 px zet, ongeacht de breedte. Eén constante `NAV_BREAKPOINT` vervangt de losse `640` in JavaScript.

2. **Een vaste lagenschaal** (z-index) als CSS-variabelen: inhoud 0, sticky 10, navigatie 30, overlay/achtergrond 40, modal/sheet 50, popover (DatePicker, ActionMenu) 60, toast 70. Alle 20+ losse `z-*`-waarden gaan over op deze schaal. Dit lost L1 in één keer op.

3. **`<Modal>` wordt responsief:**
   - onder 640 px een bottom sheet over de volledige breedte;
   - vaste knoppenbalk onderin met "Annuleren" en "Opslaan" (`ModalFooter`);
   - `max-h-[90dvh]` in plaats van `vh`;
   - verbergt de onderbalk zolang hij open is.

   De CheckInModal van de patiënt-app is het voorbeeld. Daarna worden de 10 eigen overlays van de patiënt-app hierop gezet.

4. **Formuliercomponenten:**
   - `<Field label hint error>` met `<Input>`, `<Select>` en `<Textarea>`;
   - 16 px op mobiel (`text-base sm:text-sm`), minimaal 44 px hoog;
   - vaste focus- en foutstijl, en `inputMode`/`autoComplete` als standaard per type;
   - daarna `maximumScale: 1` weghalen.

   Voor `<Select>`: houd de native kiezer op touchapparaten (die is op iOS en Android beter dan wat we zelf bouwen), maar laat de *knop* er in REVA-stijl uitzien. Dan voldoet het aan de afspraak over REVA-stijl en blijft de mobiele kiezer goed.

5. **`<ResponsiveList>`:** één component met `columns` (voor de tabel) en `renderCard` (voor mobiel). Daarin zitten sortering (`useTableState`), paginering, een lege staat en een actiemenu met een tikvlak van 44 px. Op mobiel is de hele kaart tikbaar. `ScrollHintX` blijft alleen voor echte rasters (weekplanning).

6. **`<FilterBar>`:** een zoekveld plus een knop "Filters (n)". Op mobiel opent die een bottom sheet, op desktop toont hij de filters inline zoals nu.

7. **`<IconButton>`:** een vast tikvlak van 44×44 met een kleiner zichtbaar icoon, voor ⋮, sluiten, het kalendericoon en het wachtwoord-oog.

8. **Kleurtokens voor tekst:** `--text-muted` (#6b7280, 4,8:1) vervangt `text-gray-400` voor betekenisvolle tekst; `text-gray-400` blijft alleen voor decoratie. De knoptekst op REVA-oranje wordt vet of de kleur iets donkerder.

---

## Stap 5: Stappenplan

Elke taak is klein genoeg voor één avond van 1–3 uur. Na elke stap volgt een controle op 375, 768 en 1024 en daarna een deploy. De volgorde volgt het dagelijks gebruik van een fysio: patiëntenlijst, dan patiëntdetail (check-in, logboek), dan dashboard, dan oefeningen en schema's.

### Week 1: snelle winst en het fundament (±6 u)
1. ✅ *(13ff41e)* **A1 repareren:** AuthGate wacht op `hydrated`. Testen met een directe link naar `/check-in`. *(1 u)*
2. ✅ Lagenschaal in `globals.css` en Modal, onderbalken, FAB, Toast, DatePicker en ActionMenu daarop zetten. **Lost L1 op.** *(2 u)*
3. ✅ Modal: bottom sheet onder 640 px, `ModalFooter` vast onderin, `dvh`, onderbalk verbergen wanneer open. *(2–3 u)*

### Week 2: formulieren (±7 u)
4. ✅ `Field`, `Input`, `Select` en `Textarea` bouwen (16 px op mobiel, 44 px hoog). *(2–3 u)*
5. ✅ Migreren: PatientWizard, PatientEditForm, notitie in het Logboek, StaffInviteForm. *(3 u)*
6. ✅ `maximumScale: 1` weghalen en op een echte iPhone controleren dat er niet meer ingezoomd wordt. *(0,5 u)*
7. ✅ `IconButton` (44 px) toepassen op ⋮, het kalendericoon, het wachtwoord-oog en de sluitknoppen. *(1 u)*

### Week 3: de patiëntenlijst (±7 u)
8. ✅ `ResponsiveList` bouwen: tabel vanaf `md`, kaarten daaronder, en sorteren via een keuzelijst. *(3 u)*
9. ✅ De patiëntenlijst erop zetten. De kaart toont herstelplan en fase, signaalbadges, laatste check-in en behandelaar. *(2 u)*
10. ✅ `FilterBar` met een bottom sheet; statistiekkaarten op mobiel als compacte horizontale strook. *(2 u)*

### Week 4: patiëntdetail (±7 u)
11. ✅ Kopregel van "Check-in status": het filter op een eigen regel onder de titel, als knoppen van 44 px. **Lost L2 op.** *(1 u)*
12. ✅ Mobiele volgorde: eerst de tabinhoud. Status, Afsluiting en Behandelgegevens naar een eigen tab "Dossier" of een inklapbaar blok, en niet meer onder elke tab. *(3 u)*
13. ✅ Labels bij de statusbadges ("Dossier: actief", "Account: actief"). "Archiveren"/"Verwijderen" naar het ⋮-menu in de kop. *(1 u)*
14. ✅ Tabs met een scrollhint (vervaagde rand plus automatisch scrollen naar de actieve tab). **Lost L7 op.** *(1–2 u)*

### Week 5: dashboard en navigatie (±6 u)
15. ✅ Portal-dashboard: compacte statistiekstrook, "Aandacht nodig" bovenaan als lijst met patiëntkaarten. *(2–3 u)*
16. ✅ Onderbalk per rol: voor behandelaars Dashboard, Patiënten, Oefeningen en Schema's; voor eigenaar en admin zoals nu. Labels 11 px met beter contrast. *(1–2 u)*
17. ✅ Proefperiodebanner op mobiel compact (1 regel) en wegklikbaar per sessie. *(1 u)*

### Week 6: tablet (±7 u)
18. `md`-indeling op de belangrijkste schermen: 2 kolommen op dashboard en patiëntdetail, tabel in plaats van kaarten. *(3 u)*
19. `lg`: sidebar in te klappen tot een strook met iconen (64 px), met de keuze onthouden. *(2–3 u)*
20. `touch:`-variant: knoppen en tabelrijen op 44 px voor touchapparaten. *(1–2 u)*

### Week 7: overige lijsten en formulieren (±7 u)
21. Activiteitenlog naar `ResponsiveList`, met actie, patiënt en tijd op de kaart. **Lost T2 op.** *(1,5 u)*
22. Herstelplannen, Oefeningen, Schema's, Medewerkers en Locaties naar `ResponsiveList`. De namen breken af in plaats van afgekapt te worden (L6). *(3–4 u)*
23. De 8 native tijdvelden naar de TimePicker; de DatePicker gebruikt `NAV_BREAKPOINT`. *(1–2 u)*

### Week 8: patiënt-app en afronding (±6 u)
24. Ruimte onderaan voor de FAB (L11); pijnscore in 2 rijen van 5 op schermen onder 400 px (K7). *(1,5 u)*
25. Tokens voor tekstkleur (Y1, Y2), en `text-[9px]`/`text-[10px]` naar minimaal 11 of 12 px. *(2 u)*
26. Performance: `preload="none"` en een poster voor videothumbnails, `loading="lazy"` op afbeeldingen. *(1 u)*
27. Lighthouse mobiel op een Vercel-preview en een test op een echte iPhone SE en iPad, inclusief toetsenbord, rotatie en de PWA vanaf het beginscherm. *(1,5 u)*

**Later (na de lancering):** de patiënt-app lui laten laden (P1, eerst alleen de laatste 30 dagen) en patiëntdetail opsplitsen in losse tabcomponenten (P4). Het Super Admin-portal heeft geen prioriteit.

**Totaal:** ±53 uur. Bij 5–10 uur per week is dat 6–8 weken. Na week 4 werkt het dagelijkse werk van een fysio (lijst, detail, logboek, formulieren) al goed op de telefoon.
