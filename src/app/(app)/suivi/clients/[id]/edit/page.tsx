import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SvClientForm } from "@/components/suivi/client-form";

export const metadata: Metadata = { title: "Modifier client · Suivi" };

export default async function SuiviClientEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.clients.manage");
  const { id } = await params;
  const client = await prisma.svClient.findUnique({ where: { id } });
  if (!client) notFound();

  return (
    <PageShell>
      <PageHeader
        title="Modifier le client"
        description={client.name}
        backHref={`/suivi/clients/${client.id}`}
      />
      <SvClientForm mode="edit" clientId={client.id} initial={client} />
    </PageShell>
  );
}
