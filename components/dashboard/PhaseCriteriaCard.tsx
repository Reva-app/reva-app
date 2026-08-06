import { Check, Minus } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import type { PatientProtocolCriterionView } from "@/lib/services/patientProtocolService";

interface PhaseCriteriaCardProps {
  criteria: PatientProtocolCriterionView[];
}

/**
 * "Voortgangscriteria"-kaart: de klinische criteria (o.a. gevalideerde
 * testen, zie migratie 107) om naar de volgende fase te mogen. Deze data
 * bestond al (protocolPhase.criteria, ook gebruikt op /analyse als
 * geaggregeerd getal), maar stond nergens als leesbare lijst op het
 * dashboard zelf.
 */
export function PhaseCriteriaCard({ criteria }: PhaseCriteriaCardProps) {
  if (criteria.length === 0) return null;

  return (
    <Card>
      <CardHeader title="Voortgangscriteria" subtitle="Om naar de volgende fase te gaan" />
      <div className="space-y-2.5">
        {criteria.map((c) => (
          <div key={c.id} className="flex items-start gap-2">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: c.met ? "#16a34a" : "#ffffff", border: c.met ? "none" : "1px solid #d1d5db" }}
            >
              {c.met ? <Check size={10} className="text-white" strokeWidth={3} /> : <Minus size={9} style={{ color: "#9ca3af" }} />}
            </div>
            <p className={c.met ? "text-xs text-gray-500 leading-snug line-through" : "text-xs text-gray-700 leading-snug"}>
              {c.description}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
