import { PortalLayout } from "@/components/layout/PortalLayout";

export default function PortalGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalLayout>{children}</PortalLayout>;
}
