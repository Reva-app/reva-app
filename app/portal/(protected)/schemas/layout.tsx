import { ClinicalRoleGate } from "@/components/portal/ClinicalRoleGate";

export default function ClinicalLayout({ children }: { children: React.ReactNode }) {
  return <ClinicalRoleGate>{children}</ClinicalRoleGate>;
}
