"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useAppData } from "@/lib/store";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  generateAllNotifications,
  type AppNotification,
} from "@/lib/notifications";
import { NotificationPanel } from "./NotificationPanel";
import dynamic from "next/dynamic";
import type { InnameFormFields } from "@/components/medicatie/InnameModal";
import { nowTimeStr, todayStr } from "@/lib/dateUtils";
import type { MedicatieLog } from "@/lib/data";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const InnameModal = dynamic<any>(
  () => import("@/components/medicatie/InnameModal").then((m) => ({ default: m.InnameModal })),
  { ssr: false }
);

const pageTitles: Record<string, string> = {
  "/":              "Dashboard",
  "/dagboek":       "Dagboek",
  "/check-in":      "Dagelijkse Check-in",
  "/training":      "Training & Oefeningen",
  "/dossier":       "Medisch Dossier",
  "/medicatie":     "Medicatie",
  "/doelstellingen":"Doelstellingen",
  "/analyse":       "Analyse",
  "/instellingen":  "Instellingen",
};

export function TopBar() {
  const pathname = usePathname();
  const router   = useRouter();
  const {
    profile, hydrated,
    medicatieSchemas, addMedicatie,
    checkIns, appointments, dagboekWorkouts, trainingSchemas,
    fotoUpdates, mijlpalen,
    readNotificationIds, markNotificationRead, markAllNotificationsRead,
    loggedNotificationIds, markNotificationLogged,
    notificationSettings,
  } = useAppData();

  const { user } = useAuth();

  const title = pageTitles[pathname] ?? "REVA";
  const avatarLetter = hydrated
    ? (profile.naam.trim()[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "R")
    : "";

  // ── Panel open state ──────────────────────────────────────────────────────
  const [panelOpen, setPanelOpen] = useState(false);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  // ── "Handmatig aanpassen" modal ───────────────────────────────────────────
  const [manualModal, setManualModal] = useState<{
    notification: AppNotification;
    prefill: Partial<InnameFormFields>;
  } | null>(null);

  // ── Clock tick every minute (hydration-safe) ──────────────────────────────
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Derive all notifications, filtered by user settings ──────────────────
  const notifications = useMemo(() => {
    if (!hydrated || !now) return [];
    const all = generateAllNotifications(
      { medicatieSchemas, checkIns, appointments, dagboekWorkouts, trainingSchemas, fotoUpdates, mijlpalen },
      now
    );
    return all.filter((n) => {
      if (n.type === "checkin")  return notificationSettings.checkin;
      if (n.type === "afspraak") return notificationSettings.afspraken;
      if (n.type === "medicatie") return notificationSettings.medicatie;
      if (n.type === "training") return notificationSettings.training;
      if (n.type === "foto")     return notificationSettings.foto;
      if (n.type === "mijlpaal") return notificationSettings.mijlpalen;
      return true;
    });
  }, [
    hydrated, now,
    medicatieSchemas, checkIns, appointments, dagboekWorkouts, trainingSchemas, fotoUpdates, mijlpalen,
    notificationSettings,
  ]);

  const loggedSet = useMemo(() => new Set(loggedNotificationIds), [loggedNotificationIds]);
  const readSet   = useMemo(() => new Set(readNotificationIds),   [readNotificationIds]);

  const unreadCount = useMemo(
    () => notifications.filter(n => !readSet.has(n.id) && !loggedSet.has(n.id)).length,
    [notifications, readSet, loggedSet]
  );

  // ── Direct innemen ────────────────────────────────────────────────────────
  function handleDirectInnemen(notification: AppNotification) {
    if (loggedSet.has(notification.id)) return;
    const schema = medicatieSchemas.find(s => s.id === notification.relatedScheduleId);
    const log: MedicatieLog = {
      id:          crypto.randomUUID(),
      date:        todayStr(),
      time:        nowTimeStr(),
      naam:        notification.relatedMedication ?? "",
      dosering:    schema?.dosering ?? "",
      hoeveelheid: schema?.hoeveelheid || "—",
      reden:       "Volgens het schema",
      notitie:     schema?.notitie || undefined,
    };
    addMedicatie(log);
    markNotificationLogged(notification.id);
    markNotificationRead(notification.id);
  }

  // ── Handmatig aanpassen ───────────────────────────────────────────────────
  function handleHandmatigAanpassen(notification: AppNotification) {
    const schema = medicatieSchemas.find(s => s.id === notification.relatedScheduleId);
    const prefill: Partial<InnameFormFields> = {
      naam:        schema?.naam ?? notification.relatedMedication ?? "",
      naamAnders:  schema?.naamAnders ?? "",
      datum:       todayStr(),
      tijdstip:    notification.scheduledAt ?? nowTimeStr(),
      dosering:    schema?.dosering ?? "",
      hoeveelheid: schema?.hoeveelheid && schema.hoeveelheid !== "—" ? schema.hoeveelheid : "",
      reden:       "Volgens het schema",
      notitie:     schema?.notitie ?? "",
    };
    setManualModal({ notification, prefill });
    setPanelOpen(false);
  }

  function handleManualSave(data: InnameFormFields) {
    if (!manualModal) return;
    const effectiefNaam =
      data.naam === "Anders" && data.naamAnders.trim()
        ? data.naamAnders.trim()
        : data.naam;
    const log: MedicatieLog = {
      id:          crypto.randomUUID(),
      date:        data.datum,
      time:        data.tijdstip,
      naam:        effectiefNaam,
      dosering:    data.dosering.trim(),
      hoeveelheid: data.hoeveelheid.trim() || "—",
      reden:       data.reden.trim(),
      notitie:     data.notitie.trim() || undefined,
    };
    addMedicatie(log);
    markNotificationLogged(manualModal.notification.id);
    markNotificationRead(manualModal.notification.id);
    setTimeout(() => setManualModal(null), 1200);
  }

  // ── CTA click handler ─────────────────────────────────────────────────────
  // action format: "navigate:/path" | "modal:checkin" | "action:innemen"
  function handleCtaClick(action: string) {
    setPanelOpen(false);
    if (action.startsWith("navigate:")) {
      router.push(action.slice("navigate:".length));
    }
    // modal: actions are handled by the dashboard itself (via query params)
    if (action === "modal:checkin") {
      router.push("/?modal=checkin");
    }
  }

  function handleMarkAllRead() {
    markAllNotificationsRead(notifications.map(n => n.id));
  }

  return (
    <>
      <header
        className="pt-safe border-b flex items-center px-4 sm:px-6 lg:px-6"
        style={{ background: "#ffffff", borderColor: "#e8e5df", minHeight: "3rem" }}
      >

        {/* ── Desktop layout: page title left, controls right ── */}
        <h1 className="hidden lg:block text-base font-semibold truncate min-w-0 flex-1 mr-3" style={{ color: "#1a1a1a" }}>
          {title}
        </h1>

        {/* ── Mobile layout: account left · logo center · bell right ── */}

        {/* Account avatar (mobile only) */}
        <button
          onClick={() => router.push("/instellingen")}
          className="lg:hidden w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white overflow-hidden shrink-0"
          style={{ background: hydrated && profile.profielfoto ? "transparent" : "#e8632a" }}
          aria-label="Naar instellingen"
        >
          {hydrated && profile.profielfoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.profielfoto} alt="Profielfoto" className="w-full h-full object-cover" />
          ) : (
            avatarLetter
          )}
        </button>

        {/* Logo center (mobile only) */}
        <div className="lg:hidden flex-1 flex justify-center">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "#e8632a" }}
            >
              <span className="text-white font-bold text-sm leading-none">R</span>
            </div>
            <span className="font-bold text-base" style={{ color: "#1a1a1a" }}>REVA</span>
          </div>
        </div>

        {/* Desktop avatar */}
        <div
          className="hidden lg:flex w-8 h-8 rounded-full items-center justify-center text-sm font-semibold text-white overflow-hidden shrink-0"
          style={{ background: hydrated && profile.profielfoto ? "transparent" : "#e8632a" }}
        >
          {hydrated && profile.profielfoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.profielfoto} alt="Profielfoto" className="w-full h-full object-cover" />
          ) : (
            avatarLetter
          )}
        </div>

        {/* Bell + badge + panel (both mobile & desktop) */}
        <div className="relative ml-3">
          <button
            onClick={() => setPanelOpen(v => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
            style={{ color: panelOpen ? "#e8632a" : "#6b7280" }}
            aria-label="Meldingen openen"
          >
            <Bell size={16} />
          </button>

          {hydrated && unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white pointer-events-none"
              style={{ background: "#e8632a", lineHeight: 1 }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}

          {panelOpen && (
            <NotificationPanel
              notifications={notifications}
              readIds={readNotificationIds}
              loggedIds={loggedNotificationIds}
              onMarkRead={markNotificationRead}
              onMarkAllRead={handleMarkAllRead}
              onDirectInnemen={handleDirectInnemen}
              onHandmatigAanpassen={handleHandmatigAanpassen}
              onCtaClick={handleCtaClick}
              onClose={closePanel}
            />
          )}
        </div>
      </header>

      {/* Global manual modal */}
      {manualModal && (
        <InnameModal
          prefill={manualModal.prefill}
          onSave={handleManualSave}
          onClose={() => setManualModal(null)}
          title="Inname aanpassen"
          saveLabel="Opslaan"
        />
      )}
    </>
  );
}
