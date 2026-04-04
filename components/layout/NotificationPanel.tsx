"use client";

import { useRef, useEffect, useState } from "react";
import {
  Bell, Check, CheckCheck, Clock, Pill,
  ClipboardCheck, Calendar, Dumbbell, Image, Trophy, ArrowRight,
} from "lucide-react";
import type { AppNotification, NotificationType } from "@/lib/notifications";

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<NotificationType, {
  icon: React.ElementType;
  color: string;
  bg: string;
}> = {
  medicatie: { icon: Pill,          color: "#e8632a", bg: "#fff3ee" },
  checkin:   { icon: ClipboardCheck, color: "#e8632a", bg: "#fff3ee" },
  afspraak:  { icon: Calendar,       color: "#3b82f6", bg: "#eff6ff" },
  training:  { icon: Dumbbell,       color: "#0ea5e9", bg: "#f0f9ff" },
  foto:      { icon: Image,          color: "#6b7280", bg: "#f3f4f6" },
  mijlpaal:  { icon: Trophy,         color: "#e8632a", bg: "#fff3ee" },
};

// ─── Individual notification item ─────────────────────────────────────────────

interface NotificationItemProps {
  notification: AppNotification;
  isRead: boolean;
  isLogged: boolean;
  onMarkRead: () => void;
  onDirectInnemen: () => void;
  onHandmatigAanpassen: () => void;
  onCtaClick: (action: string) => void;
}

