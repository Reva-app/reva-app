"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface TimePickerProps {
  value: string; // "HH:MM"
  onChange: (val: string) => void;
  placeholder?: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

export function TimePicker({
  value,
  onChange,
  placeholder = "Kies een tijdstip",
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState<string>(() => value?.split(":")[0] ?? pad(new Date().getHours()));
  const [minute, setMinute] = useState<string>(() => {
    const raw = value?.split(":")[1];
    if (!raw) return "00";
    return pad(Math.round(parseInt(raw) / 5) * 5 % 60);
  });

  const ref = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  // Re-sync when value prop changes externally
  useEffect(() => {
    if (!value) return;
    const [h, m] = value.split(":");
    if (h) setHour(h);
    if (m) setMinute(pad(Math.round(parseInt(m) / 5) * 5 % 60));
  }, [value]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // Scroll selected item into view when picker opens
  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      const hEl = hourRef.current?.querySelector("[data-selected='true']");
      const mEl = minuteRef.current?.querySelector("[data-selected='true']");
      hEl?.scrollIntoView({ block: "center" });
      mEl?.scrollIntoView({ block: "center" });
    }, 20);
  }, [open]);

  function confirm(h: string, m: string) {
    onChange(`${h}:${m}`);
    setOpen(false);
  }

  const displayValue = value ? value : "";

  return (
    <div className="relative" ref={ref}>
      {/* Trigger — identical to DatePicker trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-sm rounded-xl border px-4 py-2.5 text-left transition-colors hover:bg-gray-50 focus:outline-none"
        style={{
          borderColor: "#e8e5df",
          background: "#f8f7f4",
          color: displayValue ? "#1a1a1a" : "#9ca3af",
        }}
      >
        <span>{displayValue || placeholder}</span>
        <ChevronDown size={14} className="text-gray-400 shrink-0 ml-2" />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full left-0 mt-2 z-50 rounded-2xl border overflow-hidden"
          style={{
            background: "#ffffff",
            borderColor: "#e8e5df",
            boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
            width: "200px",
          }}
        >
          {/* Column headers — matches DatePicker day-header style */}
          <div
            className="grid grid-cols-2 border-b px-2 pt-2.5 pb-1.5"
            style={{ borderColor: "#f0ede8" }}
          >
            <div className="text-center text-[10px] font-semibold" style={{ color: "#b5b0a8" }}>
              Uur
            </div>
            <div className="text-center text-[10px] font-semibold" style={{ color: "#b5b0a8" }}>
              Min
            </div>
          </div>

          {/* Scroll columns */}
          <div className="flex" style={{ height: "148px" }}>
            {/* Hours */}
            <div
              ref={hourRef}
              className="flex-1 overflow-y-auto border-r py-0.5"
              style={{ borderColor: "#f0ede8", scrollbarWidth: "none" }}
            >
              {HOURS.map((h) => {
                const selected = h === hour;
                return (
                  <button
                    key={h}
                    type="button"
                    data-selected={selected}
                    onClick={() => setHour(h)}
                    className="w-full flex items-center justify-center h-8 text-xs font-medium rounded-lg transition-all mx-auto"
                    style={{
                      background: selected ? "#e8632a" : "transparent",
                      color: selected ? "#ffffff" : "#374151",
                    }}
                  >
                    {h}
                  </button>
                );
              })}
            </div>

            {/* Minutes */}
            <div
              ref={minuteRef}
              className="flex-1 overflow-y-auto py-0.5"
              style={{ scrollbarWidth: "none" }}
            >
              {MINUTES.map((m) => {
                const selected = m === minute;
                return (
                  <button
                    key={m}
                    type="button"
                    data-selected={selected}
                    onClick={() => setMinute(m)}
                    className="w-full flex items-center justify-center h-8 text-xs font-medium rounded-lg transition-all"
                    style={{
                      background: selected ? "#e8632a" : "transparent",
                      color: selected ? "#ffffff" : "#374151",
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer — identical to DatePicker footer */}
          <div
            className="flex items-center justify-between px-3 py-2.5 border-t"
            style={{ borderColor: "#f0ede8", background: "#faf9f7" }}
          >
            <span className="text-xs" style={{ color: "#9ca3af" }}>
              {hour}:{minute}
            </span>
            <button
              type="button"
              onClick={() => confirm(hour, minute)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
              style={{ background: "#1c1c1e", color: "#ffffff" }}
            >
              Bevestigen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
