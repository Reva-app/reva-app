"use client";

import { useEffect, useMemo, useState } from "react";
import { Gauge, Plus, ArrowLeftRight } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { StatStrip } from "@/components/ui/StatStrip";
import { ResponsiveList, type ListColumn } from "@/components/ui/ResponsiveList";
import { FilterBar } from "@/components/ui/FilterBar";
import { Field, Select } from "@/components/ui/Field";
import { LibraryTestModal } from "@/components/portal/tests/LibraryTestModal";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { MANAGE_PROTOCOLS_ROLES } from "@/lib/services/protocolService";
import {
  loadTestLibrary, createLibraryTest, updateLibraryTest, setLibraryTestArchived, deleteLibraryTest,
  TEST_CATEGORY_LABELS, TEST_CATEGORY_ORDER, TEST_REGION_LABELS,
  type LibraryTest, type TestCategory,
} from "@/lib/services/testService";

function SourceBadge({ t }: { t: LibraryTest }) {
  if (t.scope === "reva") return <Badge variant="muted">REVA</Badge>;
  return t.archived ? <Badge variant="warning">Gearchiveerd</Badge> : <Badge variant="blue">Eigen praktijk</Badge>;
}

const COLUMNS: ListColumn<LibraryTest, string>[] = [
  {
    key: "name", header: "Test",
    cell: (t) => (
      <div className="min-w-0">
        <p className="font-medium text-gray-900">{t.name}</p>
        {t.description && <p className="text-xs text-gray-500 truncate max-w-[520px]">{t.description}</p>}
      </div>
    ),
  },
  { key: "category", header: "Soort", cell: (t) => <span className="text-sm text-gray-700">{TEST_CATEGORY_LABELS[t.category]}</span> },
  {
    key: "unit", header: "Meting",
    cell: (t) => (
      <span className="text-sm text-gray-700 inline-flex items-center gap-1.5">
        {t.unit}{t.bilateral && <span className="text-[11px] rounded-full px-1.5 py-0.5 bg-gray-100 text-gray-600 inline-flex items-center gap-0.5"><ArrowLeftRight size={10} /> L/R</span>}
      </span>
    ),
  },
  { key: "regions", header: "Passend bij", hideBelow: "lg", cell: (t) => <span className="text-sm text-gray-600">{t.bodyRegions.map((r) => TEST_REGION_LABELS[r] ?? r).join(", ") || "—"}</span> },
  { key: "source", header: "Bron", cell: (t) => <SourceBadge t={t} /> },
];

/**
 * Testbibliotheek van de praktijk: de REVA-testen plus eigen testen. Testen
 * voeg je bij een patiënt toe via het dossier (tab Testen).
 */
