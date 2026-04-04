// ─── Types ────────────────────────────────────────────────────────────────────

export type AppointmentType =
  | "ziekenhuis"
  | "fysio"
  | "mri"
  | "operatie"
  | "nacontrole"
  | "second-opinion"
  | "telefonisch";

export type TimelineEventType =
  | "blessure"
  | "consult"
  | "scan"
  | "operatie"
  | "fysio"
  | "document"
  | "checkin"
  | "medicatie"
  | "training"
  | "mijlpaal";

export type DocumentType = "brief" | "verslag" | "scan" | "recept" | "overig";
export type DiagnoseStatus = "actief" | "afgerond" | "in-behandeling";

export interface Appointment {
  id: string;
  title: string;
  type: AppointmentType;
  date: string;
  time: string;
  location: string;
  behandelaar: string;
  voorbereiding?: string;
  meenemen?: string;
  notities?: string;
  uitkomst?: string;
  vervolgactie?: string;
  herinnering: boolean;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: TimelineEventType;
}

export interface CheckIn {
  id: string;
  date: string;
  dagscore: number;
  pijn: number;
  mobiliteit: number;
  energie: number;
  slaap: number;
  stemming: number;
  zwelling: boolean;
  notitie?: string;
  trainingGedaan: boolean;
  medicatieGebruikt: boolean;
}

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  date: string;
  afzender: string;
  ziekenhuis: string;
  samenvatting: string;
  notities?: string;
}

export interface Diagnose {
  id: string;
  naam: string;
  datumVastgesteld: string;
  vastgesteldDoor: string;
  toelichting: string;
  status: DiagnoseStatus;
}

export interface Zorgverlener {
  id: string;
  naam: string;
  rol: string;
  organisatie: string;
  telefoon: string;
  email: string;
  notities?: string;
}

// ─── Dossier: nieuwe structuur ────────────────────────────────────────────────

export interface DossierDocument {
  id: string;
  title: string;
  type: DocumentType;
  date: string;
  zorgverlener: string; // "Ziekenhuis" | "Fysiotherapeut" | "Huisarts" | "Anders"
  zorgverlenerAnders?: string;
  omschrijving: string;
  bestandsnaam?: string;
}

export interface FotoUpdate {
  id: string;
  date: string;
  notitie?: string;
}

export interface Contactpersoon {
  id: string;
  naam: string;
  functie: string;
  organisatie: string;
  telefoon: string;
  email: string;
  notitie?: string;
}

export interface MedicatieLog {
  id: string;
  date: string;
  time: string;
  naam: string;
  dosering: string;
  hoeveelheid: string;
  reden: string;
  effect?: string;
  notitie?: string;
}

export interface MedicatieSchema {
  id: string;
  naam: string;          // "Paracetamol" | ... | "Anders"
  naamAnders: string;    // filled when naam === "Anders"
  dosering: string;
  hoeveelheid: string;
  tijden: string[];      // ["08:00", "14:00", "20:00"]
  actief: boolean;
  notitie: string;
}

export interface Oefening {
  id: string;
  naam: string;
  categorie: string;
  fase: string;
  omschrijving: string;
  sets: number;
  herhalingen: number;
  duur?: string;
  frequentie: string;
  status: "actief" | "voltooid" | "gepland";
  opmerking?: string;
}

// ─── Doelstellingen ──────────────────────────────────────────────────────────

export interface Doel {
  id: string;
  type: "main" | "regular";
  icon: string;
  title: string;
  description: string;
  targetDate: string;   // "YYYY-MM-DD" or ""
  completed: boolean;
  completedAt?: string; // ISO date string
  createdAt: string;
  updatedAt: string;
}

export interface Mijlpaal {
  id: string;
  fase: string;
  title: string;
  completed: boolean;
  completedAt?: string;   // "YYYY-MM-DD" or undefined
  reflectionText?: string;
  painScore?: number;     // 1-10
  createdAt: string;
  updatedAt: string;
}

// ─── Profile type ─────────────────────────────────────────────────────────────

export interface Profile {
  naam: string;
  email: string;
  profielfoto: string;          // base64 data URL or empty string
  authProvider: "local" | "email" | "gmail";
  geboortedatum: string;
  blessureDatum: string;
  operatieDatum: string;      // may be empty string
  blessureType: string;
  blessureTypeAnders: string;
  situatieOmschrijving: string;
  zorgverzekeraar: string;
  zorgverzekeraaarAnders: string;
  polisnummer: string;
  aanvullendeVerzekeringen: string[];
  aantalFysio: string;
}

