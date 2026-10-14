import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { canMutateCrmDeal } from "@/lib/crm/scope";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { ProspectEditForm } from "@/components/crm/prospect-edit-form";
import { isTestOrgName } from "@/lib/crm/test-data";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Modifier le prospect" };

export default async function CrmProspectEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "crm.prospect.edit_own") && !user.isSuperAdmin) {
    redirect("/crm/prospects");
  }

  const { id } = await params;
  const deal = await prisma.crmOpportunity.findUnique({
    where: { id },
    include: {
      organization: {
        include: {
          contacts: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
  });
  if (!deal) notFound();

  if (!hasPermission(user, "crm.access") && !user.isSuperAdmin) {
    redirect("/crm/prospects");
  }

  /** LOT-E : édition réservée à l’affecté (+ admin / direction). */
  const canEdit =
    canMutateCrmDeal(user, deal.ownerId) &&
    (user.isSuperAdmin || hasPermission(user, "crm.prospect.edit_own"));

  if (!canEdit) redirect(`/crm/prospects/${deal.id}`);

  const primary = deal.organization.contacts[0];
  const followUpAt = deal.followUpAt
    ? deal.followUpAt.toISOString().slice(0, 10)
    : "";

  return (
    <PageShell>
      <PageHeader
        title="Modifier le prospect"
        description={deal.organization.name}
        backHref={`/crm/prospects/${deal.id}`}
        backLabel="Retour à la fiche"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Prospects", href: "/crm/prospects" },
          { label: deal.organization.name, href: `/crm/prospects/${deal.id}` },
          { label: "Modifier" },
        ]}
        actions={
          isTestOrgName(deal.organization.name) ? (
            <Badge tone="coral">TEST</Badge>
          ) : null
        }
      />
      <ProspectEditForm
        initial={{
          opportunityId: deal.id,
          orgName: deal.organization.name,
          sector: deal.organization.sector ?? "",
          city: deal.organization.city ?? "",
          country: deal.organization.country ?? "ML",
          website: deal.organization.website ?? "",
          notes: deal.organization.notes ?? "",
          source: deal.organization.source ?? deal.source,
          contactFirst: primary?.firstName ?? "",
          contactLast:
            primary?.lastName && primary.lastName !== "—"
              ? primary.lastName
              : "",
          jobTitle: primary?.jobTitle ?? "",
          phone: primary?.phone ?? "",
          email: primary?.email ?? "",
          budgetXof:
            deal.budgetXof != null ? String(deal.budgetXof) : "",
          nextAction: deal.nextAction ?? "",
          followUpAt,
        }}
      />
    </PageShell>
  );
}
