import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import {
  canMutateCrmDeal,
  canReassignCrmDeal,
} from "@/lib/crm/scope";
import { OPEN_PIPELINE_STAGES, STAGE_LABELS } from "@/lib/crm/labels";
import { normalizeUiStage } from "@/lib/crm/guide-rules";
import { formatContactLabel } from "@/lib/crm/contact-label";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { AppointmentForm } from "@/components/crm/appointment-form";
import type { ProspectSelectRow } from "@/components/crm/prospect-select-table";

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

  let prospects: ProspectSelectRow[] = [];
  if (!opportunityId) {
    const canSeeAll =
      user.isSuperAdmin ||
      canReassignCrmDeal(user) ||
      hasPermission(user, "crm.reports.global");
    const deals = await prisma.crmOpportunity.findMany({
      where: {
        stage: { in: [...OPEN_PIPELINE_STAGES] },
        ...(canSeeAll ? {} : { ownerId: user.id }),
      },
      select: {
        id: true,
        stage: true,
        ownerId: true,
        organization: {
          select: {
            name: true,
            contacts: {
              orderBy: [
                { isPrimary: "desc" as const },
                { createdAt: "asc" as const },
              ],
              take: 1,
              select: { firstName: true, lastName: true },
            },
          },
        },
        owner: { select: { firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });

    prospects = deals
      .filter((d) => canMutateCrmDeal(user, d.ownerId))
      .map((d) => {
        const contact = d.organization.contacts[0];
        const uiStage = normalizeUiStage(d.stage);
        return {
          id: d.id,
          orgName: d.organization.name,
          stageLabel: STAGE_LABELS[uiStage],
          ownerLabel: `${d.owner.firstName} ${d.owner.lastName}`,
          contactLabel: contact
            ? formatContactLabel(contact.firstName, contact.lastName)
            : null,
        };
      });
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
        prospects={prospects}
      />
    </PageShell>
  );
}
