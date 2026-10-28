import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { canReassignCrmDeal } from "@/lib/crm/scope";
import { listCommercialRoster } from "@/lib/crm/team";
import { prisma } from "@/lib/prisma";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/crm/labels";
import { normalizeUiStage } from "@/lib/crm/guide-rules";
import { firstSearchParam } from "@/lib/crm/scope-period";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { AssignmentResolveActions } from "@/components/crm/assignment-resolve-actions";
import { AssignProspectForm } from "@/components/crm/assign-prospect-form";
import { AffectationsLive } from "@/components/crm/affectations-live";

export const metadata: Metadata = { title: "Affectations" };

const OPEN_STAGES = STAGE_ORDER.filter((s) => s !== "GAGNE");

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Refusée",
  CANCELLED: "Annulée",
};

export default async function CrmAffectationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");
  if (!canReassignCrmDeal(user)) redirect("/crm/prospects");

  const sp = await searchParams;
  const q = (firstSearchParam(sp.q) ?? "").trim().toLowerCase();
  const statusFilter = firstSearchParam(sp.statut)?.toUpperCase();

  const [commercials, assignableDeals, pending, recent] = await Promise.all([
    listCommercialRoster({ mode: "assign", extraIds: [user.id] }).then((rows) =>
      rows.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
      })),
    ),
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
      where: {
        status: {
          in:
            statusFilter === "APPROVED" ||
            statusFilter === "REJECTED" ||
            statusFilter === "CANCELLED"
              ? [statusFilter]
              : ["APPROVED", "REJECTED", "CANCELLED"],
        },
      },
      orderBy: { resolvedAt: "desc" },
      take: 50,
      include: {
        requester: { select: { firstName: true, lastName: true } },
        resolvedBy: { select: { firstName: true, lastName: true } },
        opportunity: {
          select: {
            id: true,
            organization: { select: { name: true } },
            owner: { select: { firstName: true, lastName: true } },
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

  const filterText = (name: string, a: string, b?: string | null) => {
    if (!q) return true;
    const hay = `${name} ${a} ${b ?? ""}`.toLowerCase();
    return hay.includes(q);
  };

  const pendingFiltered = pending.filter((r) =>
    filterText(
      r.opportunity.organization.name,
      `${r.requester.firstName} ${r.requester.lastName}`,
      `${r.opportunity.owner.firstName} ${r.opportunity.owner.lastName}`,
    ),
  );
  const recentFiltered = recent.filter((r) =>
    filterText(
      r.opportunity.organization.name,
      `${r.requester.firstName} ${r.requester.lastName}`,
      r.resolvedBy
        ? `${r.resolvedBy.firstName} ${r.resolvedBy.lastName}`
        : null,
    ),
  );

  const statutLinks = [
    { id: "", label: "Toutes" },
    { id: "APPROVED", label: "Approuvées" },
    { id: "REJECTED", label: "Refusées" },
    { id: "CANCELLED", label: "Annulées" },
  ] as const;

  return (
    <PageShell>
      <AffectationsLive userId={user.id} />
      <PageHeader
        title="Affectations"
        description="Demandes de reprise de suivi et historique des décisions."
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

      <div className="flex flex-wrap items-center gap-3">
        <Suspense
          fallback={
            <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />
          }
        >
          <ListSearchForm
            placeholder="Rechercher prospect, demandeur, validateur…"
            className="sm:max-w-md"
          />
        </Suspense>
      </div>

      <Surface className="overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 bg-msk-chalk/40 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-msk-ink">
            Demandes en attente
            <Badge
              tone={pendingFiltered.length > 0 ? "coral" : "muted"}
              className="ml-2"
            >
              {pendingFiltered.length}
            </Badge>
          </h2>
        </div>
        {pendingFiltered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-msk-ink/40">
            {q
              ? `Aucune demande en attente pour « ${q} ».`
              : "Aucune demande en attente."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-200 text-left text-sm">
              <thead className="border-b border-msk-ink/8 bg-msk-chalk/50 text-[11px] uppercase tracking-wide text-msk-ink/40">
                <tr>
                  <th className="px-4 py-3 font-semibold">Prospect</th>
                  <th className="px-4 py-3 font-semibold">Demandeur</th>
                  <th className="px-4 py-3 font-semibold">Suivi actuel</th>
                  <th className="px-4 py-3 font-semibold">Créée le</th>
                  <th className="px-4 py-3 font-semibold">Statut CRM</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-msk-ink/6">
                {pendingFiltered.map((r) => {
                  const uiStage = normalizeUiStage(r.opportunity.stage);
                  return (
                    <tr key={r.id} className="align-top">
                      <td className="px-4 py-3">
                        <Link
                          prefetch={false}
                          href={`/crm/prospects/${r.opportunity.id}`}
                          className="font-semibold text-msk-ink hover:text-msk-blue"
                        >
                          {r.opportunity.organization.name}
                        </Link>
                        {r.message ? (
                          <p className="mt-1 text-xs text-msk-ink/55">
                            {r.message}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-msk-ink/70">
                        {r.requester.firstName} {r.requester.lastName}
                      </td>
                      <td className="px-4 py-3 text-msk-ink/70">
                        {r.opportunity.owner.firstName}{" "}
                        {r.opportunity.owner.lastName}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-msk-ink/55">
                        {r.createdAt.toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="muted">{STAGE_LABELS[uiStage]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Surface>

      <Surface className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-msk-ink/6 bg-msk-chalk/40 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-msk-ink">Historique</h2>
          <div className="flex flex-wrap gap-1.5">
            {statutLinks.map((s) => {
              const active = (statusFilter ?? "") === s.id;
              const href = s.id
                ? `/crm/affectations?statut=${s.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`
                : q
                  ? `/crm/affectations?q=${encodeURIComponent(q)}`
                  : "/crm/affectations";
              return (
                <Link
                  key={s.id || "all"}
                  prefetch={false}
                  href={href}
                  className={
                    active
                      ? "rounded-lg bg-msk-blue px-2.5 py-1 text-xs font-medium text-white"
                      : "rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-msk-ink/55 hover:bg-msk-chalk"
                  }
                >
                  {s.label}
                </Link>
              );
            })}
          </div>
        </div>
        {recentFiltered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-msk-ink/40">
            {q
              ? `Aucune affectation pour « ${q} » dans cet historique.`
              : "Aucune affectation dans cet historique."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-200 text-left text-sm">
              <thead className="border-b border-msk-ink/8 bg-msk-chalk/50 text-[11px] uppercase tracking-wide text-msk-ink/40">
                <tr>
                  <th className="px-4 py-3 font-semibold">Prospect</th>
                  <th className="px-4 py-3 font-semibold">Demandeur</th>
                  <th className="px-4 py-3 font-semibold">Décidé par</th>
                  <th className="px-4 py-3 font-semibold">Créée</th>
                  <th className="px-4 py-3 font-semibold">Décidée</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-msk-ink/6">
                {recentFiltered.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <Link
                        prefetch={false}
                        href={`/crm/prospects/${r.opportunity.id}`}
                        className="font-medium text-msk-ink hover:text-msk-blue"
                      >
                        {r.opportunity.organization.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-msk-ink/65">
                      {r.requester.firstName} {r.requester.lastName}
                    </td>
                    <td className="px-4 py-3 text-msk-ink/65">
                      {r.resolvedBy
                        ? `${r.resolvedBy.firstName} ${r.resolvedBy.lastName}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-msk-ink/50">
                      {r.createdAt.toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-msk-ink/50">
                      {r.resolvedAt
                        ? r.resolvedAt.toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          r.status === "APPROVED"
                            ? "success"
                            : r.status === "REJECTED"
                              ? "coral"
                              : "muted"
                        }
                      >
                        {STATUS_LABEL[r.status] ?? r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>
    </PageShell>
  );
}
