"use client";

import { ChevronUp, ChevronDown } from "lucide-react";

/**
 * Sorteerbare tabelkop, gelift uit de patiënten-pagina — generiek over de
 * sorteersleutel zodat elke lijstpagina zijn eigen `SortKey`-union kan
 * gebruiken.
 */
export function SortableHeader<K extends string>({
  label, sortKeyValue, activeKey, direction, onSort, align = "left",
}: {
  label: string;
  sortKeyValue: K;
  activeKey: K;
  direction: "asc" | "desc";
  onSort: (key: K) => void;
  align?: "left" | "right";
}) {
  const isActive = activeKey === sortKeyValue;
  return (
    <th
      onClick={() => onSort(sortKeyValue)}
      className={`${align === "left" ? "text-left" : "text-right"} font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3 cursor-pointer select-none hover:text-gray-600`}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
        {label}
        {isActive ? (direction === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
      </span>
    </th>
  );
}