export const mockProfile: Profile = {
  naam: "Thomas de Vries",
  email: "",
  profielfoto: "",
  authProvider: "local",
  geboortedatum: "1994-07-12",
  blessureDatum: "2026-02-15",
  operatieDatum: "2026-02-22",
  blessureType: "acl",
  blessureTypeAnders: "",
  situatieOmschrijving: "Voorste kruisband gescheurd tijdens voetbalwedstrijd. Geopereerd in het UMC Utrecht. Momenteel bezig met revalidatie onder begeleiding van fysiotherapeut.",
  zorgverzekeraar: "vgz",
  zorgverzekeraaarAnders: "",
  polisnummer: "VGZ-2294-8831-AA",
  aanvullendeVerzekeringen: ["Aanvullend 2 — Fysiotherapie", "Tand — Basis"],
  aantalFysio: "18",
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

/** @deprecated — use store profile + computed values instead */
export const mockPatient = {
  naam: "Thomas de Vries",
  blessureDatum: "2026-02-15",
  operatieDatum: "2026-02-22",
  herstelFase: "Fase 2 — Vroeg herstel",
  dagsSindsBlessure: 42,
  dagsSindsOperatie: 35,
};

export const mockAppointments: Appointment[] = [
  {
    id: "1",
    title: "Nacontrole knie — Dr. Bakker",
    type: "nacontrole",
    date: "2026-04-03",
    time: "10:30",
    location: "Erasmus MC, Rotterdam",
    behandelaar: "Dr. M. Bakker",
    voorbereiding: "Nuchter komen, röntgenfoto wordt gemaakt",
    meenemen: "Verzekeringskaart, eerdere foto's",
    herinnering: true,
    notities: "Voortgang bespreken en nieuw schema opstellen",
  },
  {
    id: "2",
    title: "Fysiotherapie — sessie 8",
    type: "fysio",
    date: "2026-03-31",
    time: "09:00",
    location: "FysioPlus, Utrecht",
    behandelaar: "Nina Smits",
    herinnering: true,
    notities: "Focus op krachtopbouw quad",
  },
  {
    id: "3",
    title: "MRI knie controle",
    type: "mri",
    date: "2026-04-10",
    time: "14:15",
    location: "Diagnostisch Centrum, Amsterdam",
    behandelaar: "Radioloog",
    voorbereiding: "Geen metalen voorwerpen, comfortabele kleding",
    herinnering: true,
  },
  {
    id: "4",
    title: "Fysiotherapie — sessie 9",
    type: "fysio",
    date: "2026-04-07",
    time: "09:00",
    location: "FysioPlus, Utrecht",
    behandelaar: "Nina Smits",
    herinnering: true,
  },
  {
    id: "5",
    title: "Orthopeed second opinion",
    type: "second-opinion",
    date: "2026-04-17",
    time: "11:00",
    location: "Sportmedisch Centrum, Den Haag",
    behandelaar: "Dr. E. Jansen",
    herinnering: false,
    notities: "Tweede mening over terugkeer naar sport",
  },
];

export const mockTimeline: TimelineEvent[] = [
  {
    id: "1",
    date: "2026-02-15",
    title: "Knieblessure tijdens training",
    description: "Tijdens een voetbalwedstrijd verdraaide het rechterknie bij een sprint. Direct heftige pijn en zwelling.",
    type: "blessure",
  },
  {
    id: "2",
    date: "2026-02-16",
    title: "Eerste consult huisarts",
    description: "Doorverwezen naar orthopedisch chirurg. Vermoeden ACL-ruptuur.",
    type: "consult",
  },
  {
    id: "3",
    date: "2026-02-18",
    title: "MRI scan knie",
    description: "Volledige ruptuur voorste kruisband bevestigd. Operatie gepland.",
    type: "scan",
  },
  {
    id: "4",
    date: "2026-02-19",
    title: "MRI uitslag ontvangen",
    description: "Brief van Erasmus MC met officiële diagnose ACL-ruptuur rechts.",
    type: "document",
  },
  {
    id: "5",
    date: "2026-02-22",
    title: "ACL reconstructie operatie",
    description: "Succesvolle reconstructie onder algehele narcose. Patellapees gebruikt als transplantaat.",
    type: "operatie",
  },
  {
    id: "6",
    date: "2026-02-25",
    title: "Eerste fysiotherapie intake",
    description: "Kennismaking met fysiotherapeut Nina Smits. Revalidatieschema opgesteld.",
    type: "fysio",
  },
  {
    id: "7",
    date: "2026-03-01",
    title: "Eerste stappen zonder krukken",
    description: "Na 7 dagen postoperatief eerste vrije stappen gezet. Goed herstel.",
    type: "mijlpaal",
  },
  {
    id: "8",
    date: "2026-03-05",
    title: "Ontslagbrief ziekenhuis",
    description: "Operatieverslag en nabehandeling ontvangen van Erasmus MC.",
    type: "document",
  },
  {
    id: "9",
    date: "2026-03-10",
    title: "Fysiotherapie — sessie 3",
    description: "Goed herstel. Flexie 95 graden. Begonnen met lichte krachttraining.",
    type: "fysio",
  },
  {
    id: "10",
    date: "2026-03-15",
    title: "Traplopen lukt zelfstandig",
    description: "Voor het eerst traplopen zonder steun. Groot moment in het herstel.",
    type: "mijlpaal",
  },
  {
    id: "11",
    date: "2026-03-20",
    title: "Check-in — dagscore 4/5",
    description: "Goede dag. Weinig pijn, goed geslapen. Oefeningen gedaan.",
    type: "checkin",
  },
  {
    id: "12",
    date: "2026-03-25",
    title: "Eerste fietstocht buiten",
    description: "15 minuten rustig fietsen buiten. Knie reageert goed.",
    type: "training",
  },
  {
    id: "13",
    date: "2026-03-28",
    title: "Fysiotherapie — sessie 7",
    description: "Krachtscore verbeterd. Quad 70% van links. Schema uitgebreid.",
    type: "fysio",
  },
];

export const mockCheckIns: CheckIn[] = [
  { id: "1", date: "2026-03-29", dagscore: 3, pijn: 4, mobiliteit: 3, energie: 3, slaap: 4, stemming: 3, zwelling: false, notitie: "Lichte pijn na oefeningen. Goed geslapen.", trainingGedaan: true, medicatieGebruikt: true },
  { id: "2", date: "2026-03-28", dagscore: 4, pijn: 3, mobiliteit: 4, energie: 4, slaap: 4, stemming: 4, zwelling: false, notitie: "Goede dag. Fysio was zwaar maar motiverend.", trainingGedaan: true, medicatieGebruikt: false },
  { id: "3", date: "2026-03-27", dagscore: 3, pijn: 5, mobiliteit: 3, energie: 2, slaap: 3, stemming: 3, zwelling: true, notitie: "Knie iets meer gezwollen dan gisteren.", trainingGedaan: false, medicatieGebruikt: true },
  { id: "4", date: "2026-03-26", dagscore: 4, pijn: 3, mobiliteit: 4, energie: 4, slaap: 5, stemming: 4, zwelling: false, trainingGedaan: true, medicatieGebruikt: false },
  { id: "5", date: "2026-03-25", dagscore: 5, pijn: 2, mobiliteit: 4, energie: 5, slaap: 5, stemming: 5, zwelling: false, notitie: "Eerste fietstocht buiten. Geweldig gevoel!", trainingGedaan: true, medicatieGebruikt: false },
  { id: "6", date: "2026-03-24", dagscore: 3, pijn: 5, mobiliteit: 3, energie: 3, slaap: 3, stemming: 3, zwelling: false, trainingGedaan: false, medicatieGebruikt: true },
  { id: "7", date: "2026-03-23", dagscore: 4, pijn: 3, mobiliteit: 4, energie: 4, slaap: 4, stemming: 4, zwelling: false, trainingGedaan: true, medicatieGebruikt: false },
];

export const mockDocuments: Document[] = [
  {
    id: "1",
    title: "Operatieverslag ACL reconstructie",
    type: "verslag",
    date: "2026-02-22",
    afzender: "Dr. M. Bakker",
    ziekenhuis: "Erasmus MC, Rotterdam",
    samenvatting: "Succesvolle reconstructie van de voorste kruisband rechts. Patellapees gebruikt als transplantaat. Geen complicaties.",
    notities: "Opgeslagen in MyHealth app",
  },
  {
    id: "2",
    title: "MRI uitslag rechterknie",
    type: "scan",
    date: "2026-02-19",
    afzender: "Afd. Radiologie",
    ziekenhuis: "Erasmus MC, Rotterdam",
    samenvatting: "Volledige ruptuur ACL rechts. Lichte contusie laterale femurcondyl. Menisci intact.",
  },
  {
    id: "3",
    title: "Ontslagbrief fysiotherapie intake",
    type: "brief",
    date: "2026-02-25",
    afzender: "Nina Smits, Fysiotherapeut",
    ziekenhuis: "FysioPlus, Utrecht",
    samenvatting: "Startfase revalidatie. Schema fase 1 opgesteld. Doel: volledig lichaamsgewicht dragen week 2.",
  },
  {
    id: "4",
    title: "Recept Naproxen 500mg",
    type: "recept",
    date: "2026-02-23",
    afzender: "Dr. M. Bakker",
    ziekenhuis: "Erasmus MC, Rotterdam",
    samenvatting: "Naproxen 500mg, 2x daags gedurende 7 dagen voor ontstekingsremming.",
  },
];

export const mockDiagnoses: Diagnose[] = [
  {
    id: "1",
    naam: "ACL Ruptuur rechts (graad III)",
    datumVastgesteld: "2026-02-19",
    vastgesteldDoor: "Dr. M. Bakker, Orthopeed",
    toelichting: "Volledige ruptuur van de voorste kruisband rechterknie. Vastgesteld via MRI. Operatieve behandeling noodzakelijk.",
    status: "in-behandeling",
  },
  {
    id: "2",
    naam: "Contusie laterale femurcondyl",
    datumVastgesteld: "2026-02-19",
    vastgesteldDoor: "Dr. M. Bakker, Orthopeed",
    toelichting: "Lichte botkneuzing zijkant dijbeen. Verwacht spontaan herstel binnen 6–8 weken.",
    status: "afgerond",
  },
];

export const mockZorgverleners: Zorgverlener[] = [
  {
    id: "1",
    naam: "Dr. M. Bakker",
    rol: "Orthopedisch chirurg",
    organisatie: "Erasmus MC, Rotterdam",
    telefoon: "010 - 703 7140",
    email: "m.bakker@erasmusmc.nl",
    notities: "Behandelend chirurg ACL reconstructie",
  },
  {
    id: "2",
    naam: "Nina Smits",
    rol: "Fysiotherapeut",
    organisatie: "FysioPlus, Utrecht",
    telefoon: "030 - 271 8800",
    email: "n.smits@fysioplus.nl",
    notities: "Sessies elke maandag en donderdag",
  },
  {
    id: "3",
    naam: "Dr. L. van den Berg",
    rol: "Huisarts",
    organisatie: "Huisartsenpraktijk Centrum, Utrecht",
    telefoon: "030 - 234 5678",
    email: "l.vandenberg@hapcentrum.nl",
  },
];

export const mockDossierDocumenten: DossierDocument[] = [
  {
    id: "dd1",
    title: "Operatieverslag ACL reconstructie",
    type: "verslag",
    date: "2026-02-22",
    zorgverlener: "Ziekenhuis",
    omschrijving: "Succesvolle reconstructie van de voorste kruisband rechts. Patellapees gebruikt als transplantaat. Geen complicaties.",
    bestandsnaam: "operatieverslag_acl_22feb.pdf",
  },
  {
    id: "dd2",
    title: "MRI uitslag rechterknie",
    type: "scan",
    date: "2026-02-19",
    zorgverlener: "Ziekenhuis",
    omschrijving: "Volledige ruptuur ACL rechts. Lichte contusie laterale femurcondyl. Menisci intact.",
    bestandsnaam: "mri_rechterknie_19feb.jpg",
  },
  {
    id: "dd3",
    title: "Ontslagbrief fysiotherapie intake",
    type: "brief",
    date: "2026-02-25",
    zorgverlener: "Fysiotherapeut",
    omschrijving: "Startfase revalidatie. Schema fase 1 opgesteld. Doel: volledig lichaamsgewicht dragen week 2.",
    bestandsnaam: "ontslagbrief_fysio_25feb.pdf",
  },
  {
    id: "dd4",
    title: "Recept Naproxen 500mg",
    type: "recept",
    date: "2026-02-23",
    zorgverlener: "Ziekenhuis",
    omschrijving: "Naproxen 500mg, 2x daags gedurende 7 dagen voor ontstekingsremming.",
  },
];

export const mockFotoUpdates: FotoUpdate[] = [
  { id: "fu1", date: "2026-03-29", notitie: "Zwelling bijna weg. Lopen gaat steeds beter." },
  { id: "fu2", date: "2026-03-27", notitie: "Litteken heelt mooi op. Bewegingshoek verbeterd." },
  { id: "fu3", date: "2026-03-22", notitie: "Zwelling duidelijk afgenomen tegenover vorige week." },
  { id: "fu4", date: "2026-03-21", notitie: "Zijkant knie ziet er goed uit." },
  { id: "fu5", date: "2026-03-15", notitie: "Eerste week na ontslag ziekenhuis. Nog wat zwelling zichtbaar." },
  { id: "fu6", date: "2026-03-14", notitie: "Voorzijde knie na 3 weken herstel." },
  { id: "fu7", date: "2026-03-08", notitie: "Net terug uit het ziekenhuis. Begin herstel." },
  { id: "fu8", date: "2026-03-03", notitie: "Dag voor de operatie — referentiefoto." },
];

export const mockContactpersonen: Contactpersoon[] = [
  {
    id: "cp1",
    naam: "Dr. M. Bakker",
    functie: "Orthopedisch chirurg",
    organisatie: "Erasmus MC, Rotterdam",
    telefoon: "010 - 703 7140",
    email: "m.bakker@erasmusmc.nl",
    notitie: "Behandelend chirurg ACL reconstructie",
  },
  {
    id: "cp2",
    naam: "Nina Smits",
    functie: "Fysiotherapeut",
    organisatie: "FysioPlus, Utrecht",
    telefoon: "030 - 271 8800",
    email: "n.smits@fysioplus.nl",
    notitie: "Sessies elke maandag en donderdag",
  },
  {
    id: "cp3",
    naam: "Dr. L. van den Berg",
    functie: "Huisarts",
    organisatie: "Huisartsenpraktijk Centrum, Utrecht",
    telefoon: "030 - 234 5678",
    email: "l.vandenberg@hapcentrum.nl",
  },
];

export const mockMedicatie: MedicatieLog[] = [
  { id: "1", date: "2026-03-29", time: "08:00", naam: "Paracetamol", dosering: "1000mg", hoeveelheid: "2 tabletten", reden: "Ochtendpijn knie", effect: "Goed effect na 45 min" },
  { id: "2", date: "2026-03-28", time: "07:45", naam: "Paracetamol", dosering: "1000mg", hoeveelheid: "2 tabletten", reden: "Preventief voor fysio", effect: "Geen pijn tijdens sessie" },
  { id: "3", date: "2026-03-27", time: "08:00", naam: "Paracetamol", dosering: "1000mg", hoeveelheid: "2 tabletten", reden: "Pijn en zwelling", notitie: "Ook ijspak gebruikt" },
  { id: "4", date: "2026-03-27", time: "20:00", naam: "Ibuprofen", dosering: "400mg", hoeveelheid: "1 tablet", reden: "Aanhoudende zwelling avond" },
  { id: "5", date: "2026-03-25", time: "09:00", naam: "Paracetamol", dosering: "500mg", hoeveelheid: "1 tablet", reden: "Lichte ochtendpijn" },
  { id: "6", date: "2026-03-24", time: "08:15", naam: "Paracetamol", dosering: "1000mg", hoeveelheid: "2 tabletten", reden: "Pijn na training" },
  { id: "7", date: "2026-03-22", time: "07:30", naam: "Paracetamol", dosering: "1000mg", hoeveelheid: "2 tabletten", reden: "Ochtendstijfheid" },
];

export const mockMedicatieSchemas: MedicatieSchema[] = [
  {
    id: "schema-1",
    naam: "Paracetamol",
    naamAnders: "",
    dosering: "1000mg",
    hoeveelheid: "2 tabletten",
    tijden: ["08:00", "14:00", "20:00"],
    actief: true,
    notitie: "Innemen bij pijn of preventief voor fysio",
  },
  {
    id: "schema-2",
    naam: "Ibuprofen",
    naamAnders: "",
    dosering: "400mg",
    hoeveelheid: "1 tablet",
    tijden: ["20:00"],
    actief: false,
    notitie: "Alleen bij aanhoudende zwelling",
  },
];

export const mockOefeningen: Oefening[] = [
  {
    id: "1",
    naam: "Quadriceps versterkend",
    categorie: "Kracht",
    fase: "Fase 2",
    omschrijving: "Gestrekte been opheffen vanuit liggende positie. Langzaam omhoog en omlaag.",
    sets: 3,
    herhalingen: 15,
    frequentie: "Dagelijks",
    status: "actief",
    opmerking: "Controleer of er geen compensatie vanuit de heup is.",
  },
  {
    id: "2",
    naam: "Heupabductie zijwaarts",
    categorie: "Kracht",
    fase: "Fase 2",
    omschrijving: "Vanuit staande positie been zijwaarts heffen. Steun aan wand indien nodig.",
    sets: 3,
    herhalingen: 12,
    frequentie: "3x per week",
    status: "actief",
  },
  {
    id: "3",
    naam: "Fietsen stationaire fiets",
    categorie: "Conditie",
    fase: "Fase 2",
    omschrijving: "Laag weerstandsniveau. Rustig pedaleren, geen druk op knie.",
    sets: 1,
    herhalingen: 1,
    duur: "20 minuten",
    frequentie: "Dagelijks",
    status: "actief",
    opmerking: "Zadel hoog genoeg zodat knie licht gebogen blijft.",
  },
  {
    id: "4",
    naam: "Knie flexie mobilisatie",
    categorie: "Mobiliteit",
    fase: "Fase 2",
    omschrijving: "Actief de knie buigen en strekken in rugligging. Doel: 120 graden flexie.",
    sets: 3,
    herhalingen: 20,
    frequentie: "2x daags",
    status: "actief",
  },
  {
    id: "5",
    naam: "Mini squat",
    categorie: "Kracht",
    fase: "Fase 3",
    omschrijving: "Lichte kniebuiging tot 30 graden. Beide benen gelijkmatig belasten.",
    sets: 3,
    herhalingen: 10,
    frequentie: "3x per week",
    status: "gepland",
    opmerking: "Starten wanneer flexie >110 graden en geen zwelling meer.",
  },
  {
    id: "6",
    naam: "Enkelpomp",
    categorie: "Circulatie",
    fase: "Fase 1",
    omschrijving: "Enkels op en neer bewegen om bloedcirculatie te stimuleren.",
    sets: 3,
    herhalingen: 30,
    frequentie: "Elk uur",
    status: "voltooid",
  },
];

// ─── Training v2 — Oefeningen database & Schema's ────────────────────────────

export type TrainingOefeningType = "Kracht" | "Conditie" | "Mobiliteit" | "Stabiliteit" | "Rekken" | "Anders";
export type TrainingLocatie = "Thuis" | "Gym" | "Fysio" | "Buiten" | "Anders";
export type TrainingSchemaStatus = "actief" | "gepland" | "afgerond";

export interface TrainingOefening {
  id: string;
  title: string;
  type: TrainingOefeningType;
  description: string;
  repetitions: string;   // bijv. "3×15 herh.", "2×30 sec"
  loadOrTime: string;    // bijv. "Lichaamsgewicht", "10 kg", "20 minuten"
  location: TrainingLocatie;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingSchema {
  id: string;
  title: string;
  status: TrainingSchemaStatus;
  duration: string;       // bijv. "30 minuten", "45 minuten"
  exerciseIds: string[];  // verwijzingen naar TrainingOefening.id
  createdAt: string;
  updatedAt: string;
}

export const mockTrainingOefeningen: TrainingOefening[] = [
  {
    id: "toe-1",
    title: "Quadriceps versterkend",
    type: "Kracht",
    description: "Gestrekte been opheffen vanuit liggende positie. Langzaam omhoog en omlaag bewegen.",
    repetitions: "3×15 herh.",
    loadOrTime: "Lichaamsgewicht",
    location: "Thuis",
    note: "Geen compensatie vanuit de heup.",
    createdAt: "2026-02-24T08:00:00Z",
    updatedAt: "2026-02-24T08:00:00Z",
  },
  {
    id: "toe-2",
    title: "Heupabductie zijwaarts",
    type: "Kracht",
    description: "Vanuit staande positie been zijwaarts heffen. Steun aan wand indien nodig.",
    repetitions: "3×12 herh.",
    loadOrTime: "Lichaamsgewicht",
    location: "Thuis",
    note: "",
    createdAt: "2026-02-24T08:05:00Z",
    updatedAt: "2026-02-24T08:05:00Z",
  },
  {
    id: "toe-3",
    title: "Fietsen stationaire fiets",
    type: "Conditie",
    description: "Laag weerstandsniveau. Rustig pedaleren, geen druk op knie.",
    repetitions: "",
    loadOrTime: "20 minuten",
    location: "Thuis",
    note: "Zadel hoog genoeg zodat knie licht gebogen blijft.",
    createdAt: "2026-02-24T08:10:00Z",
    updatedAt: "2026-02-24T08:10:00Z",
  },
  {
    id: "toe-4",
    title: "Knie flexie mobilisatie",
    type: "Mobiliteit",
    description: "Actief de knie buigen en strekken in rugligging. Doel: 120 graden flexie.",
    repetitions: "3×20 herh.",
    loadOrTime: "Geen gewicht",
    location: "Thuis",
    note: "",
    createdAt: "2026-02-24T08:15:00Z",
    updatedAt: "2026-02-24T08:15:00Z",
  },
  {
    id: "toe-5",
    title: "Mini squat",
    type: "Kracht",
    description: "Lichte kniebuiging tot 30 graden. Beide benen gelijkmatig belasten.",
    repetitions: "3×10 herh.",
    loadOrTime: "Lichaamsgewicht",
    location: "Thuis",
    note: "Starten wanneer flexie >110 graden en geen zwelling meer.",
    createdAt: "2026-02-24T08:20:00Z",
    updatedAt: "2026-02-24T08:20:00Z",
  },
  {
    id: "toe-6",
    title: "Enkelpomp",
    type: "Conditie",
    description: "Enkels op en neer bewegen om bloedcirculatie te stimuleren.",
    repetitions: "3×30 herh.",
    loadOrTime: "Geen gewicht",
    location: "Thuis",
    note: "",
    createdAt: "2026-02-22T10:00:00Z",
    updatedAt: "2026-02-22T10:00:00Z",
  },
];

// A logged training session — a user completed a schema on a given date
export interface TrainingLog {
  id: string;
  schemaId: string;
  date: string;           // "YYYY-MM-DD"
  completedExerciseIds: string[];
  note: string;
  durationMinutes?: number;
  createdAt: string;
}

export const mockTrainingSchemas: TrainingSchema[] = [
  {
    id: "ts-1",
    title: "Dagelijks schema — Fase 2",
    status: "actief",
    duration: "45 minuten",
    exerciseIds: ["toe-1", "toe-3", "toe-4"],
    createdAt: "2026-02-24T09:00:00Z",
    updatedAt: "2026-02-24T09:00:00Z",
  },
  {
    id: "ts-2",
    title: "Krachttraining — Fase 2",
    status: "actief",
    duration: "30 minuten",
    exerciseIds: ["toe-1", "toe-2"],
    createdAt: "2026-02-25T09:00:00Z",
    updatedAt: "2026-02-25T09:00:00Z",
  },
  {
    id: "ts-3",
    title: "Progressief schema — Fase 3",
    status: "gepland",
    duration: "45 minuten",
    exerciseIds: ["toe-5"],
    createdAt: "2026-02-26T09:00:00Z",
    updatedAt: "2026-02-26T09:00:00Z",
  },
  {
    id: "ts-4",
    title: "Vroeg postoperatief — Fase 1",
    status: "afgerond",
    duration: "15 minuten",
    exerciseIds: ["toe-6"],
    createdAt: "2026-02-22T10:00:00Z",
    updatedAt: "2026-02-22T10:00:00Z",
  },
];

export const mockTrainingLogs: TrainingLog[] = [
  { id: "tl-1", schemaId: "ts-1", date: "2026-03-24", completedExerciseIds: ["toe-1", "toe-3", "toe-4"], note: "", createdAt: "2026-03-24T18:00:00Z" },
  { id: "tl-2", schemaId: "ts-2", date: "2026-03-24", completedExerciseIds: ["toe-1", "toe-2"], note: "", createdAt: "2026-03-24T19:00:00Z" },
  { id: "tl-3", schemaId: "ts-1", date: "2026-03-25", completedExerciseIds: ["toe-1", "toe-3", "toe-4"], note: "Goede sessie, minder pijn.", createdAt: "2026-03-25T18:00:00Z" },
  { id: "tl-4", schemaId: "ts-1", date: "2026-03-27", completedExerciseIds: ["toe-1", "toe-3"], note: "", createdAt: "2026-03-27T17:30:00Z" },
  { id: "tl-5", schemaId: "ts-2", date: "2026-03-28", completedExerciseIds: ["toe-1", "toe-2"], note: "", createdAt: "2026-03-28T10:00:00Z" },
  { id: "tl-6", schemaId: "ts-1", date: "2026-03-29", completedExerciseIds: ["toe-1", "toe-3", "toe-4"], note: "", createdAt: "2026-03-29T18:30:00Z" },
];

// ─── Mock Doelen ─────────────────────────────────────────────────────────────

export const mockDoelen: Doel[] = [
  {
    id: "doel-1",
    type: "main",
    icon: "🏃",
    title: "Terugkeren naar voetbal",
    description: "Volledig herstellen en terugkeren op het veld bij mijn team. Minimaal één wedstrijd kunnen spelen zonder beperkingen.",
    targetDate: "2026-09-01",
    completed: false,
    createdAt: "2026-02-22T10:00:00Z",
    updatedAt: "2026-02-22T10:00:00Z",
  },
  {
    id: "doel-2",
    type: "regular",
    icon: "🚴",
    title: "30 minuten fietsen",
    description: "Een half uur aaneengesloten buiten fietsen zonder pijn.",
    targetDate: "2026-05-01",
    completed: false,
    createdAt: "2026-02-25T09:00:00Z",
    updatedAt: "2026-02-25T09:00:00Z",
  },
  {
    id: "doel-3",
    type: "regular",
    icon: "💪",
    title: "Kracht terug op 80%",
    description: "De kracht in het geopereerde been terugbrengen naar 80% van het andere been.",
    targetDate: "2026-07-15",
    completed: false,
    createdAt: "2026-02-25T09:30:00Z",
    updatedAt: "2026-02-25T09:30:00Z",
  },
];

export const mockMijlpalen: Mijlpaal[] = [
  // Fase 1 – Basis
  { id: "mp-1",  fase: "Fase 1 – Basis",    title: "Eerste stappen met krukken",       completed: true,  completedAt: "2026-02-24", createdAt: "2026-02-22T10:00:00Z", updatedAt: "2026-02-24T12:00:00Z" },
  { id: "mp-2",  fase: "Fase 1 – Basis",    title: "Eerste stappen zonder krukken",    completed: true,  completedAt: "2026-03-05", createdAt: "2026-02-22T10:00:00Z", updatedAt: "2026-03-05T14:00:00Z" },
  { id: "mp-3",  fase: "Fase 1 – Basis",    title: "10 minuten lopen",                 completed: true,  completedAt: "2026-03-12", reflectionText: "Voelde goed, lichte spanning maar geen pijn.", painScore: 2, createdAt: "2026-02-22T10:00:00Z", updatedAt: "2026-03-12T10:00:00Z" },
  { id: "mp-4",  fase: "Fase 1 – Basis",    title: "30 minuten lopen",                 completed: false, createdAt: "2026-02-22T10:00:00Z", updatedAt: "2026-02-22T10:00:00Z" },
  { id: "mp-5",  fase: "Fase 1 – Basis",    title: "Traplopen met hulp",               completed: true,  completedAt: "2026-03-08", createdAt: "2026-02-22T10:00:00Z", updatedAt: "2026-03-08T09:00:00Z" },
  { id: "mp-6",  fase: "Fase 1 – Basis",    title: "Traplopen zelfstandig",            completed: false, createdAt: "2026-02-22T10:00:00Z", updatedAt: "2026-02-22T10:00:00Z" },
  // Fase 2 – Beweging
  { id: "mp-7",  fase: "Fase 2 – Beweging", title: "Eerste fietstocht binnen",         completed: true,  completedAt: "2026-03-18", reflectionText: "Erg blij dat dit lukte!", createdAt: "2026-02-22T10:00:00Z", updatedAt: "2026-03-18T11:00:00Z" },
  { id: "mp-8",  fase: "Fase 2 – Beweging", title: "Eerste fietstocht buiten",         completed: false, createdAt: "2026-02-22T10:00:00Z", updatedAt: "2026-02-22T10:00:00Z" },
  { id: "mp-9",  fase: "Fase 2 – Beweging", title: "30 minuten fietsen",               completed: false, createdAt: "2026-02-22T10:00:00Z", updatedAt: "2026-02-22T10:00:00Z" },
  { id: "mp-10", fase: "Fase 2 – Beweging", title: "Balans op één been",               completed: false, createdAt: "2026-02-22T10:00:00Z", updatedAt: "2026-02-22T10:00:00Z" },
  { id: "mp-11", fase: "Fase 2 – Beweging", title: "Squat zonder pijn",                completed: false, createdAt: "2026-02-22T10:00:00Z", updatedAt: "2026-02-22T10:00:00Z" },
  // Fase 3 – Kracht
  { id: "mp-12", fase: "Fase 3 – Kracht",   title: "60% kracht t.o.v. andere kant",   completed: false, createdAt: "2026-02-22T10:00:00Z", updatedAt: "2026-02-22T10:00:00Z" },
  { id: "mp-13", fase: "Fase 3 – Kracht",   title: "80% kracht t.o.v. andere kant",   completed: false, createdAt: "2026-02-22T10:00:00Z", updatedAt: "2026-02-22T10:00:00Z" },
  { id: "mp-14", fase: "Fase 3 – Kracht",   title: "Volledige mobiliteit",             completed: false, createdAt: "2026-02-22T10:00:00Z", updatedAt: "2026-02-22T10:00:00Z" },
  { id: "mp-15", fase: "Fase 3 – Kracht",   title: "Geen pijn bij dagelijkse beweging",completed: false, createdAt: "2026-02-22T10:00:00Z", updatedAt: "2026-02-22T10:00:00Z" },
  // Fase 4 – Terugkeer
  { id: "mp-16", fase: "Fase 4 – Terugkeer",title: "Eerste lichte sportactiviteit",    completed: false, createdAt: "2026-02-22T10:00:00Z", updatedAt: "2026-02-22T10:00:00Z" },
  { id: "mp-17", fase: "Fase 4 – Terugkeer",title: "Eerste volledige training",        completed: false, createdAt: "2026-02-22T10:00:00Z", updatedAt: "2026-02-22T10:00:00Z" },
  { id: "mp-18", fase: "Fase 4 – Terugkeer",title: "Eerste wedstrijd of intensieve sessie", completed: false, createdAt: "2026-02-22T10:00:00Z", updatedAt: "2026-02-22T10:00:00Z" },
  { id: "mp-19", fase: "Fase 4 – Terugkeer",title: "Terug op oud niveau",              completed: false, createdAt: "2026-02-22T10:00:00Z", updatedAt: "2026-02-22T10:00:00Z" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

export function appointmentTypeLabel(type: AppointmentType): string {
  const labels: Record<AppointmentType, string> = {
    ziekenhuis: "Ziekenhuis consult",
    fysio: "Fysiotherapie",
    mri: "MRI / Scan",
    operatie: "Operatie",
    nacontrole: "Nacontrole",
    "second-opinion": "Second opinion",
    telefonisch: "Telefonisch consult",
  };
  return labels[type];
}

export function timelineTypeLabel(type: TimelineEventType): string {
  const labels: Record<TimelineEventType, string> = {
    blessure: "Blessure",
    consult: "Consult",
    scan: "Scan",
    operatie: "Operatie",
    fysio: "Fysiotherapie",
    document: "Document",
    checkin: "Check-in",
    medicatie: "Medicatie",
    training: "Training",
    mijlpaal: "Mijlpaal",
  };
  return labels[type];
}

export function documentTypeLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    brief: "Brief",
    verslag: "Verslag",
    scan: "Scan",
    recept: "Recept",
    overig: "Overig",
  };
  return labels[type];
}

// ─── Dagboek Workout ─────────────────────────────────────────────────────────

export interface DagboekWorkout {
  id: string;
  date: string;        // "YYYY-MM-DD"
  title: string;
  schemaId?: string;   // linked TrainingSchema id
  completed: boolean;
  completedAt?: string;
  reflection?: string;
  createdAt: string;
}

export const mockDagboekWorkouts: DagboekWorkout[] = [
  {
    id: "dw-1",
    date: "2026-03-25",
    title: "Looptraining 20 min",
    completed: true,
    completedAt: "2026-03-25T10:30:00Z",
    reflection: "Ging goed, lichte pijn na afloop maar herstelde snel.",
    createdAt: "2026-03-24T20:00:00Z",
  },
  {
    id: "dw-2",
    date: "2026-03-28",
    title: "Fietsen stationaire fiets 30 min",
    completed: true,
    completedAt: "2026-03-28T09:45:00Z",
    reflection: "",
    createdAt: "2026-03-27T20:00:00Z",
  },
  {
    id: "dw-3",
    date: "2026-04-02",
    title: "Stabiliteitsoefeningen fase 2",
    completed: false,
    createdAt: "2026-03-31T20:00:00Z",
  },
  {
    id: "dw-4",
    date: "2026-04-07",
    title: "Krachttraining bovenbeen",
    completed: false,
    createdAt: "2026-04-01T20:00:00Z",
  },
];
