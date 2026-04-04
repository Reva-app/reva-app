"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (val: string) => void;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
}

const MAANDEN = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December",
];

const DAGHEADERS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

// Approximate rendered height of the dropdown panel in px
const DROPDOWN_HEIGHT = 348;
const DROPDOWN_WIDTH = 288;

function parseDate(str: string): { y: number; m: number; d: number } | null {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m: m - 1, d };
}

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const parsed = parseDate(dateStr);
  if (!parsed) return dateStr;
  const date = new Date(parsed.y, parsed.m, parsed.d);
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function buildCalendarDays(year: number, month: number) {
  // Monday-first grid
  const firstDow = new Date(year, month, 1).getDay();
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells: { day: number; offset: -1 | 0 | 1 }[] = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, offset: -1 });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ day: i, offset: 0 });
  }
  const fill = 42 - cells.length;
  for (let i = 1; i <= fill; i++) {
    cells.push({ day: i, offset: 1 });
  }

  return cells;
}

interface DropdownPos {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Kies een datum",
  minYear = 1940,
  maxYear = 2030,
}: DatePickerProps) {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const parsed = parseDate(value);
  const [navYear, setNavYear] = useState(parsed?.y ?? today.getFullYear());
  const [navMonth, setNavMonth] = useState(parsed?.m ?? today.getMonth());
  const [pending, setPending] = useState<string>(value || "");
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<DropdownPos>({ top: 0, left: 0, width: DROPDOWN_WIDTH });
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Portal requires client-side mount
  useEffect(() => { setMounted(true); }, []);

  // Re-sync internal state when the controlled value changes externally
  useEffect(() => {
    const p = parseDate(value);
    setPending(value || "");
    setNavYear(p?.y ?? today.getFullYear());
    setNavMonth(p?.m ?? today.getMonth());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      const target = e.target as Node;
      const insideTrigger = triggerRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideTrigger && !insideDropdown) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  function openPicker() {
    const p = parseDate(value);
    setNavYear(p?.y ?? today.getFullYear());
    setNavMonth(p?.m ?? today.getMonth());
    setPending(value || "");

    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // On mobile, the fixed nav bar covers the bottom — subtract its height
      const navHeight = window.innerWidth < 640 ? 64 : 0;
      const spaceBelow = window.innerHeight - rect.bottom - navHeight;
      const spaceAbove = rect.top;

      // Clamp left so the dropdown never overflows the right edge
      const left = Math.min(rect.left, window.innerWidth - DROPDOWN_WIDTH - 8);

      if (spaceBelow >= DROPDOWN_HEIGHT + 8) {
        // Enough room below — open downward
        setDropdownPos({ top: rect.bottom + 8, left, width: rect.width });
      } else if (spaceAbove >= DROPDOWN_HEIGHT + 8) {
        // Not enough below, but enough above — open upward
        setDropdownPos({ bottom: window.innerHeight - rect.top + 8, left, width: rect.width });
      } else {
        // Neither side has full room — pick whichever is bigger and cap height
        if (spaceBelow >= spaceAbove) {
          setDropdownPos({ top: rect.bottom + 8, left, width: rect.width });
        } else {
          setDropdownPos({ bottom: window.innerHeight - rect.top + 8, left, width: rect.width });
        }
      }
    }

    setOpen(true);
  }

  function handleDayClick(cell: { day: number; offset: -1 | 0 | 1 }) {
    let y = navYear;
    let m = navMonth + cell.offset;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setPending(toDateStr(y, m, cell.day));
  }

  function confirm() {
    onChange(pending);
    setOpen(false);
  }

  const cells = buildCalendarDays(navYear, navMonth);
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  const dropdown = (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: dropdownPos.top,
        bottom: dropdownPos.bottom,
        left: dropdownPos.left,
        width: `${DROPDOWN_WIDTH}px`,
        zIndex: 9999,
        background: "#ffffff",
        border: "1px solid #e8e5df",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      }}
    >
      {/* Year + month selectors */}
      <div
        className="grid grid-cols-2 gap-2 p-3 border-b"
        style={{ borderColor: "#f0ede8" }}
      >
        <select
          value={navYear}
          onChange={(e) => setNavYear(Number(e.target.value))}
          className="text-sm rounded-lg border px-2 py-1.5 focus:outline-none"
          style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#374151" }}
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          value={navMonth}
          onChange={(e) => setNavMonth(Number(e.target.value))}
          className="text-sm rounded-lg border px-2 py-1.5 focus:outline-none"
          style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#374151" }}
        >
          {MAANDEN.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>
      </div>

      {/* Calendar grid */}
      <div className="p-3">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1.5">
          {DAGHEADERS.map((h) => (
            <div
              key={h}
              className="text-center text-[10px] font-semibold py-1"
              style={{ color: "#b5b0a8" }}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((cell, i) => {
            let y = navYear;
            let m = navMonth + cell.offset;
            if (m < 0) { m = 11; y--; }
            if (m > 11) { m = 0; y++; }
            const dateStr = toDateStr(y, m, cell.day);
            const isSelected = dateStr === pending;
            const isToday = dateStr === todayStr;
            const isOther = cell.offset !== 0;

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleDayClick(cell)}
                className="h-8 w-full flex items-center justify-center rounded-lg text-xs font-medium transition-all"
                style={{
                  background: isSelected
                    ? "#e8632a"
                    : isToday && !isSelected
                    ? "#fff3ee"
                    : "transparent",
                  color: isSelected
                    ? "#ffffff"
                    : isOther
                    ? "#d4cfc9"
                    : isToday
                    ? "#e8632a"
                    : "#374151",
                }}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-3 py-2.5 border-t"
        style={{ borderColor: "#f0ede8", background: "#faf9f7" }}
      >
        <span className="text-xs" style={{ color: "#9ca3af" }}>
          {pending ? formatDisplay(pending) : "Geen datum geselecteerd"}
        </span>
        <button
          type="button"
          onClick={confirm}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
          style={{ background: "#1c1c1e", color: "#ffffff" }}
        >
          Bevestigen
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative" ref={triggerRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={openPicker}
        className="w-full flex items-center justify-between text-sm rounded-xl border px-4 py-2.5 text-left transition-colors hover:bg-gray-50 focus:outline-none"
        style={{
          borderColor: "#e8e5df",
          background: "#f8f7f4",
          color: value ? "#1a1a1a" : "#9ca3af",
        }}
      >
        <span>{value ? formatDisplay(value) : placeholder}</span>
        <ChevronDown size={14} className="text-gray-400 shrink-0 ml-2" />
      </button>

      {/* Dropdown rendered via portal to escape any overflow constraints */}
      {mounted && open && createPortal(dropdown, document.body)}
    </div>
  );
}