function NotificationItem({
  notification,
  isRead,
  isLogged,
  onMarkRead,
  onDirectInnemen,
  onHandmatigAanpassen,
  onCtaClick,
}: NotificationItemProps) {
  const cfg       = TYPE_CONFIG[notification.type];
  const Icon      = cfg.icon;
  const isDue     = notification.status === "due";
  const isMotivatie = notification.status === "motivatie";
  const [justLogged, setJustLogged] = useState(false);
  const done = isLogged || justLogged;

  function handleCtaPrimary() {
    const action = notification.cta?.action ?? "";
    if (action === "action:innemen") {
      setJustLogged(true);
      onDirectInnemen();
    } else if (action === "action:aanpassen") {
      onHandmatigAanpassen();
    } else {
      onCtaClick(action);
      onMarkRead();
    }
  }

  function handleCtaSecondary() {
    const action = notification.ctaSecondary?.action ?? "";
    if (action === "action:aanpassen") onHandmatigAanpassen();
    else { onCtaClick(action); onMarkRead(); }
  }

  const dimmed = (isRead || done) && !isMotivatie;

  return (
    <div
      className="px-4 py-4 transition-all"
      style={{
        background: dimmed ? "transparent" : "#faf9f7",
        borderBottom: "1px solid #f0ede8",
        opacity: done && !justLogged ? 0.55 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: justLogged ? "#f0fdf4" : isMotivatie ? "#fff3ee" : cfg.bg }}
        >
          {justLogged
            ? <Check size={14} style={{ color: "#22c55e" }} />
            : <Icon size={14} style={{ color: cfg.color }} />
          }
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className="text-sm leading-tight"
              style={{
                fontWeight: dimmed ? 400 : 600,
                color: dimmed ? "#6b7280" : "#1a1a1a",
              }}
            >
              {justLogged ? "Inname geregistreerd" : notification.title}
            </p>

            {/* Unread dot */}
            {!dimmed && !justLogged && (
              <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: cfg.color }} />
            )}
          </div>

          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
            {justLogged
              ? `${notification.relatedMedication} · Zojuist gelogd`
              : notification.description}
          </p>

          {/* Time + status badge */}
          {(notification.scheduledAt || isDue) && (
            <div className="flex items-center gap-1 mt-0.5">
              {notification.scheduledAt && (
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Clock size={10} />
                  {notification.scheduledAt}
                </span>
              )}
              {isDue && !done && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ background: "#fff3ee", color: "#e8632a" }}>
                  Nu
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          {!done ? (
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              {notification.cta && (
                <button
                  onClick={handleCtaPrimary}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
                  style={{ background: cfg.color, color: "#ffffff" }}
                >
                  {notification.cta.action === "action:innemen" && <Check size={11} />}
                  {notification.cta.action.startsWith("navigate:") && <ArrowRight size={11} />}
                  {notification.cta.label}
                </button>
              )}
              {notification.ctaSecondary && (
                <button
                  onClick={handleCtaSecondary}
                  className="text-xs font-medium transition-colors hover:text-gray-700"
                  style={{ color: "#9ca3af" }}
                >
                  {notification.ctaSecondary.label}
                </button>
              )}
              {!isRead && (
                <button
                  onClick={onMarkRead}
                  className="ml-auto text-[11px] font-medium transition-colors hover:opacity-70"
                  style={{ color: "#c4bfb7" }}
                >
                  Negeren
                </button>
              )}
            </div>
          ) : isLogged && !justLogged ? (
            <p className="text-[11px] mt-2" style={{ color: "#22c55e" }}>✓ Al geregistreerd</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface NotificationPanelProps {
  notifications: AppNotification[];
  readIds: string[];
  loggedIds: string[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDirectInnemen: (notification: AppNotification) => void;
  onHandmatigAanpassen: (notification: AppNotification) => void;
  onCtaClick: (action: string) => void;
  onClose: () => void;
}

export function NotificationPanel({
  notifications,
  readIds,
  loggedIds,
  onMarkRead,
  onMarkAllRead,
  onDirectInnemen,
  onHandmatigAanpassen,
  onCtaClick,
  onClose,
}: NotificationPanelProps) {
  const ref      = useRef<HTMLDivElement>(null);
  const readSet  = new Set(readIds);
  const loggedSet = new Set(loggedIds);

  const unreadCount = notifications.filter(
    n => !readSet.has(n.id) && !loggedSet.has(n.id)
  ).length;

  // Close on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    const t = setTimeout(() => document.addEventListener("mousedown", onOutside), 50);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", onOutside); };
  }, [onClose]);

  // Close on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hasUnread = unreadCount > 0;

  // Group by type label for the footer summary
  const typeCount = notifications.reduce<Record<string, number>>((acc, n) => {
    acc[n.type] = (acc[n.type] ?? 0) + 1;
    return acc;
  }, {});
  const typeLabels: Record<string, string> = {
    medicatie: "medicatie", checkin: "check-in", afspraak: "afspraken",
    training: "training", foto: "foto", mijlpaal: "mijlpaal",
  };
  const footerParts = Object.entries(typeCount)
    .map(([t, c]) => `${c} ${typeLabels[t] ?? t}`)
    .join(" · ");

  return (
    <>
    {/* Mobile backdrop — tap outside closes panel */}
    <div
      className="lg:hidden fixed inset-0 z-[55]"
      style={{ background: "rgba(0,0,0,0.2)" }}
      onClick={onClose}
    />
    <div
      ref={ref}
      className="rounded-2xl overflow-hidden"
      style={{
        /* Fixed positioning ensures it's always within viewport regardless of scroll/parent position */
        position: "fixed",
        top: "60px",
        right: "16px",
        background: "#ffffff",
        border: "1px solid #e8e5df",
        boxShadow: "0 12px 40px rgba(0,0,0,0.14)",
        width: "min(380px, calc(100vw - 32px))",
        maxHeight: "min(540px, calc(100vh - 80px))",
        display: "flex",
        flexDirection: "column",
        zIndex: 60,
        animation: "notifSlideIn 0.2s cubic-bezier(0.34,1.2,0.64,1)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3.5 border-b shrink-0"
        style={{ borderColor: "#f0ede8" }}
      >
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">Meldingen</p>
          {hasUnread && (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: "#e8632a", color: "#ffffff" }}>
              {unreadCount}
            </span>
          )}
        </div>
        {hasUnread && (
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-70"
            style={{ color: "#9ca3af" }}
          >
            <CheckCheck size={13} />
            Alles negeren
          </button>
        )}
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: "none" }}>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#f3f0eb" }}>
              <Bell size={18} style={{ color: "#c4bfb7" }} />
            </div>
            <p className="text-sm text-gray-400 text-center px-4">
              Geen meldingen op dit moment
            </p>
          </div>
        ) : (
          notifications.map(n => (
            <NotificationItem
              key={n.id}
              notification={n}
              isRead={readSet.has(n.id)}
              isLogged={loggedSet.has(n.id)}
              onMarkRead={() => onMarkRead(n.id)}
              onDirectInnemen={() => onDirectInnemen(n)}
              onHandmatigAanpassen={() => onHandmatigAanpassen(n)}
              onCtaClick={onCtaClick}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 shrink-0 border-t"
          style={{ borderColor: "#f0ede8", background: "#faf9f7" }}>
          <p className="text-[11px] text-center" style={{ color: "#c4bfb7" }}>
            {footerParts}
          </p>
        </div>
      )}

    </div>
    </>
  );
}
