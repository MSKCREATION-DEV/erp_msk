import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { FileUp, UserPlus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { runSeries } from "@/lib/db/serial";
import {
  crmVisibility,
  dealOwnerScopeWhere,
} from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import {
  outreachCountByOpportunityIds,
  sumOutreachCounts,
} from "@/lib/crm/follow-up-count";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ActionLink } from "@/components/ui/action-link";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { ProspectsFilterButton } from "@/components/crm/prospects-filter-modal";
import { KpiRadial } from "@/components/crm/kpi-radial";
import { ProspectsResults } from "./prospects-results";

export const metadata: Metadata = { title: "Prospects" };

/**
 * Shell sync-ish : auth + KPIs own (indépendants de `q`).
 * Résultats filtrés dans Suspense — l’input ne démonte pas à chaque frappe.
 */
export default async function CrmProspectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const teamIds = await commercialTeamUserIds();
  const now = new Date();
  const vis = crmVisibility(user);
  const ownScope = dealOwnerScopeWhere(user, teamIds);
  const showOwnKpis = vis === "own";
  const openOwn: Prisma.CrmOpportunityWhereInput = {
    ...ownScope,
    stage: { notIn: ["GAGNE", "PERDU"] },
    comClients: { none: {} },
  };

  let ownKpis: {
    prospects: number;
    interesses: number;
    retards: number;
    relancesFaites: number;
  } | null = null;
  if (showOwnKpis) {
    const ownOpenIds = (
      await prisma.crmOpportunity.findMany({
        where: openOwn,
        select: { id: true },
        take: 2000,
      })
    ).map((d) => d.id);
    const ownOutreachMap = await outreachCountByOpportunityIds(ownOpenIds);
    const [prospects, interesses, retards] = await runSeries([
      () => prisma.crmOpportunity.count({ where: openOwn }),
      () =>
        prisma.crmOpportunity.count({
          where: { ...openOwn, stage: "INTERESSE" },
        }),
      () =>
        prisma.crmOpportunity.count({
          where: { ...openOwn, followUpAt: { lt: now } },
        }),
    ]);
    ownKpis = {
      prospects,
      interesses,
      retards,
      relancesFaites: sumOutreachCounts(ownOutreachMap),
    };
  }

  const teamUsers = await prisma.user.findMany({
    where: {
      id: { in: Array.from(new Set([user.id, ...teamIds])) },
      status: "ACTIVE",
    },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });
  const owners = teamUsers.map((u) => ({
    value: u.id,
    label: `${u.firstName} ${u.lastName}`,
  }));

  const canCreate = hasPermission(user, "crm.prospect.create");

  return (
    <PageShell>
      <PageHeader
        title="Prospects"
        backHref="/commercial"
        backLabel="Retour Commercial"
        breadcrumbs={[{ label: "Commercial", href: "/commercial" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {hasPermission(user, "crm.import") ? (
              <ActionLink href="/crm/prospects/import" icon={FileUp}>
                Importer
              </ActionLink>
            ) : null}
            {canCreate ? (
              <ActionLink href="/crm/prospects/nouveau" icon={UserPlus}>
                Nouveau prospect
              </ActionLink>
            ) : null}
          </div>
        }
      />

      {ownKpis ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiRadial
            label="Prospects"
            value={ownKpis.prospects}
            hint="dossiers suivis"
          />
          <KpiRadial
            label="Intéressés"
            value={ownKpis.interesses}
            hint="à convertir"
          />
          <KpiRadial
            label="Retards"
            value={ownKpis.retards}
            tone={ownKpis.retards > 0 ? "coral" : "blue"}
            hint="relances dues"
          />
          <KpiRadial
            label="Relances faites"
            value={ownKpis.relancesFaites}
            hint="actions de suivi journalisées"
          />
        </div>
      ) : null}

      <Surface className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-msk-ink/6 px-4 py-3">
          <Suspense
            fallback={
              <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />
            }
          >
            <ListSearchForm
              placeholder="Rechercher entreprise, contact, téléphone…"
              className="sm:max-w-md"
            />
          </Suspense>
          <Suspense fallback={null}>
            <ProspectsFilterButton owners={owners} />
          </Suspense>
        </div>

        <Suspense fallback={<ListTableSkeleton rows={10} cols={11} />}>
          <ProspectsResults searchParams={searchParams} />
        </Suspense>
      </Surface>
    </PageShell>
  );
}
