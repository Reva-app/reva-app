"use client";

import { useMemo, useState } from "react";

/**
 * Sorteer- en pagineerlogica voor lijstpagina's, gelift uit de patiënten-
 * pagina. Filteren blijft bewust buiten dit hook — elke pagina heeft zijn
 * eigen filtervelden (zoek, status, categorie, …), dus de aanroeper filtert
 * zelf en geeft hier alleen de al-gefilterde array aan door.
 */
export function useTableState<T, K extends string>(
  filtered: T[],
  compareFn: (a: T, b: T, key: K) => number,
  initialSortKey: K,
  pageSize = 20,
  /** Startrichting bij het voor het eerst aanklikken van een kolom — bv. datumkolommen die je bij de eerste klik al nieuwste-eerst wilt tonen in plaats van oudste-eerst. Standaard "asc" voor elke kolom, zoals voorheen. */
  defaultDirForKey?: (key: K) => "asc" | "desc"
) {
  const [sortKey, setSortKey] = useState<K>(initialSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const copy = [...filtered].sort((a, b) => compareFn(a, b, sortKey));
    return sortDir === "asc" ? copy : copy.reverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize]
  );

  function handleSort(key: K) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(defaultDirForKey?.(key) ?? "asc");
    }
    setPage(1);
  }

  /** Zet sleutel + richting direct, i.p.v. het toggle-gedrag van handleSort — voor een expliciete "Sorteren op"-dropdown. */
  function setSort(key: K, dir: "asc" | "desc") {
    setSortKey(key);
    setSortDir(dir);
    setPage(1);
  }

  return { sortKey, sortDir, handleSort, setSort, page: safePage, setPage, totalPages, sorted, paged };
}
