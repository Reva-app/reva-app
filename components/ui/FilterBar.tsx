"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { fieldControlClass } from "@/components/ui/Field";

/**
 * Zoeken + filters boven een lijst.
 *
 * Vanaf 768px (md) staan de filters naast het zoekveld, zoals voorheen.
 * Op telefoon staat alleen het zoekveld met een knop "Filters (n)" ernaast;
 * de filters openen in een bottom sheet. Zo begint de lijst zelf direct
 * onder de kop in plaats van pas onder zes keuzelijsten.
 *
 * `children` zijn de filtervelden (meestal <Field><Select/></Field>). Geef
 * ze op desktop een vaste breedte via className, bv. "md:w-40".
 */
interface FilterBarProps {
  /** Laat je search/onSearchChange weg, dan is er geen zoekveld (alleen filters). */
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Aantal filters dat nu iets anders dan "Alle" heeft. */
  activeCount: number;
  onReset: () => void;
  /** Aantal resultaten met de huidige filters (voor de knop in de sheet). */
  resultCount: number;
  children: React.ReactNode;
}

export function FilterBar({
  search, onSearchChange, searchPlaceholder = "Zoeken…", activeCount, onReset, resultCount, children,
}: FilterBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const hasSearch = onSearchChange !== undefined;
  const searchField = hasSearch && (
    <div className="relative flex-1 min-w-0 md:min-w-[200px]">
      <Search size={16} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="search"
        value={search ?? ""}
        onChange={(e) => onSearchChange?.(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label="Zoeken"
        className={`${fieldControlClass} pl-9`}
        style={{ borderColor: "#e8e5df" }}
      />
    </div>
  );

  return (
    <div className="rounded-2xl border p-3 md:p-4" style={{ background: "#ffffff", borderColor: "#e8e5df" }}>
      {/* Telefoon: zoeken + filterknop */}
      <div className="flex items-center gap-2 md:hidden">
        {searchField}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={`${hasSearch ? "shrink-0" : "flex-1 justify-center"} inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-xl border text-sm font-medium text-gray-700`}
          style={{
            borderColor: activeCount > 0 ? "var(--brand-accent, #e8632a)" : "#e8e5df",
            background: activeCount > 0 ? "var(--accent-light, var(--brand-accent-soft, #fff3ee))" : "#ffffff",
          }}
        >
          <SlidersHorizontal size={16} aria-hidden />
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
      </div>

      {/* Tablet en groter: alles op één rij */}
      <div className="hidden md:flex flex-wrap gap-3 items-end">
        {hasSearch && (
          <div className="flex-1 min-w-[200px]">
            <p className="block text-xs font-medium text-gray-500 mb-1.5">Zoeken</p>
            {searchField}
          </div>
        )}
        {children}
        {activeCount > 0 && (
          <Button type="button" size="sm" variant="ghost" onClick={onReset} className="mb-0.5">
            Wis filters
          </Button>
        )}
      </div>

      {sheetOpen && (
        <Modal onClose={() => setSheetOpen(false)} maxWidth="max-w-lg">
          <div className="p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Filters</h2>
            <div className="space-y-4">{children}</div>
            <ModalFooter inset="md" className="justify-between">
              <Button type="button" size="sm" variant="ghost" onClick={onReset} disabled={activeCount === 0}>
                Wis filters
              </Button>
              <Button type="button" size="sm" onClick={() => setSheetOpen(false)}>
                Toon {resultCount} {resultCount === 1 ? "resultaat" : "resultaten"}
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}
    </div>
  );
}
