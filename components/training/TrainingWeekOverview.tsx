"use client";

import { useEffect, useRef } from "react";
import { Check } from "lucide-react";

export interface WeekDayEntry {
  date: string;
  label: string;
  items: { id: string; label: string; completed: boolean }[];
}

/**
 * Weekoverzicht-kaart (donkere kaart, dag-voor-dag pillen) — losgemaakt uit
 * de oude Training-pagina zodat zowel de protocol-flow als de legacy-flow
 * 'm kunnen tonen, elk met hun eigen databron (protocol-sessielogs resp.
 * dagboekWorkouts) via de `days`-prop.
 */
export function TrainingWeekOverview({ days, subtitle = "Weekoverzicht van je trainingen", today }: {
  days: WeekDayEntry[];
  subtitle?: string;
  today: string;
}) {
  const weekScrollRef = useRef<HTMLDivElement>(null);
  const todayCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (todayCardRef.current && weekScrollRef.current) {
      const card = todayCardRef.current;
      const container = weekScrollRef.current;
      const cardLeft = card.offsetLeft;
      const cardWidth = card.offsetWidth;
      const containerWidth = container.offsetWidth;
      container.scrollLeft = cardLeft - containerWidth / 2 + cardWidth / 2;
    }
  }, []);

  return (
    <div className="rounded-2xl p-5" style={{ background: "#18181a", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="text-sm font-semibold mb-0.5" style={{ color: "#f5f4f2" }}>Deze week</p>
      <p className="text-xs mb-4" style={{ color: "#7c7c8a" }}>{subtitle}</p>

      {/* Desktop: equal-width columns in one row */}
      <div className="hidden sm:flex gap-2">
        {days.map(({ date, label, items }) => {
          const isToday = date === today;
          const visible = items.slice(0, 2);
          const overflow = items.length - visible.length;
          return (
            <div key={date}
              className="flex-1 flex flex-col gap-1.5 py-3 px-2 rounded-xl transition-all"
              style={{
                background: isToday ? "#fff5f0" : "#ffffff",
                border: isToday ? "1.5px solid #e8632a" : "1.5px solid #e8e5df",
                boxShadow: isToday ? "0 0 0 3px rgba(232,99,42,0.08)" : "0 1px 4px rgba(0,0,0,0.05)",
                minWidth: 0,
              }}
            >
              <span className="text-xs font-semibold text-center" style={{ color: isToday ? "#e8632a" : "#1a1a1a" }}>
                {label}
              </span>
              {items.length === 0 ? (
                <div className="flex justify-center">
                  <div className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: isToday ? "#e8632a" : "#e8e5df" }} />
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {visible.map((item) => (
                    <div key={item.id}
                      className="flex items-center gap-1 px-1.5 py-1 rounded-lg"
                      style={{ background: item.completed ? "rgba(34,197,94,0.10)" : "rgba(0,0,0,0.04)" }}
                    >
                      {item.completed ? (
                        <div className="w-3 h-3 rounded-full flex items-center justify-center shrink-0" style={{ background: "#22c55e" }}>
                          <Check size={7} className="text-white" strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ border: "1.5px solid #d1d5db" }} />
                      )}
                      <span className="text-[9px] font-medium leading-tight truncate" style={{ color: item.completed ? "#15803d" : "#374151" }}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                  {overflow > 0 && <p className="text-[9px] font-medium text-center" style={{ color: "#9ca3af" }}>+{overflow} meer</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: horizontal scroll with wider cards */}
      <div ref={weekScrollRef} className="sm:hidden flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {days.map(({ date, label, items }) => {
          const isToday = date === today;
          const visible = items.slice(0, 3);
          const overflow = items.length - visible.length;
          return (
            <div key={date}
              ref={isToday ? todayCardRef : undefined}
              className="flex flex-col gap-2 py-3 px-3 rounded-xl shrink-0"
              style={{
                width: "120px",
                background: isToday ? "#fff5f0" : "#ffffff",
                border: isToday ? "1.5px solid #e8632a" : "1.5px solid #e8e5df",
                boxShadow: isToday ? "0 0 0 3px rgba(232,99,42,0.08)" : "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              <span className="text-xs font-bold" style={{ color: isToday ? "#e8632a" : "#1a1a1a" }}>
                {label}
              </span>
              {items.length === 0 ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: isToday ? "#e8632a" : "#e8e5df" }} />
                  <span className="text-[10px]" style={{ color: "#9ca3af" }}>Rust</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {visible.map((item) => (
                    <div key={item.id} className="flex items-center gap-1.5">
                      {item.completed ? (
                        <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0" style={{ background: "#22c55e" }}>
                          <Check size={8} className="text-white" strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ border: "1.5px solid #d1d5db" }} />
                      )}
                      <span className="text-[10px] font-medium leading-tight line-clamp-2" style={{ color: item.completed ? "#15803d" : "#374151" }}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                  {overflow > 0 && <p className="text-[10px]" style={{ color: "#9ca3af" }}>+{overflow}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
