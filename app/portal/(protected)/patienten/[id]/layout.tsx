import { ClinicalRoleGate } from "@/components/portal/ClinicalRoleGate";
import { PatientViewLogger } from "@/components/portal/PatientViewLogger";

export default function ClinicalLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClinicalRoleGate>
      <PatientViewLogger />
      {children}
    </ClinicalRoleGate>
  );
}
