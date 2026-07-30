import type {
  Profile, CheckIn, Appointment, MedicatieLog, MedicatieSchema, Doel, Mijlpaal,
  TrainingOefening, TrainingSchema, TrainingLog, DagboekWorkout,
  DossierDocument, FotoUpdate, Contactpersoon, NotificationSettings,
} from "@/lib/data";

/**
 * Recht op dataportabiliteit (Art. 20 AVG) — een patiënt kan zijn eigen
 * gegevens downloaden in een gestructureerd, machineleesbaar formaat (JSON).
 * Bewust alleen de gegevens die de patiënt zelf heeft ingevoerd of die over
 * hem/haar eigen activiteit gaan (check-ins, afspraken, training, medicatie,
 * dossier, doelen) — geen fysio-onderling logboek (patient_staff_notes),
 * dat is staff-geschreven en geen "door de patiënt verstrekte" data in de
 * zin van portabiliteit.
 */
export interface DataExportInput {
  profile: Profile;
  notificationSettings: NotificationSettings;
  checkIns: CheckIn[];
  appointments: Appointment[];
  medicatie: MedicatieLog[];
  medicatieSchemas: MedicatieSchema[];
  doelen: Doel[];
  mijlpalen: Mijlpaal[];
  trainingOefeningen: TrainingOefening[];
  trainingSchemas: TrainingSchema[];
  trainingLogs: TrainingLog[];
  dagboekWorkouts: DagboekWorkout[];
  dossierDocumenten: DossierDocument[];
  fotoUpdates: FotoUpdate[];
  contactpersonen: Contactpersoon[];
}

export function buildDataExport(input: DataExportInput) {
  return {
    exportInfo: {
      app: "REVA App",
      gegenereerdOp: new Date().toISOString(),
      opmerking:
        "Dit bestand bevat de persoonsgegevens die je zelf in REVA hebt ingevoerd of die over je eigen activiteit gaan, in het kader van je recht op dataportabiliteit (Art. 20 AVG). Notities die je fysiotherapeut onderling over je bijhoudt vallen hier niet onder — vraag daarvoor rechtstreeks bij je praktijk naar inzage.",
    },
    profiel: input.profile,
    meldingsvoorkeuren: input.notificationSettings,
    checkIns: input.checkIns,
    afspraken: input.appointments,
    medicatieLogs: input.medicatie,
    medicatieSchemas: input.medicatieSchemas,
    doelstellingen: input.doelen,
    mijlpalen: input.mijlpalen,
    trainingOefeningen: input.trainingOefeningen,
    trainingSchemas: input.trainingSchemas,
    trainingLogs: input.trainingLogs,
    dagboekWorkouts: input.dagboekWorkouts,
    dossierDocumenten: input.dossierDocumenten,
    fotoUpdates: input.fotoUpdates,
    contactpersonen: input.contactpersonen,
  };
}

export function downloadDataExport(input: DataExportInput): void {
  const data = buildDataExport(input);
  const content = JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reva-mijn-gegevens-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
