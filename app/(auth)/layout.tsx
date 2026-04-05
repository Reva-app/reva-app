// Auth pages get a minimal layout — no sidebar, no nav, no FAB
export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
