"use client";

import { useId } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { Select } from "@/components/ui/Field";
import { ScrollHintX } from "@/components/ui/table/ScrollHintX";

/**
 * Lijst die vanaf 768px (md) een sorteerbare tabel is en daaronder een
 * stapel tikbare kaarten. Op een telefoon past een brede tabel niet: je zag
 * alleen de eerste kolom, de rest stond buiten beeld zonder dat iets dat
 * liet merken. De kaart toont wat er op een klein scherm toe doet.
 *
 * Sorteren, filteren en pagineren blijven bij de aanroeper (zie
 * useTableState); deze component toont alleen.
 */

export interface ListColumn<T, K extends string> {
  key: string;
  header: string;
  /** Maakt de kolomkop klikbaar om op te sorteren. */
  sortKey?: K;
  align?: "left" | "right";
  className?: string;
  /** Verberg deze kolom op smallere schermen (tablet), bv. een minder belangrijke kolom. */
  hideBelow?: "lg" | "xl";
  cell: (row: T) => React.ReactNode;
}

const HIDE_BELOW = { lg: "hidden lg:table-cell", xl: "hidden xl:table-cell" } as const;

export interface ListAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

export interface ListSort<K extends string> {
  key: K;
  dir: "asc" | "desc";
  /** Kolomkop aangeklikt (tabel). */
  onSort: (key: K) => void;
  /** Expliciete keuze uit de "Sorteren op"-lijst (kaarten). */
  onSet: (key: K, dir: "asc" | "desc") => void;
  /** Keuzes voor de "Sorteren op"-lijst op telefoon. */
  options: { key: K; dir: "asc" | "desc"; label: string }[];
}

interface ResponsiveListProps<T, K extends string> {
  rows: T[];
  rowKey: (row: T) => string;
  columns: ListColumn<T, K>[];
  /** Inhoud van de kaart op telefoon (zonder actiemenu, dat komt er vanzelf bij). */
  card: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  /** Toegankelijke naam van een rij/kaart, bv. de naam van de patiënt. */
  rowLabel?: (row: T) => string;
  actions?: (row: T) => ListAction[] | null;
  sort?: ListSort<K>;
}

export function ResponsiveList<T, K extends string>({
  rows, rowKey, columns, card, onRowClick, rowLabel, actions, sort,
}: ResponsiveListProps<T, K>) {
  const hasActions = !!actions;
  const sortId = useId();

  return (
    <>
      {/* Telefoon: kaarten */}
      <div className="md:hidden">
        {sort && (
          <div className="px-4 pt-3 pb-1 flex items-center justify-end gap-2">
            <label htmlFor={sortId} className="text-xs font-medium text-gray-500 shrink-0">Sorteren op</label>
            <div className="w-52">
              <Select
                id={sortId}
                value={`${sort.key}:${sort.dir}`}
                onChange={(e) => {
                  const [key, dir] = e.target.value.split(":") as [K, "asc" | "desc"];
                  sort.onSet(key, dir);
                }}
              >
                {sort.options.map((o) => (
                  <option key={`${o.key}:${o.dir}`} value={`${o.key}:${o.dir}`}>{o.label}</option>
                ))}
              </Select>
            </div>
          </div>
        )}
        <ul>
          {rows.map((row) => {
            const rowActions = actions?.(row) ?? null;
            return (
              <li key={rowKey(row)} className="flex items-start gap-1 border-b last:border-b-0" style={{ borderColor: "#f0ede8" }}>
                <div
                  role={onRowClick ? "link" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-label={rowLabel?.(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (e) => { if (e.key === "Enter") onRowClick(row); } : undefined}
                  className={`flex-1 min-w-0 px-4 py-3.5 ${onRowClick ? "cursor-pointer active:bg-gray-50" : ""}`}
                >
                  {card(row)}
                </div>
                {rowActions && rowActions.length > 0 && (
                  <div className="pt-3.5 pr-3 shrink-0">
                    <ActionMenu items={rowActions} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Tablet en groter: tabel */}
      <div className="hidden md:block">
        <ScrollHintX>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #e8e5df" }}>
                {columns.map((col) => (
                  <HeaderCell key={col.key} column={col} sort={sort} />
                ))}
                {hasActions && (
                  <th className="text-right font-medium text-gray-500 text-xs uppercase tracking-wide px-5 py-3">Actie</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rowActions = actions?.(row) ?? null;
                return (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={onRowClick ? "cursor-pointer transition-colors hover:bg-gray-50" : undefined}
                    style={{ borderBottom: "1px solid #f8f7f4" }}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={`px-5 py-3.5 ${col.align === "right" ? "text-right" : ""} ${col.hideBelow ? HIDE_BELOW[col.hideBelow] : ""} ${col.className ?? ""}`}>
                        {col.cell(row)}
                      </td>
                    ))}
                    {hasActions && (
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        {rowActions && rowActions.length > 0 && <ActionMenu items={rowActions} />}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollHintX>
      </div>
    </>
  );
}

function HeaderCell<T, K extends string>({ column, sort }: { column: ListColumn<T, K>; sort?: ListSort<K> }) {
  const align = column.align === "right" ? "text-right" : "text-left";
  const hide = column.hideBelow ? HIDE_BELOW[column.hideBelow] : "";
  const base = `${align} ${hide} font-medium text-gray-500 text-xs uppercase tracking-wide px-5 py-3`;
  if (!column.sortKey || !sort) {
    return <th className={base}>{column.header}</th>;
  }
  const active = sort.key === column.sortKey;
  return (
    <th
      className={`${base} cursor-pointer select-none hover:text-gray-700`}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
      onClick={() => sort.onSort(column.sortKey!)}
    >
      <span className={`inline-flex items-center gap-1 ${column.align === "right" ? "flex-row-reverse" : ""}`}>
        {column.header}
        {active ? (sort.dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
      </span>
    </th>
  );
}
