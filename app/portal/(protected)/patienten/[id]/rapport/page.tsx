"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileDown, Info } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { ProgressReport, REPORT_SECTION_LABELS, type ProgressReportData, type ReportSection } from "@/components/portal/report/ProgressReport";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { createClient } from "@/lib/supabaseClient";
import { loadPortalPatients, loadPortalPatientExtras, loadPatientCheckinHistory, loadPortalBranding } from "@/lib/services/portalService";
import { loadPatientProtocolAssignment, loadPatientTrainingLogs } from "@/lib/services/protocolService";
import { loadPatientTests } from "@/lib/services/testService";
import { logPatientView } from "@/lib/services/auditService";

const ALL: ReportSection[] = ["samenvatting", "verloop", "herstelplan", "testen", "training", "toelichting"];

/**
 * Voortgangsrapport van een patiënt: onderdelen kiezen, een toelichting
 * schrijven en opslaan als PDF via het printvenster van de browser.
 */
export default function PatientReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = use(params);
  const { membership } = usePortalMembership();
  const [data, setData] = useState<ProgressReportData | null>(null);
  const [error, setError] = useState(false);
  const [sections, setSections] = useState<Set<ReportSection>>(new Set(ALL));
  const [note, setNote] = useState("");
  const [now] = useState(() => Date.now());
  const previewRef = useRef<HTMLDivElement>(null);

  // Bij printen rekent de browser de pagina opnieuw uit op A4-breedte; het
  // portaal schakelt dan naar de mobiele opmaak en bouwt de pagina opnieuw
  // op. Daarom printen we een vaste kopie van het voorbeeld, los van React.
  function preparePrintCopy() {
    document.querySelectorAll(".reva-print-only").forEach((n) => n.remove());
    if (!previewRef.current) return;
    const copy = document.createElement("div");
    copy.className = "reva-print-only";
    copy.innerHTML = previewRef.current.innerHTML;
    document.body.appendChild(copy);
  }
  useEffect(() => () => { document.querySelectorAll(".reva-print-only").forEach((n) => n.remove()); }, []);
  // Ook bij Cmd/Ctrl+P de actuele versie printen.
  useEffect(() => {
    const before = () => preparePrintCopy();
    window.addEventListener("beforeprint", before);
    return () => window.removeEventListener("beforeprint", before);
  });

  useEffect(() => {
    if (!membership) return;
    let cancelled = false;
    const orgId = membership.organizationId;
    (async () => {
      const patients = await loadPortalPatients(orgId);
      const patient = patients.find((p) => p.id === patientId);
      if (!patient) { if (!cancelled) setError(true); return; }
      const since28 = new Date(now - 28 * 86_400_000).toISOString().slice(0, 10);
      const [checkins, assignment, tests, logs, extras, branding, org] = await Promise.all([
        loadPatientCheckinHistory(patientId),
        loadPatientProtocolAssignment(patientId),
        loadPatientTests(patientId),
        loadPatientTrainingLogs(patientId, patient.createdAt.slice(0, 10)),
        loadPortalPatientExtras(patientId),
        loadPortalBranding(orgId),
        createClient().from("organizations").select("name, address_street, address_postal_code, address_city, contact_phone, contact_email").eq("id", orgId).maybeSingle(),
      ]);
      void logPatientView(patientId);
      if (cancelled) return;
      const o = org.data;
      setData({
        practice: {
          name: branding?.name ?? o?.name ?? membership.organizationName,
          logoUrl: branding?.logoUrl ?? null,
          addressLine: o ? [o.address_street, [o.address_postal_code, o.address_city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null : null,
          phone: o?.contact_phone ?? null,
          email: o?.contact_email ?? null,
        },
        patient,
        checkins,
        assignment,
        tests,
        sessions28: logs.sessions.filter((s) => s.date >= since28),
        sessionsTotal: logs.sessions.length,
        mainGoal: extras.mainGoal,
      });
    })();
    return () => { cancelled = true; };
  }, [membership, patientId, now]);

  function toggle(s: ReportSection) {
    setSections((cur) => { const n = new Set(cur); if (n.has(s)) n.delete(s); else n.add(s); return n; });
  }

  if (error) return <p className="p-6 text-sm text-subtle">Patiënt niet gevonden.</p>;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <Link href={`/portal/patienten/${patientId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft size={14} /> Terug naar dossier</Link>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader title="Voortgangsrapport" subtitle={data ? `${data.patient.fullName ?? "Patiënt"} · in de huisstijl van ${data.practice.name}` : "Laden…"} />
        <Button onClick={() => { preparePrintCopy(); window.print(); }} disabled={!data}><FileDown size={15} /> Opslaan als PDF</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">
        <Card className="lg:sticky lg:top-4">
          <p className="text-sm font-semibold text-gray-900 mb-2">Onderdelen</p>
          <div className="space-y-1.5">
            {ALL.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" className="rounded" checked={sections.has(s)} onChange={() => toggle(s)} />
                {REPORT_SECTION_LABELS[s]}
              </label>
            ))}
          </div>
          {sections.has("toelichting") && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-900 mb-1.5">Toelichting</p>
              <Textarea rows={6} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bijv. beloop, bevindingen, advies en vervolg. Komt in het rapport onder je naam." />
            </div>
          )}
          <p className="text-xs text-gray-500 mt-4 flex gap-1.5"><Info size={13} className="shrink-0 mt-0.5" /> Kies in het printvenster bij &lsquo;Bestemming&rsquo; voor &lsquo;Opslaan als PDF&rsquo;.</p>
        </Card>

        <div className="rounded-2xl bg-white border p-6 sm:p-10 overflow-x-auto" style={{ borderColor: "#e8e5df", boxShadow: "0 8px 30px rgba(0,0,0,0.06)" }}>
          {data ? <div ref={previewRef}><ProgressReport data={data} sections={sections} note={note} today={now} /></div> : <p className="text-sm text-subtle">Rapport samenstellen…</p>}
        </div>
      </div>

    </div>
  );
}
