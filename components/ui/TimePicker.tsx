"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { useFieldContext } from "@/components/ui/Field";
import { bottomNavOffset } from "@/lib/layout";

interface TimePickerProps {
  value: string; // "HH:MM" (ook "HH:MM:SS" uit de database wordt geaccepteerd)
  onChange: (val: string) => void;
  placeholder?: string;
  /** Standaard het id van de omliggende <Field>, zodat het label klikbaar is. */
  id?: string;
  disabled?: boolean;
  /** Smalle variant voor in een rij, bv. "09:00 tot 17:00" bij openingstijden. */
  compact?: boolean;
  /** Toegankelijke naam als er geen <Field>-label is, bv. "Maandag van". */
  ariaLabel?: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function roundMinute(raw: string | undefined): string {
  if (!raw) return "00";
  return pad((Math.round(parseInt(raw) / 5) * 5) % 60);
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

const DROPDOWN_WIDTH = 200;
// Kop + twee kolommen + voettekst
const DROPDOWN_HEIGHT = 250;

interface DropdownPos {
  top?: number;
  bottom?: number;
  left: number;
}

/** Onder het veld als daar (boven de onderbalk) plek is, anders erboven. */
function positionFor(rect: DOMRect): DropdownPos {
  const spaceBelow = window.innerHeight - rect.bottom - bottomNavOffset();
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - DROPDOWN_WIDTH - 8));
  return spaceBelow >= DROPDOWN_HEIGHT + 8 || spaceBelow >= rect.top
    ? { top: rect.bottom + 8, left }
    : { bottom: window.innerHeight - rect.top + 8, left };
}

/**
 * Tijdkiezer in REVA-stijl (geen native tijdveld). Het keuzevenster opent
 * via een portal met vaste positie, zodat het niet wordt afgeknipt door een
 * scrollende modal, en klapt naar boven als er onder (boven de onderbalk)
 * geen ruimte is.
 */
export function TimePicker({
  value,
  onChange,
  placeholder = "Kies een tijdstip",
  id,
  disabled = false,
  compact = false,
  ariaLabel,
}: TimePickerProps) {
  const field = useFieldContext();
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState<string>(() => value?.split(":")[0] || pad(new Date().getHours()));
  const [minute, setMinute] = useState<string>(() => roundMinute(value?.split(":")[1]));
  const [pos, setPos] = useState<DropdownPos>({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  // Re-sync when value prop changes externally
  useEffect(() => {
    if (!value) return;
    const [h, m] = value.split(":");
    if (h) setHour(h);
    if (m) setMinute(roundMinute(m));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    // Scrollt de pagina of modal eronder, dan schuift de kiezer mee met het
    // veld; verdwijnt het veld uit beeld, dan gaat hij dicht.
    function onScroll(e: Event) {
      if (dropdownRef.current?.contains(e.target as Node)) return;
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) { setOpen(false); return; }
      setPos(positionFor(rect));
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  // Scroll selected item into view when picker opens
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      hourRef.current?.querySelector<HTMLElement>("[data-selected='true']")?.scrollIntoView({ block: "center" });
      minuteRef.current?.querySelector<HTMLElement>("[data-selected='true']")?.scrollIntoView({ block: "center" });
    }, 20);
    return () => clearTimeout(t);
  }, [open]);

  function toggle() {
    if (open) { setOpen(false); return; }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos(positionFor(rect));
    setOpen(true);
  }

  function confirm() {
    onChange(`${hour}:${minute}`);
    setOpen(false);
    triggerRef.current?.focus();
  }

  const displayValue = value ? value.slice(0, 5) : "";

  const dropdown = (
    <div
      ref={dropdownRef}
      role="dialog"
      aria-label="Tijd kiezen"
      className="rounded-2xl border overflow-hidden"
      style={{
        position: "fixed",
        top: pos.top,
        bottom: pos.bottom,
        left: pos.left,
        width: `${DROPDOWN_WIDTH}px`,
        zIndex: "var(--z-popover)",
        background: "#ffffff",
        borderColor: "#e8e5df",
        boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
      }}
    >
      {/* Column headers — matches DatePicker day-header style */}
      <div className="grid grid-cols-2 border-b px-2 pt-2.5 pb-1.5" style={{ borderColor: "#f0ede8" }}>
        <div className="text-center text-[11px] font-semibold text-gray-500">Uur</div>
        <div className="text-center text-[11px] font-semibold text-gray-500">Min</div>
      </div>

      {/* Scroll columns */}
      <div className="flex" style={{ height: "160px" }}>
        {[
          { ref: hourRef, items: HOURS, selected: hour, set: setHour, label: "Uur", border: true },
          { ref: minuteRef, items: MINUTES, selected: minute, set: setMinute, label: "Minuten", border: false },
        ].map((col) => (
          <div
            key={col.label}
            ref={col.ref}
            role="listbox"
            aria-label={col.label}
            className={`flex-1 overflow-y-auto overscroll-contain py-0.5 ${col.border ? "border-r" : ""}`}
            style={{ borderColor: "#f0ede8", scrollbarWidth: "none" }}
          >
            {col.items.map((item) => {
              const selected = item === col.selected;
              return (
                <button
                  key={item}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  data-selected={selected}
                  onClick={() => col.set(item)}
                  className="w-full flex items-center justify-center h-8 touch:h-10 text-sm sm:text-xs touch:text-sm font-medium rounded-lg transition-all"
                  style={{
                    background: selected ? "var(--brand-accent, #e8632a)" : "transparent",
                    color: selected ? "#ffffff" : "#374151",
                  }}
                >
                  {item}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer — identical to DatePicker footer */}
      <div className="flex items-center justify-between px-3 py-2.5 border-t" style={{ borderColor: "#f0ede8", background: "#faf9f7" }}>
        <span className="text-sm sm:text-xs text-gray-500 tabular-nums">{hour}:{minute}</span>
        <button
          type="button"
          onClick={confirm}
          className="text-xs font-semibold px-3 py-1.5 touch:py-2.5 rounded-lg transition-opacity hover:opacity-90"
          style={{ background: "#1c1c1e", color: "#ffffff" }}
        >
          Bevestigen
        </button>
      </div>
    </div>
  );

  return (
    <div className={compact ? "relative w-[5.5rem] shrink-0" : "relative"}>
      <button
        ref={triggerRef}
        id={id ?? field?.id}
        type="button"
        disabled={disabled}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-describedby={field?.describedBy}
        className={`w-full flex items-center justify-between rounded-xl border text-left transition-colors hover:bg-gray-50 focus:outline-none focus:border-[var(--brand-accent,#e8632a)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-transparent text-base sm:text-sm min-h-11 sm:min-h-0 touch:min-h-11 tabular-nums ${compact ? "px-2.5 py-1.5" : "px-4 py-2.5"}`}
        style={{
          borderColor: "#e8e5df",
          background: "#f8f7f4",
          color: displayValue ? "#1a1a1a" : "#9ca3af",
        }}
      >
        <span>{displayValue || placeholder}</span>
        <ChevronDown size={14} aria-hidden className="text-gray-400 shrink-0 ml-1" />
      </button>

      {open && typeof document !== "undefined" && createPortal(dropdown, document.body)}
    </div>
  );
}
