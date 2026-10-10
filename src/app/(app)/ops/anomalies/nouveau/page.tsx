import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { TicketForm } from "@/components/ops/ticket-form";

export const metadata: Metadata = { title: "Nouvelle anomalie" };

export default async function OpsAnomalieNouveauPage() {
  const user = await requireUser();
  if (
    !hasPermission(user, "ops.ticket.create") &&
    !hasPermission(user, "ops.ticket.manage")
  ) {
    redirect("/ops/anomalies");
  }

  const users = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { lastName: "asc" },
    take: 100,
  });

  return (
    <PageShell>
      <PageHeader
        title="Nouvelle anomalie"
        description="Signalement équipement / zone — assignation et priorité."
        backHref="/ops/anomalies"
        backLabel="Retour anomalies"
        breadcrumbs={[
          { label: "Anomalies", href: "/ops/anomalies" },
          { label: "Nouveau" },
        ]}
      />
      <Surface className="max-w-lg p-5">
        <TicketForm users={users} />
      </Surface>
    </PageShell>
  );
}
