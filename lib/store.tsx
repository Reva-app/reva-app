"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  mockProfile,
  mockCheckIns,
  mockAppointments,
  mockMedicatie,
  mockMedicatieSchemas,
  mockDoelen,
  mockMijlpalen,
  mockTrainingOefeningen,
  mockTrainingSchemas,
  mockTrainingLogs,
  mockDagboekWorkouts,
  mockDossierDocumenten,
  mockFotoUpdates,
  mockContactpersonen,
  type Profile,
  type CheckIn,
  type Appointment,
  type MedicatieLog,
  type MedicatieSchema,
  type Doel,
  type Mijlpaal,
  type TrainingOefening,
  type TrainingSchema,
  type TrainingLog,
  type DagboekWorkout,
  type DossierDocument,
  type FotoUpdate,
  type Contactpersoon,
} from "./data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dagsSinds(dateStr: string): number {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function herstelFase(dagsSindsOperatie: number): string {
  if (dagsSindsOperatie <= 0)  return "Fase 1 — Vroeg postoperatief";
  if (dagsSindsOperatie <= 14) return "Fase 1 — Vroeg postoperatief";
  if (dagsSindsOperatie <= 42) return "Fase 2 — Vroeg herstel";
  if (dagsSindsOperatie <= 90) return "Fase 3 — Functioneel herstel";
  if (dagsSindsOperatie <= 180) return "Fase 4 — Sportspecifiek";
  return "Fase 5 — Terugkeer naar sport";
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded or private mode — silently ignore
  }
}

// ─── Notification settings ────────────────────────────────────────────────────

export interface NotificationSettings {
  checkin: boolean;
  afspraken: boolean;
  medicatie: boolean;
  training: boolean;
  foto: boolean;
  mijlpalen: boolean;
  checkinTijd: string; // "HH:MM"
}

