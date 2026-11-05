"use client";

import { useEffect, useRef } from "react";

export interface TabOption<T extends string> {
  value: T;
  label: string;
  /** Extra klassen voor deze tab, bv. "lg:hidden" voor een tab die alleen op telefoon/tablet bestaat. */
  className?: string;
}

interface TabsProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Segmented tabs. Past de rij niet op het scherm, dan scrolt hij
 * horizontaal: de actieve tab schuift vanzelf in beeld en een vervaagde
 * rand laat zien aan welke kant er nog tabs staan.
 */
export function Tabs<T extends string>({ options, value, onChange, className }: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);

  // Vervaagde randen direct op het element zetten (geen state nodig).
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    function updateFade() {
      const node = listRef.current;
      if (!node) return;
      const left = node.scrollLeft > 1;
      const right = node.scrollLeft + node.clientWidth < node.scrollWidth - 1;
      const mask = left || right
        ? `linear-gradient(to right, ${left ? "transparent, #000 24px" : "#000"}, ${right ? "#000 calc(100% - 24px), transparent" : "#000"})`
        : "";
      node.style.maskImage = mask;
      node.style.webkitMaskImage = mask;
    }
    updateFade();
    el.addEventListener("scroll", updateFade, { passive: true });
    const ro = new ResizeObserver(updateFade);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateFade);
      ro.disconnect();
    };
  }, []);

  // Actieve tab in beeld houden (niet bij de eerste weergave, dan zou de pagina kunnen verspringen).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const active = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    active?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [value]);

  return (
    <div
      ref={listRef}
      role="tablist"
      className={`flex rounded-xl overflow-x-auto scrollbar-hide w-full sm:w-fit ${className ?? ""}`}
      style={{ background: "#f3f0eb" }}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.value)}
            className={`shrink-0 px-4 py-2.5 sm:py-2 text-sm font-medium transition-all whitespace-nowrap ${selected ? "" : "hover:bg-black/5"} ${opt.className ?? ""}`}
            style={{
              background: selected ? "#ffffff" : undefined,
              color: selected ? "#1a1a1a" : "#6b7280",
              borderRadius: "10px",
              margin: "3px",
              boxShadow: selected ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
