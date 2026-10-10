import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CrmPipelineStage, CrmTaskStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { dealOwnerScopeWhere } from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import { formatXof, STAGE_LABELS, STAGE_ORDER } from "@/lib/crm/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { KpiGrid } from "@/components/ui/kpi-card";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
export const metadata: Metadata = { title: "CRM" };

const linkBtn =
  "inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition";
const linkPrimary = `${linkBtn} bg-msk-blue text-white hover:bg-msk-blue/90`;
const linkSecondary = `${linkBtn} border border-msk-ink/15 bg-white text-msk-ink hover:bg-msk-chalk`;

export default async function CrmDashboardPage() {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const teamIds = await commercialTeamUserIds();
  const scope = dealOwnerScopeWhere(user, teamIds);

  const [deals, openTasks, overdue] = await Promise.all([
    prisma.crmOpportunity.findMany({
      where: scope,
      include: { organization: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    prisma.crmTask.count({
      where: {
        status: CrmTaskStatus.OPEN,
        assigneeId:
          hasPermission(user, "crm.reports.global") || user.isSuperAdmin
            ? undefined
            : user.id,
      },
    }),
    prisma.crmTask.count({
      where: {
        status: CrmTaskStatus.OPEN,
        dueAt: { lt: new Date() },
        assigneeId:
          hasPermission(user, "crm.reports.global") || user.isSuperAdmin
            ? undefined
            : user.id,
      },
    }),
  ]);

  const openDeals = deals.filter(
    (d) => d.stage !== "GAGNE" && d.stage !== "PERDU",
  );
  const won = deals.filter((d) => d.stage === "GAGNE");
  const pipelineXof = openDeals.reduce((s, d) => s + (d.budgetXof ?? 0), 0);
  const wonXof = won.reduce((s, d) => s + (d.budgetXof ?? 0), 0);

  const byStage = STAGE_ORDER.map((stage) => ({
    stage,
    count: deals.filter((d) => d.stage === stage).length,
  }));

  return (
    <PageShell>
      <PageHeader
        title="CRM"
        description="Pipeline commercial MSK — prospects, relances, scripts."
        breadcrumbs={[{ label: "Accueil", href: "/accueil" }, { label: "CRM" }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link prefetch={false} href="/crm/scripts" className={linkSecondary}>
              Scripts
            </Link>
            <Link prefetch={false} href="/crm/relances" className={linkSecondary}>
              Relances
            </Link>
            <Link prefetch={false} href="/crm/prospects" className={linkSecondary}>
              Prospects
            </Link>
            {hasPermission(user, "crm.prospect.create") ? (
              <Link prefetch={false} href="/crm/prospects/nouveau" className={linkPrimary}>
                Nouveau prospect
              </Link>
            ) : null}
          </div>
        }
      />

      <KpiGrid
        items={[
          {
            label: "Pipeline ouvert",
            value: String(openDeals.length),
            hint: formatXof(pipelineXof),
          },
          {
            label: "Gagnés",
            value: String(won.length),
            hint: formatXof(wonXof),
          },
          {
            label: "Relances ouvertes",
            value: String(openTasks),
            hint: overdue > 0 ? `${overdue} en retard` : "à jour",
          },
          {
            label: "Deals suivis",
            value: String(deals.length),
            hint: "selon vos droits",
          },
        ]}
      />

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
          Pipeline
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {byStage.map(({ stage, count }) => (
            <Surface key={stage} className="flex items-center justify-between p-4">
              <span className="text-sm text-msk-ink/70">
                {STAGE_LABELS[stage as CrmPipelineStage]}
              </span>
              <Badge tone={count > 0 ? "success" : "muted"}>{count}</Badge>
            </Surface>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
            Récents
          </h2>
          <Link prefetch={false}
            href="/crm/prospects"
            className="text-sm font-medium text-msk-blue hover:underline"
          >
            Tout voir
          </Link>
        </div>
        <Surface className="divide-y divide-msk-ink/[0.06] overflow-hidden p-0">
          {deals.slice(0, 8).length === 0 ? (
            <p className="p-6 text-center text-sm text-msk-ink/40">
              Aucun prospect —{" "}
              <Link prefetch={false}
                href="/crm/prospects/nouveau"
                className="font-medium text-msk-blue hover:underline"
              >
                créer
              </Link>{" "}
              ou{" "}
              <Link prefetch={false}
                href="/crm/prospects/import"
                className="font-medium text-msk-blue hover:underline"
              >
                importer le CSV
              </Link>
              .
            </p>
          ) : (
            deals.slice(0, 8).map((d) => (
              <Link prefetch={false}
                key={d.id}
                href={`/crm/prospects/${d.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-msk-chalk/60"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-msk-ink">
                    {d.organization.name}
                  </p>
                  <p className="truncate text-xs text-msk-ink/45">{d.title}</p>
                </div>
                <Badge tone="muted">{STAGE_LABELS[d.stage]}</Badge>
              </Link>
            ))
          )}
        </Surface>
      </section>
    </PageShell>
  );
}
