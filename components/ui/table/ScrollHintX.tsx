"use client";

import { useEffect, useRef, useState } from "react";

interface ScrollHintXProps {
  children: React.ReactNode;
  /** Achtergrondkleur van de vastgezette kolom — moet de kaartachtergrond matchen. */
  stickyBg?: string;
}

/**
 * Vervangt kale `overflow-x-auto` wrappers om brede tabellen: de laatste
 * kolom (de actiekolom — ActionMenu, oog-icoon, wat de tabel ook heeft)
 * blijft bij horizontaal scrollen altijd rechts vastgeplakt, zelfde patroon
 * als Shopify's actiekolom. Zodra er daadwerkelijk gescrold is, krijgt die
 * kolom een subtiele linkerschaduw zodat duidelijk blijft dat er nog
 * verborgen inhoud onder zit — dat vervangt de eerdere losse
 * vervaagrand-hint, die na het vastzetten van de kolom over de inhoud heen
 * zou vallen.
 */
export function ScrollHintX({ children, stickyBg = "#ffffff" }: ScrollHintXProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update() {
      setScrolled(el!.scrollLeft > 1);
    }

    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className={`overflow-x-auto scroll-hint-x ${scrolled ? "scroll-hint-x--scrolled" : ""}`}>
      {children}
      <style>{`
        .scroll-hint-x table tr > *:last-child {
          position: sticky;
          right: 0;
          background: ${stickyBg};
        }
        .scroll-hint-x.scroll-hint-x--scrolled table tr > *:last-child {
          box-shadow: -6px 0 8px -6px rgba(0, 0, 0, 0.12);
        }
      `}</style>
    </div>
  );
}
