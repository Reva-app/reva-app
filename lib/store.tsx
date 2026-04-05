"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import {
  type Profile,
  type NotificationSettings,
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
import { createClient } from "@/lib/supabaseClient";

// ─── Services ─────────────────────────────────────────────────────────────────
import {
  loadProfileAndSettings,
  upsertProfile,
  saveNotificationSettings,
  ensureUserProfileAndSettings,
  markMigrated,
  markSetupCompleted,
} from "@/lib/services/profileService";
import { loadCheckIns, upsertCheckIn } from "@/lib/services/checkinService";
import { loadAppointments, upsertAppointment, deleteAppointment as dbDeleteAppointment } from "@/lib/services/appointmentsService";
import {
  loadTrainingOefeningen, upsertTrainingOefening, deleteTrainingOefening as dbDeleteTrainingOefening,
  loadTrainingSchemas, upsertTrainingSchema, deleteTrainingSchema as dbDeleteTrainingSchema,
  loadTrainingLogs, insertTrainingLog, deleteTrainingLog as dbDeleteTrainingLog,
  loadDagboekWorkouts, upsertDagboekWorkout, deleteDagboekWorkout as dbDeleteDagboekWorkout,
} from "@/lib/services/trainingService";
import {
  loadMedicatieLogs, upsertMedicatieLog, deleteMedicatieLog as dbDeleteMedicatieLog,
  loadMedicatieSchemas, upsertMedicatieSchema, deleteMedicatieSchema as dbDeleteMedicatieSchema,
} from "@/lib/services/medicationService";
import {
  loadDoelen, upsertDoel, deleteDoel as dbDeleteDoel,
  loadMijlpalen, upsertMijlpaal, deleteMijlpaal as dbDeleteMijlpaal,
  reorderMijlpalen as dbReorderMijlpalen,
} from "@/lib/services/goalsService";
import {
  loadDossierDocumenten, upsertDossierDocument, deleteDossierDocument as dbDeleteDossierDocument,
  loadFotoUpdates, upsertFotoUpdate, deleteFotoUpdate as dbDeleteFotoUpdate,
  loadContactpersonen, upsertContactpersoon, deleteContactpersoon as dbDeleteContactpersoon,
} from "@/lib/services/dossierService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dagsSinds(dateStr: string): number {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function herstelFase(dagsSindsOperatie: number): string {
  if (dagsSindsOperatie <= 14) return "Fase 1 — Vroeg postoperatief";
  if (dagsSindsOperatie <= 42) return "Fase 2 — Vroeg herstel";
  if (dagsSindsOperatie <= 90) return "Fase 3 — Functioneel herstel";
  if (dagsSindsOperatie <= 180) return "Fase 4 — Sportspecifiek";
  return "Fase 5 — Terugkeer naar sport";
}

// localStorage helpers (kept for migration reading only)
function lsGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
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