export default function PortalTestsPage() {
  const { checked, membership } = usePortalMembership();
  const { showToast, toastNode } = useToast();
  const [tests, setTests] = useState<LibraryTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [region, setRegion] = useState("");
  const [source, setSource] = useState("");
  const [editing, setEditing] = useState<{ test: LibraryTest | null; copy: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LibraryTest | null>(null);
  const canManage = !!membership && MANAGE_PROTOCOLS_ROLES.includes(membership.roleKey);

  function refresh() {
    loadTestLibrary({ includeArchived: true }).then((t) => { setTests(t); setLoading(false); });
  }
  useEffect(() => {
    if (!checked || !membership) return;
    let cancelled = false;
    loadTestLibrary({ includeArchived: true }).then((t) => { if (!cancelled) { setTests(t); setLoading(false); } });
    return () => { cancelled = true; };
  }, [checked, membership]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tests
      .filter((t) => (!category || t.category === category)
        && (!region || t.bodyRegions.includes(region))
        && (!source || (source === "reva" ? t.scope === "reva" : t.scope === "organization"))
        && (!q || `${t.name} ${t.description ?? ""}`.toLowerCase().includes(q)))
      .sort((a, b) => (a.archived === b.archived ? 0 : a.archived ? 1 : -1)
        || (a.scope === b.scope ? 0 : a.scope === "organization" ? -1 : 1)
        || TEST_CATEGORY_ORDER.indexOf(a.category) - TEST_CATEGORY_ORDER.indexOf(b.category)
        || a.name.localeCompare(b.name, "nl"));
  }, [tests, search, category, region, source]);

  const own = tests.filter((t) => t.scope === "organization" && !t.archived).length;
  const activeFilters = [category, region, source].filter(Boolean).length;

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader title="Testen" subtitle="Objectieve metingen om de voortgang van patiënten te volgen. Voeg een test toe via het dossier van een patiënt." />
        {canManage && <Button size="sm" onClick={() => setEditing({ test: null, copy: false })}><Plus size={14} /> Eigen test</Button>}
      </div>

      <StatStrip items={[
        { label: "Totaal", value: tests.filter((t) => !t.archived).length, icon: Gauge },
        { label: "Eigen praktijk", value: own, icon: Gauge },
        { label: "REVA-bibliotheek", value: tests.filter((t) => t.scope === "reva").length, icon: Gauge },
      ]} />

      <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Naam…" activeCount={activeFilters}
        onReset={() => { setCategory(""); setRegion(""); setSource(""); }} resultCount={filtered.length}>
        <Field label="Soort" className="md:w-40">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Alle</option>
            {TEST_CATEGORY_ORDER.map((c: TestCategory) => <option key={c} value={c}>{TEST_CATEGORY_LABELS[c]}</option>)}
          </Select>
        </Field>
        <Field label="Passend bij" className="md:w-44">
          <Select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">Alle</option>
            {Object.entries(TEST_REGION_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Bron" className="md:w-40">
          <Select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">Alle</option>
            <option value="eigen">Eigen praktijk</option>
            <option value="reva">REVA-bibliotheek</option>
          </Select>
        </Field>
      </FilterBar>

      <div className="rounded-2xl border overflow-hidden" style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Laden…</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Gauge} title="Geen testen gevonden" description="Pas de filters aan of maak een eigen test." />
        ) : (
          <ResponsiveList
            rows={filtered}
            rowKey={(t) => t.id}
            rowLabel={(t) => t.name}
            columns={COLUMNS}
            onRowClick={canManage ? (t) => setEditing({ test: t, copy: t.scope === "reva" }) : undefined}
            card={(t) => (
              <div className="min-w-0">
                <p className="font-medium text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{TEST_CATEGORY_LABELS[t.category]} · {t.unit}{t.bilateral ? " · links/rechts" : ""}</p>
                <div className="mt-1.5"><SourceBadge t={t} /></div>
              </div>
            )}
            actions={canManage ? (t) => t.scope === "organization"
              ? [
                  { label: "Bewerken", onClick: () => setEditing({ test: t, copy: false }) },
                  { label: t.archived ? "Dearchiveren" : "Archiveren", onClick: async () => {
                    const { error } = await setLibraryTestArchived(t.id, !t.archived);
                    if (error) showToast(error, "error"); else { showToast(t.archived ? "Test weer actief" : "Test gearchiveerd"); refresh(); }
                  } },
                  { label: "Verwijderen", danger: true, onClick: () => setConfirmDelete(t) },
                ]
              : [{ label: "Kopiëren naar eigen praktijk", onClick: () => setEditing({ test: t, copy: true }) }]
              : undefined}
          />
        )}
      </div>

      {editing && membership && (
        <LibraryTestModal
          initial={editing.test}
          title={editing.copy ? "Kopie als eigen test" : editing.test ? "Test bewerken" : "Eigen test"}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            const { error } = editing.test && !editing.copy
              ? await updateLibraryTest(editing.test.id, input)
              : await createLibraryTest(membership.organizationId, input);
            if (error) return error;
            setEditing(null);
            showToast(editing.test && !editing.copy ? "Test bijgewerkt" : "Test toegevoegd aan de praktijk");
            refresh();
            return null;
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Test verwijderen?"
          message={`"${confirmDelete.name}" verdwijnt uit de bibliotheek. Bij patiënten waar de test al is toegevoegd, blijven de test en de metingen bewaard.`}
          confirmLabel="Verwijderen"
          danger
          onCancel={() => setConfirmDelete(null)}
          onConfirm={async () => {
            const t = confirmDelete;
            setConfirmDelete(null);
            const { error } = await deleteLibraryTest(t.id);
            if (error) showToast(error, "error"); else { showToast("Test verwijderd"); refresh(); }
          }}
        />
      )}
      {toastNode}
    </div>
  );
}
