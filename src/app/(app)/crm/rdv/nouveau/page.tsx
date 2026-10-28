import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { canMutateCrmDeal } from "@/lib/crm/scope";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { AppointmentForm } from "@/components/crm/appointment-form";

export const metadata: Metadata = { title: "Nouveau RDV" };

export default async function CrmRdvNouveauPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser({ permission: "crm.activity.log" });
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const sp = await searchParams;
  const opportunityId =
    typeof sp.opportunityId === "string" ? sp.opportunityId : "";

  let opportunityLabel: string | undefined;
  if (opportunityId) {
    const deal = await prisma.crmOpportunity.findUnique({
      where: { id: opportunityId },
      select: {
        ownerId: true,
        organization: { select: { name: true } },
      },
    });
    if (!deal || !canMutateCrmDeal(user, deal.ownerId)) {
      redirect("/crm/rdv");
    }
    opportunityLabel = deal.organization.name;
  }

  return (
    <PageShell>
      <PageHeader
        title="Nouveau RDV"
        description="Planifiez un rendez-vous lié à un prospect."
        backHref="/crm/rdv"
        backLabel="Retour RDV"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "RDV", href: "/crm/rdv" },
          { label: "Nouveau" },
        ]}
      />
      <AppointmentForm
        opportunityId={opportunityId || undefined}
        opportunityLabel={opportunityLabel}
      />
    </PageShell>
  );
}
