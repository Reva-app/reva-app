"use client";

import { Button } from "@/components/ui/Button";

/** Paginering-voettekst, gelift uit de patiënten-pagina. */
export function Pagination({
  page, totalPages, totalCount, itemLabel, itemLabelPlural, onPageChange,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  itemLabel: string;
  itemLabelPlural: string;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-3 flex-wrap gap-2" style={{ borderTop: "1px solid #f8f7f4" }}>
      <span className="text-xs text-gray-400">
        Pagina {page} van {totalPages} — {totalCount} {totalCount === 1 ? itemLabel : itemLabelPlural}
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Vorige</Button>
        <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Volgende</Button>
      </div>
    </div>
  );
}
