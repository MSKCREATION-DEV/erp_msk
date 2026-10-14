import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { canReassignCrmDeal } from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import { prisma } from "@/lib/prisma";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/crm/labels";
import { normalizeUiStage } from "@/lib/crm/guide-rules";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { AssignmentResolveActions } from "@/components/crm/assignment-resolve-actions";
import { AssignProspectForm } from "@/components/crm/assign-prospect-form";

export const metadata: Metadata = { title: "Affectations" };

const OPEN_STAGES = STAGE_ORDER.filter((s) => s !== "GAGNE");

export default async function CrmAffectationsPage() {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");
  if (!canReassignCrmDeal(user)) redirect("/crm/prospects");

  const teamIds = await commercialTeamUserIds();
  const memberIds = [...new Set([user.id, ...teamIds])];

  const [commercials, assignableDeals, pending, recent] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: memberIds }, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.crmOpportunity.findMany({
      where: {
        stage: { in: [...OPEN_STAGES, "NEGOCIATION"] },
        comClients: { none: {} },
      },
      select: {
        id: true,
        ownerId: true,
        organization: { select: { name: true } },
        owner: { select: { firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    }),
    prisma.crmAssignmentRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        requester: { select: { firstName: true, lastName: true, email: true } },
        opportunity: {
          select: {
            id: true,
            stage: true,
            title: true,
            ownerId: true,
            organization: { select: { name: true } },
            owner: { select: { firstName: true, lastName: true } },
          },
        },
      },
      take: 100,
    }),
    prisma.crmAssignmentRequest.findMany({
      where: { status: { in: ["APPROVED", "REJECTED", "CANCELLED"] } },
      orderBy: { resolvedAt: "desc" },
      take: 20,
      include: {
        requester: { select: { firstName: true, lastName: true } },
        resolvedBy: { select: { firstName: true, lastName: true } },
        opportunity: {
          select: {
            id: true,
            organization: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const prospectOpts = assignableDeals.map((d) => ({
    id: d.id,
    label: d.organization.name,
    ownerId: d.ownerId,
    ownerLabel: `${d.owner.firstName} ${d.owner.lastName}`,
  }));

  return (
    <PageShell>
      <PageHeader
        title="Affectations"
        description="Affectez un prospect à un commercial, ou traitez les demandes de reprise de suivi."
        backHref="/commercial"
        backLabel="Retour Commercial"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Affectations" },
        ]}
        actions={
          <AssignProspectForm
            commercials={commercials}
            prospects={prospectOpts}
            triggerLabel="Affecter un prospect"
            triggerVariant="primary"
          />
        }
      />

      <Surface className="overflow-hidden p-0">
        <div className="border-b border-msk-ink/[0.06] bg-msk-chalk/40 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-msk-ink">
            Demandes en attente
            <Badge tone={pending.length > 0 ? "coral" : "muted"} className="ml-2">
              {pending.length}
            </Badge>
          </h2>
        </div>
        {pending.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-msk-ink/40">
            Aucune demande en attente.
          </p>
        ) : (
          <ul className="divide-y divide-msk-ink/[0.06]">
            {pending.map((r) => {
              const uiStage = normalizeUiStage(r.opportunity.stage);
              return (
                <li
                  key={r.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <Link
                      prefetch={false}
                      href={`/crm/prospects/${r.opportunity.id}`}
                      className="font-semibold text-msk-ink hover:text-msk-blue"
                    >
                      {r.opportunity.organization.name}
                    </Link>
                    <p className="text-xs text-msk-ink/55">
                      Demandeur : {r.requester.firstName} {r.requester.lastName}
                      {" · "}
                      Suivi actuel : {r.opportunity.owner.firstName}{" "}
                      {r.opportunity.owner.lastName}
                    </p>
                    <p className="text-xs text-msk-ink/45">
                      {STAGE_LABELS[uiStage]} ·{" "}
                      {r.createdAt.toLocaleString("fr-FR")}
                    </p>
                    {r.message ? (
                      <p className="text-sm text-msk-ink/75">{r.message}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <AssignmentResolveActions requestId={r.id} />
                    <AssignProspectForm
                      commercials={commercials}
                      opportunityId={r.opportunity.id}
                      currentOwnerId={r.opportunity.ownerId}
                      prospects={[
                        {
                          id: r.opportunity.id,
                          label: r.opportunity.organization.name,
                          ownerId: r.opportunity.ownerId,
                          ownerLabel: `${r.opportunity.owner.firstName} ${r.opportunity.owner.lastName}`,
                        },
                      ]}
                      triggerLabel="Affecter à un autre"
                      triggerSize="sm"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Surface>

      {recent.length > 0 ? (
        <Surface className="overflow-hidden p-0">
          <div className="border-b border-msk-ink/[0.06] bg-msk-chalk/40 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-msk-ink">Récentes</h2>
          </div>
          <ul className="divide-y divide-msk-ink/[0.06]">
            {recent.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <Link
                    prefetch={false}
                    href={`/crm/prospects/${r.opportunity.id}`}
                    className="font-medium text-msk-ink hover:text-msk-blue"
                  >
                    {r.opportunity.organization.name}
                  </Link>
                  <p className="text-xs text-msk-ink/45">
                    {r.requester.firstName} {r.requester.lastName}
                    {r.resolvedBy
                      ? ` · traité par ${r.resolvedBy.firstName}`
                      : ""}
                  </p>
                </div>
                <Badge
                  tone={
                    r.status === "APPROVED"
                      ? "success"
                      : r.status === "REJECTED"
                        ? "coral"
                        : "muted"
                  }
                >
                  {r.status === "APPROVED"
                    ? "Approuvée"
                    : r.status === "REJECTED"
                      ? "Refusée"
                      : "Annulée"}
                </Badge>
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}
    </PageShell>
  );
}
