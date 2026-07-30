"use client";

import { Check } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import type { PatientActiveProtocol } from "@/lib/services/patientProtocolService";

/**
 * Vervangt Doelstellingen/Mijlpalen zodra een patiënt een protocol
 * toegewezen heeft gekregen: criteria en mijlpalen komen nu van het
 * protocol en worden door de fysiotherapeut afgevinkt, niet meer door de
 * patiënt zelf ingevoerd.
 */
export function ProtocolGoalsView({ protocol }: { protocol: PatientActiveProtocol }) {
  const phase = protocol.currentPhase;

  if (!phase) {
    return (
      <Card>
        <p className="text-sm text-gray-400">Je fysiotherapeut is nog bezig je volgende fase klaar te zetten.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium" style={{ color: "var(--brand-accent, #e8632a)" }}>{protocol.name}</p>
        <h1 className="text-xl font-semibold text-gray-900 mt-0.5">{phase.name}</h1>
        {phase.description && <p className="text-sm text-gray-500 mt-1">{phase.description}</p>}
      </div>

      {phase.criteria.length > 0 && (
        <Card>
          <CardHeader title="Criteria voor de volgende fase" subtitle="Je fysiotherapeut beoordeelt en vinkt deze af" />
          <div className="space-y-2">
            {phase.criteria.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: c.met ? "#16a34a" : "#e8e5df" }}
                >
                  {c.met && <Check size={10} className="text-white" />}
                </span>
                <span className={c.met ? "text-gray-700" : "text-gray-400"}>{c.description}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {phase.milestones.length > 0 && (
        <Card>
          <CardHeader title="Mijlpalen" />
          <div className="space-y-2">
            {phase.milestones.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-sm">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: m.completed ? "#16a34a" : "#e8e5df" }}
                >
                  {m.completed && <Check size={10} className="text-white" />}
                </span>
                <span className={m.completed ? "text-gray-700" : "text-gray-400"}>{m.title}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {phase.educationItems.length > 0 && (
        <Card>
          <CardHeader title="Goed om te weten" />
          <div className="space-y-2">
            {phase.educationItems.map((e) => (
              <div key={e.id} className="rounded-xl p-3" style={{ background: "#f8f7f4" }}>
                <p className="text-sm font-medium text-gray-800">{e.title}</p>
                {e.body && <p className="text-xs text-gray-500 mt-1">{e.body}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