const defaultNotificationSettings: NotificationSettings = {
  checkin: true,
  afspraken: true,
  medicatie: true,
  training: false,
  foto: false,
  mijlpalen: true,
  checkinTijd: "20:00",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppStore {
  // Hydration
  hydrated: boolean;

  // Profile
  profile: Profile;
  updateProfile: (p: Partial<Profile>) => void;

  // Computed from profile
  dagsSindsBlessure: number;
  dagsSindsOperatie: number;
  fase: string;

  // Data
  checkIns: CheckIn[];
  appointments: Appointment[];
  medicatie: MedicatieLog[];

  // Mutations
  addCheckIn: (ci: CheckIn) => void;
  updateCheckIn: (id: string, patch: Partial<CheckIn>) => void;
  addAppointment: (apt: Appointment) => void;
  updateAppointment: (id: string, patch: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  addMedicatie: (med: MedicatieLog) => void;
  updateMedicatie: (id: string, patch: Partial<MedicatieLog>) => void;
  deleteMedicatie: (id: string) => void;

  // Schemas
  medicatieSchemas: MedicatieSchema[];
  addMedicatieSchema: (s: MedicatieSchema) => void;
  updateMedicatieSchema: (id: string, patch: Partial<MedicatieSchema>) => void;
  deleteMedicatieSchema: (id: string) => void;

  // Notification read state (IDs of notifications the user has dismissed)
  readNotificationIds: string[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (ids: string[]) => void;

  // Notification logged state (IDs that have been acted upon via "Direct innemen")
  loggedNotificationIds: string[];
  markNotificationLogged: (id: string) => void;

  // Notification settings (which types to generate + check-in time)
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (patch: Partial<NotificationSettings>) => void;

  // Doelstellingen
  doelen: Doel[];
  addDoel: (d: Doel) => void;
  updateDoel: (id: string, patch: Partial<Doel>) => void;
  deleteDoel: (id: string) => void;
  promoteToMain: (id: string) => void;

  // Mijlpalen
  mijlpalen: Mijlpaal[];
  addMijlpaal: (m: Mijlpaal) => void;
  updateMijlpaal: (id: string, patch: Partial<Mijlpaal>) => void;
  deleteMijlpaal: (id: string) => void;
  reorderMijlpalen: (orderedIds: string[]) => void;

  // Training — oefeningen database
  trainingOefeningen: TrainingOefening[];
  addTrainingOefening: (o: TrainingOefening) => void;
  updateTrainingOefening: (id: string, patch: Partial<TrainingOefening>) => void;
  deleteTrainingOefening: (id: string) => void;

  // Training — schema's
  trainingSchemas: TrainingSchema[];
  addTrainingSchema: (s: TrainingSchema) => void;
  updateTrainingSchema: (id: string, patch: Partial<TrainingSchema>) => void;
  deleteTrainingSchema: (id: string) => void;

  // Training — logs
  trainingLogs: TrainingLog[];
  addTrainingLog: (l: TrainingLog) => void;
  deleteTrainingLog: (id: string) => void;

  // Dagboek workouts
  dagboekWorkouts: DagboekWorkout[];
  addDagboekWorkout: (w: DagboekWorkout) => void;
  updateDagboekWorkout: (id: string, patch: Partial<DagboekWorkout>) => void;
  deleteDagboekWorkout: (id: string) => void;

  // Dossier
  dossierDocumenten: DossierDocument[];
  addDossierDocument: (d: DossierDocument) => void;
  updateDossierDocument: (id: string, patch: Partial<DossierDocument>) => void;
  deleteDossierDocument: (id: string) => void;

  fotoUpdates: FotoUpdate[];
  addFotoUpdate: (f: FotoUpdate) => void;
  deleteFotoUpdate: (id: string) => void;

  contactpersonen: Contactpersoon[];
  addContactpersoon: (c: Contactpersoon) => void;
  updateContactpersoon: (id: string, patch: Partial<Contactpersoon>) => void;
  deleteContactpersoon: (id: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppStore | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  // Always initialize with mock data so SSR and the first client render are identical.
  // After mount we overwrite with whatever is in localStorage (client-only).
  const [profile, setProfile] = useState<Profile>(mockProfile);
  const [checkIns, setCheckIns] = useState<CheckIn[]>(mockCheckIns);
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [medicatie, setMedicatie] = useState<MedicatieLog[]>(mockMedicatie);
  const [medicatieSchemas, setMedicatieSchemas] = useState<MedicatieSchema[]>(mockMedicatieSchemas);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [loggedNotificationIds, setLoggedNotificationIds] = useState<string[]>([]);
  const [doelen, setDoelen] = useState<Doel[]>(mockDoelen);
  const [mijlpalen, setMijlpalen] = useState<Mijlpaal[]>(mockMijlpalen);
  const [trainingOefeningen, setTrainingOefeningen] = useState<TrainingOefening[]>(mockTrainingOefeningen);
  const [trainingSchemas, setTrainingSchemas] = useState<TrainingSchema[]>(mockTrainingSchemas);
  const [trainingLogs, setTrainingLogs] = useState<TrainingLog[]>(mockTrainingLogs);
  const [dagboekWorkouts, setDagboekWorkouts] = useState<DagboekWorkout[]>(mockDagboekWorkouts);
  const [dossierDocumenten, setDossierDocumenten] = useState<DossierDocument[]>(mockDossierDocumenten);
  const [fotoUpdates, setFotoUpdates] = useState<FotoUpdate[]>(mockFotoUpdates);
  const [contactpersonen, setContactpersonen] = useState<Contactpersoon[]>(mockContactpersonen);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage after hydration — runs only on the client
  useEffect(() => {
    setProfile(loadFromStorage("reva_profile", mockProfile));
    setCheckIns(loadFromStorage("reva_checkins", mockCheckIns));
    setAppointments(loadFromStorage("reva_appointments", mockAppointments));
    setMedicatie(loadFromStorage("reva_medicatie", mockMedicatie));
    setMedicatieSchemas(loadFromStorage("reva_schemas", mockMedicatieSchemas));
    setReadNotificationIds(loadFromStorage("reva_read_notifications", []));
    setLoggedNotificationIds(loadFromStorage("reva_logged_notifications", []));
    setDoelen(loadFromStorage("reva_doelen", mockDoelen));
    setMijlpalen(loadFromStorage("reva_mijlpalen", mockMijlpalen));
    setTrainingOefeningen(loadFromStorage("reva_training_oefeningen", mockTrainingOefeningen));
    setTrainingSchemas(loadFromStorage("reva_training_schemas", mockTrainingSchemas));
    setTrainingLogs(loadFromStorage("reva_training_logs", mockTrainingLogs));
    setDagboekWorkouts(loadFromStorage("reva_dagboek_workouts", mockDagboekWorkouts));
    setDossierDocumenten(loadFromStorage("reva_dossier_documenten", mockDossierDocumenten));
    setFotoUpdates(loadFromStorage("reva_foto_updates", mockFotoUpdates));
    setContactpersonen(loadFromStorage("reva_contactpersonen", mockContactpersonen));
    setNotificationSettings(loadFromStorage("reva_notification_settings", defaultNotificationSettings));
    setHydrated(true);
  }, []);

  // Persist to localStorage on every change (skip the initial mock-seed render)
  useEffect(() => { if (hydrated) saveToStorage("reva_profile", profile); }, [profile, hydrated]);
  useEffect(() => { if (hydrated) saveToStorage("reva_checkins", checkIns); }, [checkIns, hydrated]);
  useEffect(() => { if (hydrated) saveToStorage("reva_appointments", appointments); }, [appointments, hydrated]);
  useEffect(() => { if (hydrated) saveToStorage("reva_medicatie", medicatie); }, [medicatie, hydrated]);
  useEffect(() => { if (hydrated) saveToStorage("reva_schemas", medicatieSchemas); }, [medicatieSchemas, hydrated]);
  useEffect(() => { if (hydrated) saveToStorage("reva_read_notifications", readNotificationIds); }, [readNotificationIds, hydrated]);
  useEffect(() => { if (hydrated) saveToStorage("reva_logged_notifications", loggedNotificationIds); }, [loggedNotificationIds, hydrated]);
  useEffect(() => { if (hydrated) saveToStorage("reva_doelen", doelen); }, [doelen, hydrated]);
  useEffect(() => { if (hydrated) saveToStorage("reva_mijlpalen", mijlpalen); }, [mijlpalen, hydrated]);
  useEffect(() => { if (hydrated) saveToStorage("reva_training_oefeningen", trainingOefeningen); }, [trainingOefeningen, hydrated]);
  useEffect(() => { if (hydrated) saveToStorage("reva_training_schemas", trainingSchemas); }, [trainingSchemas, hydrated]);
  useEffect(() => { if (hydrated) saveToStorage("reva_training_logs", trainingLogs); }, [trainingLogs, hydrated]);
  useEffect(() => { if (hydrated) saveToStorage("reva_dagboek_workouts", dagboekWorkouts); }, [dagboekWorkouts, hydrated]);
  useEffect(() => { if (hydrated) saveToStorage("reva_dossier_documenten", dossierDocumenten); }, [dossierDocumenten, hydrated]);
  useEffect(() => { if (hydrated) saveToStorage("reva_foto_updates", fotoUpdates); }, [fotoUpdates, hydrated]);
  useEffect(() => { if (hydrated) saveToStorage("reva_contactpersonen", contactpersonen); }, [contactpersonen, hydrated]);
  useEffect(() => { if (hydrated) saveToStorage("reva_notification_settings", notificationSettings); }, [notificationSettings, hydrated]);

  // Computed
  const dagsSindsBlessure = dagsSinds(profile.blessureDatum);
  const dagsSindsOperatie = profile.operatieDatum ? dagsSinds(profile.operatieDatum) : 0;
  const fase = profile.operatieDatum
    ? herstelFase(dagsSindsOperatie)
    : "Herstel zonder operatie";

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
  }, []);

  return (
    <AppContext.Provider
      value={{
        hydrated,
        profile,
        updateProfile,
        dagsSindsBlessure,
        dagsSindsOperatie,
        fase,
        checkIns,
        appointments,
        medicatie,
        addCheckIn: (ci) => setCheckIns((prev) => [ci, ...prev]),
        updateCheckIn: (id, patch) =>
          setCheckIns((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c))),
        addAppointment: (apt) => setAppointments((prev) => [...prev, apt]),
        updateAppointment: (id, patch) =>
          setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a))),
        deleteAppointment: (id) =>
          setAppointments((prev) => prev.filter((a) => a.id !== id)),
        addMedicatie: (med) => setMedicatie((prev) => [med, ...prev]),
        updateMedicatie: (id, patch) =>
          setMedicatie((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m))),
        deleteMedicatie: (id) =>
          setMedicatie((prev) => prev.filter((m) => m.id !== id)),
        medicatieSchemas,
        addMedicatieSchema: (s) => setMedicatieSchemas((prev) => [...prev, s]),
        updateMedicatieSchema: (id, patch) =>
          setMedicatieSchemas((prev) =>
            prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
          ),
        deleteMedicatieSchema: (id) =>
          setMedicatieSchemas((prev) => prev.filter((s) => s.id !== id)),

        readNotificationIds,
        markNotificationRead: (id) =>
          setReadNotificationIds((prev) => prev.includes(id) ? prev : [...prev, id]),
        markAllNotificationsRead: (ids) =>
          setReadNotificationIds((prev) => {
            const set = new Set(prev);
            ids.forEach((id) => set.add(id));
            return [...set];
          }),

        loggedNotificationIds,
        markNotificationLogged: (id) =>
          setLoggedNotificationIds((prev) => prev.includes(id) ? prev : [...prev, id]),

        doelen,
        addDoel: (d) => setDoelen((prev) => [...prev, d]),
        updateDoel: (id, patch) =>
          setDoelen((prev) => prev.map((d) => d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d)),
        deleteDoel: (id) => setDoelen((prev) => prev.filter((d) => d.id !== id)),
        promoteToMain: (id) =>
          setDoelen((prev) =>
            prev.map((d) => ({
              ...d,
              type: d.id === id ? "main" : d.type === "main" ? "regular" : d.type,
              updatedAt: new Date().toISOString(),
            })) as Doel[]
          ),

        mijlpalen,
        addMijlpaal: (m) => setMijlpalen((prev) => [...prev, m]),
        updateMijlpaal: (id, patch) =>
          setMijlpalen((prev) => prev.map((m) => m.id === id ? { ...m, ...patch, updatedAt: new Date().toISOString() } : m)),
        deleteMijlpaal: (id) => setMijlpalen((prev) => prev.filter((m) => m.id !== id)),
        reorderMijlpalen: (orderedIds) => setMijlpalen((prev) => {
          const idSet = new Set(orderedIds);
          const map = new Map(prev.map((m) => [m.id, m]));
          // Find the index positions that belong to this fase group
          const positions = prev.map((m, i) => (idSet.has(m.id) ? i : null)).filter((i): i is number => i !== null);
          const result = [...prev];
          orderedIds.forEach((id, i) => { const m = map.get(id); if (m) result[positions[i]] = m; });
          return result;
        }),

        trainingOefeningen,
        addTrainingOefening: (o) => setTrainingOefeningen((prev) => [...prev, o]),
        updateTrainingOefening: (id, patch) =>
          setTrainingOefeningen((prev) => prev.map((o) => o.id === id ? { ...o, ...patch, updatedAt: new Date().toISOString() } : o)),
        deleteTrainingOefening: (id) =>
          setTrainingOefeningen((prev) => prev.filter((o) => o.id !== id)),

        trainingSchemas,
        addTrainingSchema: (s) => setTrainingSchemas((prev) => [...prev, s]),
        updateTrainingSchema: (id, patch) =>
          setTrainingSchemas((prev) => prev.map((s) => s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s)),
        deleteTrainingSchema: (id) =>
          setTrainingSchemas((prev) => prev.filter((s) => s.id !== id)),

        trainingLogs,
        addTrainingLog: (l) => setTrainingLogs((prev) => [l, ...prev]),
        deleteTrainingLog: (id) => setTrainingLogs((prev) => prev.filter((l) => l.id !== id)),

        dagboekWorkouts,
        addDagboekWorkout: (w) => setDagboekWorkouts((prev) => [...prev, w]),
        updateDagboekWorkout: (id, patch) =>
          setDagboekWorkouts((prev) => prev.map((w) => w.id === id ? { ...w, ...patch } : w)),
        deleteDagboekWorkout: (id) =>
          setDagboekWorkouts((prev) => prev.filter((w) => w.id !== id)),

        dossierDocumenten,
        addDossierDocument: (d) => setDossierDocumenten((prev) => [d, ...prev]),
        updateDossierDocument: (id, patch) =>
          setDossierDocumenten((prev) => prev.map((d) => d.id === id ? { ...d, ...patch } : d)),
        deleteDossierDocument: (id) =>
          setDossierDocumenten((prev) => prev.filter((d) => d.id !== id)),

        fotoUpdates,
        addFotoUpdate: (f) => setFotoUpdates((prev) => [f, ...prev]),
        deleteFotoUpdate: (id) =>
          setFotoUpdates((prev) => prev.filter((f) => f.id !== id)),

        contactpersonen,
        addContactpersoon: (c) => setContactpersonen((prev) => [...prev, c]),
        updateContactpersoon: (id, patch) =>
          setContactpersonen((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c)),
        deleteContactpersoon: (id) =>
          setContactpersonen((prev) => prev.filter((c) => c.id !== id)),

        notificationSettings,
        updateNotificationSettings: (patch) =>
          setNotificationSettings((prev) => ({ ...prev, ...patch })),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppData(): AppStore {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