const emptyProfile: Profile = {
  naam: "",
  email: "",
  profielfoto: "",
  authProvider: "email",
  geboortedatum: "",
  blessureDatum: "",
  operatieDatum: "",
  blessureType: "",
  blessureTypeAnders: "",
  situatieOmschrijving: "",
  zorgverzekeraar: "",
  zorgverzekeraaarAnders: "",
  polisnummer: "",
  aanvullendeVerzekeringen: [],
  aantalFysio: "",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppStore {
  hydrated: boolean;
  setupCompleted: boolean;
  markSetupDone: () => void;
  profile: Profile;
  updateProfile: (p: Partial<Profile>) => void;
  dagsSindsBlessure: number;
  dagsSindsOperatie: number;
  fase: string;
  checkIns: CheckIn[];
  appointments: Appointment[];
  medicatie: MedicatieLog[];
  addCheckIn: (ci: CheckIn) => void;
  updateCheckIn: (id: string, patch: Partial<CheckIn>) => void;
  addAppointment: (apt: Appointment) => void;
  updateAppointment: (id: string, patch: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  addMedicatie: (med: MedicatieLog) => void;
  updateMedicatie: (id: string, patch: Partial<MedicatieLog>) => void;
  deleteMedicatie: (id: string) => void;
  medicatieSchemas: MedicatieSchema[];
  addMedicatieSchema: (s: MedicatieSchema) => void;
  updateMedicatieSchema: (id: string, patch: Partial<MedicatieSchema>) => void;
  deleteMedicatieSchema: (id: string) => void;
  readNotificationIds: string[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (ids: string[]) => void;
  loggedNotificationIds: string[];
  markNotificationLogged: (id: string) => void;
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (patch: Partial<NotificationSettings>) => void;
  doelen: Doel[];
  addDoel: (d: Doel) => void;
  updateDoel: (id: string, patch: Partial<Doel>) => void;
  deleteDoel: (id: string) => void;
  promoteToMain: (id: string) => void;
  mijlpalen: Mijlpaal[];
  addMijlpaal: (m: Mijlpaal) => void;
  updateMijlpaal: (id: string, patch: Partial<Mijlpaal>) => void;
  deleteMijlpaal: (id: string) => void;
  reorderMijlpalen: (orderedIds: string[]) => void;
  trainingOefeningen: TrainingOefening[];
  addTrainingOefening: (o: TrainingOefening) => void;
  updateTrainingOefening: (id: string, patch: Partial<TrainingOefening>) => void;
  deleteTrainingOefening: (id: string) => void;
  trainingSchemas: TrainingSchema[];
  addTrainingSchema: (s: TrainingSchema) => void;
  updateTrainingSchema: (id: string, patch: Partial<TrainingSchema>) => void;
  deleteTrainingSchema: (id: string) => void;
  trainingLogs: TrainingLog[];
  addTrainingLog: (l: TrainingLog) => void;
  deleteTrainingLog: (id: string) => void;
  dagboekWorkouts: DagboekWorkout[];
  addDagboekWorkout: (w: DagboekWorkout) => void;
  updateDagboekWorkout: (id: string, patch: Partial<DagboekWorkout>) => void;
  deleteDagboekWorkout: (id: string) => void;
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
  // ── State ──────────────────────────────────────────────────────────────────
  const [profile, setProfile]                     = useState<Profile>(emptyProfile);
  const [checkIns, setCheckIns]                   = useState<CheckIn[]>([]);
  const [appointments, setAppointments]           = useState<Appointment[]>([]);
  const [medicatie, setMedicatie]                 = useState<MedicatieLog[]>([]);
  const [medicatieSchemas, setMedicatieSchemas]   = useState<MedicatieSchema[]>([]);
  const [doelen, setDoelen]                       = useState<Doel[]>([]);
  const [mijlpalen, setMijlpalen]                 = useState<Mijlpaal[]>([]);
  const [trainingOefeningen, setTrainingOefeningen] = useState<TrainingOefening[]>([]);
  const [trainingSchemas, setTrainingSchemas]     = useState<TrainingSchema[]>([]);
  const [trainingLogs, setTrainingLogs]           = useState<TrainingLog[]>([]);
  const [dagboekWorkouts, setDagboekWorkouts]     = useState<DagboekWorkout[]>([]);
  const [dossierDocumenten, setDossierDocumenten] = useState<DossierDocument[]>([]);
  const [fotoUpdates, setFotoUpdates]             = useState<FotoUpdate[]>([]);
  const [contactpersonen, setContactpersonen]     = useState<Contactpersoon[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [readNotificationIds, setReadNotificationIds]   = useState<string[]>([]);
  const [loggedNotificationIds, setLoggedNotificationIds] = useState<string[]>([]);
  const [hydrated, setHydrated]                   = useState(false);
  const [setupCompleted, setSetupCompleted]       = useState(false);

  // Track the currently loaded user to avoid re-loading on unrelated renders
  const loadedUserId = useRef<string | null>(null);

  // ── Load all data for a given user ────────────────────────────────────────

  const loadAllData = useCallback(async (user: User) => {
    if (loadedUserId.current === user.id) return;
    loadedUserId.current = user.id;
    setHydrated(false);

    // Bootstrap ensures profile + settings rows exist
    await ensureUserProfileAndSettings(user);

    // Fetch all data in parallel
    const [
      profileData,
      fetchedCheckIns,
      fetchedAppointments,
      fetchedMedicatie,
      fetchedMedicatieSchemas,
      fetchedDoelen,
      fetchedMijlpalen,
      fetchedOefeningen,
      fetchedSchemas,
      fetchedLogs,
      fetchedWorkouts,
      fetchedDocumenten,
      fetchedFotos,
      fetchedContacten,
    ] = await Promise.all([
      loadProfileAndSettings(user.id),
      loadCheckIns(user.id),
      loadAppointments(user.id),
      loadMedicatieLogs(user.id),
      loadMedicatieSchemas(user.id),
      loadDoelen(user.id),
      loadMijlpalen(user.id),
      loadTrainingOefeningen(user.id),
      loadTrainingSchemas(user.id),
      loadTrainingLogs(user.id),
      loadDagboekWorkouts(user.id),
      loadDossierDocumenten(user.id),
      loadFotoUpdates(user.id),
      loadContactpersonen(user.id),
    ]);

    if (profileData) {
      setProfile(profileData.profile);
      setNotificationSettings(profileData.notifications);
      setSetupCompleted(profileData.setupCompleted);

      // ── localStorage migration (first login with existing local data) ──────
      if (!profileData.migrated) {
        await migrateFromLocalStorage(user.id, {
          checkIns: fetchedCheckIns,
          appointments: fetchedAppointments,
          medicatie: fetchedMedicatie,
          medicatieSchemas: fetchedMedicatieSchemas,
          doelen: fetchedDoelen,
          mijlpalen: fetchedMijlpalen,
          trainingOefeningen: fetchedOefeningen,
          trainingSchemas: fetchedSchemas,
          trainingLogs: fetchedLogs,
          dagboekWorkouts: fetchedWorkouts,
          dossierDocumenten: fetchedDocumenten,
          fotoUpdates: fetchedFotos,
          contactpersonen: fetchedContacten,
        });
        await markMigrated(user.id);
        // Reload after migration
        const [ci2, ap2, md2, ms2, do2, mp2, to2, ts2, tl2, dw2, dd2, fu2, cp2] = await Promise.all([
          loadCheckIns(user.id),
          loadAppointments(user.id),
          loadMedicatieLogs(user.id),
          loadMedicatieSchemas(user.id),
          loadDoelen(user.id),
          loadMijlpalen(user.id),
          loadTrainingOefeningen(user.id),
          loadTrainingSchemas(user.id),
          loadTrainingLogs(user.id),
          loadDagboekWorkouts(user.id),
          loadDossierDocumenten(user.id),
          loadFotoUpdates(user.id),
          loadContactpersonen(user.id),
        ]);
        setCheckIns(ci2);
        setAppointments(ap2);
        setMedicatie(md2);
        setMedicatieSchemas(ms2);
        setDoelen(do2);
        setMijlpalen(mp2);
        setTrainingOefeningen(to2);
        setTrainingSchemas(ts2);
        setTrainingLogs(tl2);
        setDagboekWorkouts(dw2);
        setDossierDocumenten(dd2);
        setFotoUpdates(fu2);
        setContactpersonen(cp2);
      } else {
        setCheckIns(fetchedCheckIns);
        setAppointments(fetchedAppointments);
        setMedicatie(fetchedMedicatie);
        setMedicatieSchemas(fetchedMedicatieSchemas);
        setDoelen(fetchedDoelen);
        setMijlpalen(fetchedMijlpalen);
        setTrainingOefeningen(fetchedOefeningen);
        setTrainingSchemas(fetchedSchemas);
        setTrainingLogs(fetchedLogs);
        setDagboekWorkouts(fetchedWorkouts);
        setDossierDocumenten(fetchedDocumenten);
        setFotoUpdates(fetchedFotos);
        setContactpersonen(fetchedContacten);
      }
    }

    // Notification read/logged state stays in localStorage (device-specific, not critical)
    const lsRead = lsGet<string[]>("reva_read_notifications") ?? [];
    const lsLogged = lsGet<string[]>("reva_logged_notifications") ?? [];
    setReadNotificationIds(lsRead);
    setLoggedNotificationIds(lsLogged);

    setHydrated(true);
  }, []);

  // ── Auth listener ─────────────────────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient();

    // Get current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadAllData(session.user);
      } else {
        setHydrated(true); // No user — still mark as hydrated so UI renders
      }
    });

    // Listen for auth changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadAllData(session.user);
      } else {
        // Signed out — reset all state
        loadedUserId.current = null;
        setProfile(emptyProfile);
        setCheckIns([]);
        setAppointments([]);
        setMedicatie([]);
        setMedicatieSchemas([]);
        setDoelen([]);
        setMijlpalen([]);
        setTrainingOefeningen([]);
        setTrainingSchemas([]);
        setTrainingLogs([]);
        setDagboekWorkouts([]);
        setDossierDocumenten([]);
        setFotoUpdates([]);
        setContactpersonen([]);
        setNotificationSettings(defaultNotificationSettings);
        setSetupCompleted(false);
        setHydrated(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadAllData]);

  // ── Computed values ───────────────────────────────────────────────────────

  const dagsSindsBlessure = dagsSinds(profile.blessureDatum);
  const dagsSindsOperatie = profile.operatieDatum ? dagsSinds(profile.operatieDatum) : 0;
  const fase = profile.operatieDatum
    ? herstelFase(dagsSindsOperatie)
    : "Herstel zonder operatie";

  // ── getCurrentUserId helper ───────────────────────────────────────────────

  function getUserId(): string | null {
    return loadedUserId.current;
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
    const uid = getUserId();
    if (uid) upsertProfile(uid, patch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Setup completed ───────────────────────────────────────────────────────

  const markSetupDone = useCallback(() => {
    setSetupCompleted(true);
    const uid = getUserId();
    if (uid) markSetupCompleted(uid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Notification settings ─────────────────────────────────────────────────

  const updateNotificationSettings = useCallback((patch: Partial<NotificationSettings>) => {
    setNotificationSettings((prev) => {
      const next = { ...prev, ...patch };
      const uid = getUserId();
      if (uid) saveNotificationSettings(uid, next);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Provide the context ───────────────────────────────────────────────────

  return (
    <AppContext.Provider
      value={{
        hydrated,
        setupCompleted,
        markSetupDone,
        profile,
        updateProfile,
        dagsSindsBlessure,
        dagsSindsOperatie,
        fase,

        // ── CheckIns
        checkIns,
        addCheckIn: (ci) => {
          setCheckIns((prev) => [ci, ...prev.filter((c) => c.id !== ci.id)]);
          const uid = getUserId(); if (uid) upsertCheckIn(ci, uid);
        },
        updateCheckIn: (id, patch) => {
          setCheckIns((prev) => prev.map((c) => {
            if (c.id !== id) return c;
            const updated = { ...c, ...patch };
            const uid = getUserId(); if (uid) upsertCheckIn(updated, uid);
            return updated;
          }));
        },

        // ── Appointments
        appointments,
        addAppointment: (apt) => {
          setAppointments((prev) => [...prev, apt]);
          const uid = getUserId(); if (uid) upsertAppointment(apt, uid);
        },
        updateAppointment: (id, patch) => {
          setAppointments((prev) => prev.map((a) => {
            if (a.id !== id) return a;
            const updated = { ...a, ...patch };
            const uid = getUserId(); if (uid) upsertAppointment(updated, uid);
            return updated;
          }));
        },
        deleteAppointment: (id) => {
          setAppointments((prev) => prev.filter((a) => a.id !== id));
          dbDeleteAppointment(id);
        },

        // ── Medicatie logs
        medicatie,
        addMedicatie: (med) => {
          setMedicatie((prev) => [med, ...prev]);
          const uid = getUserId(); if (uid) upsertMedicatieLog(med, uid);
        },
        updateMedicatie: (id, patch) => {
          setMedicatie((prev) => prev.map((m) => {
            if (m.id !== id) return m;
            const updated = { ...m, ...patch };
            const uid = getUserId(); if (uid) upsertMedicatieLog(updated, uid);
            return updated;
          }));
        },
        deleteMedicatie: (id) => {
          setMedicatie((prev) => prev.filter((m) => m.id !== id));
          dbDeleteMedicatieLog(id);
        },

        // ── Medicatie schemas
        medicatieSchemas,
        addMedicatieSchema: (s) => {
          setMedicatieSchemas((prev) => [...prev, s]);
          const uid = getUserId(); if (uid) upsertMedicatieSchema(s, uid);
        },
        updateMedicatieSchema: (id, patch) => {
          setMedicatieSchemas((prev) => prev.map((s) => {
            if (s.id !== id) return s;
            const updated = { ...s, ...patch };
            const uid = getUserId(); if (uid) upsertMedicatieSchema(updated, uid);
            return updated;
          }));
        },
        deleteMedicatieSchema: (id) => {
          setMedicatieSchemas((prev) => prev.filter((s) => s.id !== id));
          dbDeleteMedicatieSchema(id);
        },

        // ── Notification state (device-local, kept in localStorage)
        readNotificationIds,
        markNotificationRead: (id) => {
          setReadNotificationIds((prev) => {
            if (prev.includes(id)) return prev;
            const next = [...prev, id];
            try { localStorage.setItem("reva_read_notifications", JSON.stringify(next)); } catch {}
            return next;
          });
        },
        markAllNotificationsRead: (ids) => {
          setReadNotificationIds((prev) => {
            const set = new Set(prev);
            ids.forEach((id) => set.add(id));
            const next = [...set];
            try { localStorage.setItem("reva_read_notifications", JSON.stringify(next)); } catch {}
            return next;
          });
        },
        loggedNotificationIds,
        markNotificationLogged: (id) => {
          setLoggedNotificationIds((prev) => {
            if (prev.includes(id)) return prev;
            const next = [...prev, id];
            try { localStorage.setItem("reva_logged_notifications", JSON.stringify(next)); } catch {}
            return next;
          });
        },

        // ── Doelen
        doelen,
        addDoel: (d) => {
          setDoelen((prev) => [...prev, d]);
          const uid = getUserId(); if (uid) upsertDoel(d, uid);
        },
        updateDoel: (id, patch) => {
          setDoelen((prev) => prev.map((d) => {
            if (d.id !== id) return d;
            const updated = { ...d, ...patch, updatedAt: new Date().toISOString() };
            const uid = getUserId(); if (uid) upsertDoel(updated, uid);
            return updated;
          }));
        },
        deleteDoel: (id) => {
          setDoelen((prev) => prev.filter((d) => d.id !== id));
          dbDeleteDoel(id);
        },
        promoteToMain: (id) => {
          setDoelen((prev) => {
            const next = prev.map((d) => ({
              ...d,
              type: d.id === id ? "main" : d.type === "main" ? "regular" : d.type,
              updatedAt: new Date().toISOString(),
            })) as Doel[];
            const uid = getUserId();
            if (uid) next.forEach((d) => upsertDoel(d, uid));
            return next;
          });
        },

        // ── Mijlpalen
        mijlpalen,
        addMijlpaal: (m) => {
          setMijlpalen((prev) => {
            const next = [...prev, m];
            const uid = getUserId(); if (uid) upsertMijlpaal(m, uid, next.length - 1);
            return next;
          });
        },
        updateMijlpaal: (id, patch) => {
          setMijlpalen((prev) => prev.map((m, i) => {
            if (m.id !== id) return m;
            const updated = { ...m, ...patch, updatedAt: new Date().toISOString() };
            const uid = getUserId(); if (uid) upsertMijlpaal(updated, uid, i);
            return updated;
          }));
        },
        deleteMijlpaal: (id) => {
          setMijlpalen((prev) => prev.filter((m) => m.id !== id));
          dbDeleteMijlpaal(id);
        },
        reorderMijlpalen: (orderedIds) => {
          setMijlpalen((prev) => {
            const idSet = new Set(orderedIds);
            const map = new Map(prev.map((m) => [m.id, m]));
            const positions = prev.map((m, i) => (idSet.has(m.id) ? i : null)).filter((i): i is number => i !== null);
            const result = [...prev];
            orderedIds.forEach((id, i) => { const m = map.get(id); if (m) result[positions[i]] = m; });
            const uid = getUserId(); if (uid) dbReorderMijlpalen(result, uid);
            return result;
          });
        },

        // ── Training oefeningen
        trainingOefeningen,
        addTrainingOefening: (o) => {
          setTrainingOefeningen((prev) => [...prev, o]);
          const uid = getUserId(); if (uid) upsertTrainingOefening(o, uid);
        },
        updateTrainingOefening: (id, patch) => {
          setTrainingOefeningen((prev) => prev.map((o) => {
            if (o.id !== id) return o;
            const updated = { ...o, ...patch, updatedAt: new Date().toISOString() };
            const uid = getUserId(); if (uid) upsertTrainingOefening(updated, uid);
            return updated;
          }));
        },
        deleteTrainingOefening: (id) => {
          setTrainingOefeningen((prev) => prev.filter((o) => o.id !== id));
          dbDeleteTrainingOefening(id);
        },

        // ── Training schemas
        trainingSchemas,
        addTrainingSchema: (s) => {
          setTrainingSchemas((prev) => [...prev, s]);
          const uid = getUserId(); if (uid) upsertTrainingSchema(s, uid);
        },
        updateTrainingSchema: (id, patch) => {
          setTrainingSchemas((prev) => prev.map((s) => {
            if (s.id !== id) return s;
            const updated = { ...s, ...patch, updatedAt: new Date().toISOString() };
            const uid = getUserId(); if (uid) upsertTrainingSchema(updated, uid);
            return updated;
          }));
        },
        deleteTrainingSchema: (id) => {
          setTrainingSchemas((prev) => prev.filter((s) => s.id !== id));
          dbDeleteTrainingSchema(id);
        },

        // ── Training logs
        trainingLogs,
        addTrainingLog: (l) => {
          setTrainingLogs((prev) => [l, ...prev]);
          const uid = getUserId(); if (uid) insertTrainingLog(l, uid);
        },
        deleteTrainingLog: (id) => {
          setTrainingLogs((prev) => prev.filter((l) => l.id !== id));
          dbDeleteTrainingLog(id);
        },

        // ── Dagboek workouts
        dagboekWorkouts,
        addDagboekWorkout: (w) => {
          setDagboekWorkouts((prev) => [...prev, w]);
          const uid = getUserId(); if (uid) upsertDagboekWorkout(w, uid);
        },
        updateDagboekWorkout: (id, patch) => {
          setDagboekWorkouts((prev) => prev.map((w) => {
            if (w.id !== id) return w;
            const updated = { ...w, ...patch };
            const uid = getUserId(); if (uid) upsertDagboekWorkout(updated, uid);
            return updated;
          }));
        },
        deleteDagboekWorkout: (id) => {
          setDagboekWorkouts((prev) => prev.filter((w) => w.id !== id));
          dbDeleteDagboekWorkout(id);
        },

        // ── Dossier documenten
        dossierDocumenten,
        addDossierDocument: (d) => {
          setDossierDocumenten((prev) => [d, ...prev]);
          const uid = getUserId(); if (uid) upsertDossierDocument(d, uid);
        },
        updateDossierDocument: (id, patch) => {
          setDossierDocumenten((prev) => prev.map((d) => {
            if (d.id !== id) return d;
            const updated = { ...d, ...patch };
            const uid = getUserId(); if (uid) upsertDossierDocument(updated, uid);
            return updated;
          }));
        },
        deleteDossierDocument: (id) => {
          setDossierDocumenten((prev) => prev.filter((d) => d.id !== id));
          dbDeleteDossierDocument(id);
        },

        // ── Foto updates
        fotoUpdates,
        addFotoUpdate: (f) => {
          setFotoUpdates((prev) => [f, ...prev]);
          const uid = getUserId(); if (uid) upsertFotoUpdate(f, uid);
        },
        deleteFotoUpdate: (id) => {
          setFotoUpdates((prev) => prev.filter((f) => f.id !== id));
          dbDeleteFotoUpdate(id);
        },

        // ── Contactpersonen
        contactpersonen,
        addContactpersoon: (c) => {
          setContactpersonen((prev) => [...prev, c]);
          const uid = getUserId(); if (uid) upsertContactpersoon(c, uid);
        },
        updateContactpersoon: (id, patch) => {
          setContactpersonen((prev) => prev.map((c) => {
            if (c.id !== id) return c;
            const updated = { ...c, ...patch };
            const uid = getUserId(); if (uid) upsertContactpersoon(updated, uid);
            return updated;
          }));
        },
        deleteContactpersoon: (id) => {
          setContactpersonen((prev) => prev.filter((c) => c.id !== id));
          dbDeleteContactpersoon(id);
        },

        notificationSettings,
        updateNotificationSettings,
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

// ─── localStorage → Supabase migration ───────────────────────────────────────
// Runs exactly once per user when they first log in with existing local data.

async function migrateFromLocalStorage(
  userId: string,
  existing: {
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
): Promise<void> {
  // Only migrate collections that are empty in Supabase
  const tasks: Promise<void>[] = [];

  if (existing.checkIns.length === 0) {
    const lsData = lsGet<CheckIn[]>("reva_checkins");
    if (lsData?.length) {
      const { upsertCheckIn: uci } = await import("@/lib/services/checkinService");
      tasks.push(...lsData.map((ci) => uci(ci, userId)));
    }
  }

  if (existing.appointments.length === 0) {
    const lsData = lsGet<Appointment[]>("reva_appointments");
    if (lsData?.length) {
      const { upsertAppointment: ua } = await import("@/lib/services/appointmentsService");
      tasks.push(...lsData.map((apt) => ua(apt, userId)));
    }
  }

  if (existing.medicatie.length === 0) {
    const lsData = lsGet<MedicatieLog[]>("reva_medicatie");
    if (lsData?.length) {
      const { upsertMedicatieLog: um } = await import("@/lib/services/medicationService");
      tasks.push(...lsData.map((m) => um(m, userId)));
    }
  }

  if (existing.medicatieSchemas.length === 0) {
    const lsData = lsGet<MedicatieSchema[]>("reva_schemas");
    if (lsData?.length) {
      const { upsertMedicatieSchema: ums } = await import("@/lib/services/medicationService");
      tasks.push(...lsData.map((s) => ums(s, userId)));
    }
  }

  if (existing.trainingOefeningen.length === 0) {
    const lsData = lsGet<TrainingOefening[]>("reva_training_oefeningen");
    if (lsData?.length) {
      const { upsertTrainingOefening: uto } = await import("@/lib/services/trainingService");
      tasks.push(...lsData.map((o) => uto(o, userId)));
    }
  }

  if (existing.trainingSchemas.length === 0) {
    const lsData = lsGet<TrainingSchema[]>("reva_training_schemas");
    if (lsData?.length) {
      const { upsertTrainingSchema: uts } = await import("@/lib/services/trainingService");
      tasks.push(...lsData.map((s) => uts(s, userId)));
    }
  }

  if (existing.trainingLogs.length === 0) {
    const lsData = lsGet<TrainingLog[]>("reva_training_logs");
    if (lsData?.length) {
      const { insertTrainingLog: itl } = await import("@/lib/services/trainingService");
      tasks.push(...lsData.map((l) => itl(l, userId)));
    }
  }

  if (existing.dagboekWorkouts.length === 0) {
    const lsData = lsGet<DagboekWorkout[]>("reva_dagboek_workouts");
    if (lsData?.length) {
      const { upsertDagboekWorkout: udw } = await import("@/lib/services/trainingService");
      tasks.push(...lsData.map((w) => udw(w, userId)));
    }
  }

  if (existing.doelen.length === 0) {
    const lsData = lsGet<Doel[]>("reva_doelen");
    if (lsData?.length) {
      const { upsertDoel: ud } = await import("@/lib/services/goalsService");
      tasks.push(...lsData.map((d) => ud(d, userId)));
    }
  }

  if (existing.mijlpalen.length === 0) {
    const lsData = lsGet<Mijlpaal[]>("reva_mijlpalen");
    if (lsData?.length) {
      const { upsertMijlpaal: um } = await import("@/lib/services/goalsService");
      tasks.push(...lsData.map((m, i) => um(m, userId, i)));
    }
  }

  if (existing.dossierDocumenten.length === 0) {
    const lsData = lsGet<DossierDocument[]>("reva_dossier_documenten");
    if (lsData?.length) {
      const { upsertDossierDocument: udd } = await import("@/lib/services/dossierService");
      tasks.push(...lsData.map((d) => udd(d, userId)));
    }
  }

  if (existing.fotoUpdates.length === 0) {
    const lsData = lsGet<FotoUpdate[]>("reva_foto_updates");
    if (lsData?.length) {
      const { upsertFotoUpdate: ufu } = await import("@/lib/services/dossierService");
      tasks.push(...lsData.map((f) => ufu(f, userId)));
    }
  }

  if (existing.contactpersonen.length === 0) {
    const lsData = lsGet<Contactpersoon[]>("reva_contactpersonen");
    if (lsData?.length) {
      const { upsertContactpersoon: ucp } = await import("@/lib/services/dossierService");
      tasks.push(...lsData.map((c) => ucp(c, userId)));
    }
  }

  // Also migrate profile settings
  const lsProfile = lsGet<Profile>("reva_profile");
  if (lsProfile) {
    await upsertProfile(userId, lsProfile);
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
    console.info(`[REVA] Migrated ${tasks.length} localStorage records to Supabase`);
  }
}
