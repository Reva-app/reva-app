import { redirect } from "next/navigation";

export default async function BibliotheekSchemaRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/portal/schemas/${id}`);
}
