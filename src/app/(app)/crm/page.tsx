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
import { GOAL_LABELS, resolveGoals, type GoalMetric } from "@/lib/crm/goals";
import { weekStartMonday } from "@/lib/crm/week";
import { computeWeekStats } from "@/lib/crm/week-stats";
import { isTestOrgName } from "@/lib/crm/test-data";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { KpiGrid } from "@/components/ui/kpi-card";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { StageDonutChart } from "@/components/crm/stage-donut-chart";
import { ConversionRadial } from "@/components/crm/conversion-radial";
import { isDevisSlaBreached } from "@/lib/crm/devis-sla";

export const metadata: Metadata = { title: "Tableau de bord" };

const linkBtn =
  "inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition";
const linkPrimary = `${linkBtn} bg-msk-blue text-white hover:bg-msk-blue/90`;

function normalizeStage(stage: CrmPipelineStage): CrmPipelineStage {
  return stage === "NEGOCIATION" ? "DEVIS_ENVOYE" : stage;
}

export default async function CrmDashboardPage() {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const isLead =
    user.isSuperAdmin || hasPermission(user, "crm.reports.global");

  const teamIds = await commercialTeamUserIds();
  const scope = dealOwnerScopeWhere(user, teamIds);
  const assigneeScope =
    isLead
      ? {}
      : hasPermission(user, "crm.view_team")
        ? { assigneeId: { in: [user.id, ...teamIds] } }
        : { assigneeId: user.id };

  const weekStart = weekStartMonday();
  const [deals, openTasks, overdue, goals, weekStats] = await Promise.all([
    prisma.crmOpportunity.findMany({
      where: scope,
      include: {
        organization: { select: { name: true } },
        comQuotes: { select: { id: true }, take: 1 },
      },
      orderBy: [{ followUpAt: "asc" }, { updatedAt: "desc" }],
      take: 500,
    }),
    prisma.crmTask.count({
      where: { status: CrmTaskStatus.OPEN, ...assigneeScope },
    }),
    prisma.crmTask.count({
      where: {
        status: CrmTaskStatus.OPEN,
        dueAt: { lt: new Date() },
        ...assigneeScope,
      },
    }),
    resolveGoals(user.id),
    computeWeekStats(user.id, weekStart),
  ]);

  const now = Date.now();

  const byStage = STAGE_ORDER.map((stage) => ({
    stage,
    key: stage.toLowerCase(),
    statut: STAGE_LABELS[stage],
    count: deals.filter((d) => normalizeStage(d.stage) === stage).length,
  }));

  const openDeals = deals.filter(
    (d) => d.stage !== "GAGNE" && d.stage !== "PERDU",
  );
  const won = deals.filter((d) => d.stage === "GAGNE");
  const caEnCours = openDeals.reduce((s, d) => s + (d.budgetXof ?? 0), 0);
  const caSigne = won.reduce((s, d) => s + (d.budgetXof ?? 0), 0);
  const conversionPct =
    deals.length > 0 ? (won.length / deals.length) * 100 : 0;
  const interesses = byStage.find((x) => x.stage === "INTERESSE")?.count ?? 0;

  const devisUrgent = deals.filter((d) =>
    isDevisSlaBreached({
      stage: d.stage,
      interestedAt: d.interestedAt,
      updatedAt: d.updatedAt,
      quoteCount: d.comQuotes.length,
    }),
  );

  const aTraiter = deals
    .filter((d) => {
      const st = normalizeStage(d.stage);
      if (st === "GAGNE" || st === "PERDU") return false;
      const late =
        d.followUpAt != null && d.followUpAt.getTime() < now;
      return late || st === "INTERESSE" || st === "NOUVEAU";
    })
    .slice(0, 5);

  const goalProgress: {
    metric: GoalMetric;
    label: string;
    current: number;
    target: number;
  }[] = [
    {
      metric: "NEW_PROSPECTS",
      label: GOAL_LABELS.NEW_PROSPECTS,
      current: weekStats.newProspects,
      target: goals.NEW_PROSPECTS,
    },
    {
      metric: "FIRST_CONTACTS",
      label: GOAL_LABELS.FIRST_CONTACTS,
      current: weekStats.firstContacts,
      target: goals.FIRST_CONTACTS,
    },
    {
      metric: "MEETINGS",
      label: GOAL_LABELS.MEETINGS,
      current: weekStats.meetings,
      target: goals.MEETINGS,
    },
    {
      metric: "FOLLOW_UPS",
      label: GOAL_LABELS.FOLLOW_UPS,
      current: weekStats.followUpsDone,
      target: goals.FOLLOW_UPS,
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Tableau de bord"
        breadcrumbs={[
          { label: "Accueil", href: "/accueil" },
          { label: "Commercial", href: "/commercial" },
        ]}
        actions={
          hasPermission(user, "crm.prospect.create") ? (
            <Link
              prefetch={false}
              href="/crm/prospects/nouveau"
              className={linkPrimary}
            >
              Nouveau
            </Link>
          ) : null
        }
      />

      {(overdue > 0 || devisUrgent.length > 0) && (
        <Surface className="border-msk-coral/25 bg-msk-coral/[0.04] p-4">
          <p className="text-sm font-semibold text-msk-coral">À traiter</p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {overdue > 0 ? (
              <li>
                <Link
                  prefetch={false}
                  href="/crm/relances"
                  className="text-msk-blue hover:underline"
                >
                  {overdue} relance{overdue > 1 ? "s" : ""} en retard
                </Link>
              </li>
            ) : null}
            {devisUrgent.length > 0 ? (
              <li>
                <Link
                  prefetch={false}
                  href="/crm/prospects?devisRetard=1"
                  className="text-msk-blue hover:underline"
                >
                  {devisUrgent.length} Intéressé
                  {devisUrgent.length > 1 ? "s" : ""} sans devis (&gt; 24h)
                </Link>
              </li>
            ) : null}
          </ul>
        </Surface>
      )}

      <KpiGrid
        className="sm:grid-cols-2 xl:grid-cols-4"
        items={[
          {
            label: "Ouverts",
            value: String(openDeals.length),
          },
          {
            label: "Intéressés",
            value: String(interesses),
          },
          {
            label: "Relances dues",
            value: String(openTasks),
            hint: overdue > 0 ? `${overdue} en retard` : undefined,
          },
          {
            label: "CA en cours",
            value: formatXof(caEnCours),
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ConversionRadial
          ratePercent={conversionPct}
          caSigne={caSigne}
          overdue={overdue}
        />
        <StageDonutChart data={byStage} />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
            Priorités
          </h2>
          <Link
            prefetch={false}
            href="/crm/prospects"
            className="text-sm font-medium text-msk-blue hover:underline"
          >
            Tous les prospects
          </Link>
        </div>
        <Surface className="divide-y divide-msk-ink/[0.06] overflow-hidden p-0">
          {aTraiter.length === 0 ? (
            <p className="p-6 text-center text-sm text-msk-ink/40">
              Rien d’urgent — bon rythme.
            </p>
          ) : (
            aTraiter.map((d) => (
              <Link
                prefetch={false}
                key={d.id}
                href={`/crm/prospects/${d.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-msk-chalk/60"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-msk-ink">
                    {d.organization.name}
                    {isTestOrgName(d.organization.name) ? (
                      <Badge tone="muted" className="ml-2 align-middle">
                        TEST
                      </Badge>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-msk-ink/45">
                    {d.nextAction || STAGE_LABELS[normalizeStage(d.stage)]}
                  </p>
                </div>
                <Badge tone="muted">
                  {STAGE_LABELS[normalizeStage(d.stage)]}
                </Badge>
              </Link>
            ))
          )}
        </Surface>
      </section>

      {isLead ? (
        <Surface className="p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
              Objectifs semaine
            </p>
            <Link
              prefetch={false}
              href="/crm/objectifs"
              className="text-xs font-medium text-msk-blue hover:underline"
            >
              Paramétrer
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {goalProgress.map((g) => {
              const pct =
                g.target > 0
                  ? Math.min(100, Math.round((g.current / g.target) * 100))
                  : 0;
              return (
                <div key={g.metric}>
                  <div className="flex justify-between text-xs text-msk-ink/55">
                    <span>{g.label}</span>
                    <span className="tabular-nums font-medium text-msk-ink">
                      {g.current}/{g.target}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-msk-ink/[0.08]">
                    <div
                      className="h-full rounded-full bg-msk-blue"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Surface>
      ) : null}
    </PageShell>
  );
}
