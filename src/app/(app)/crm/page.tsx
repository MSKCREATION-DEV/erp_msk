import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CrmTaskStatus } from "@prisma/client";
import {
  Bell,
  FileWarning,
  FolderOpen,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { dealOwnerScopeWhere } from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import {
  OPEN_PIPELINE_STAGES,
  STAGE_LABELS,
  STAGE_ORDER,
  prospectsStagesHref,
} from "@/lib/crm/labels";
import { buildGoalProgress, resolveGoals } from "@/lib/crm/goals";
import { listWeekOptions, parseWeekParam } from "@/lib/crm/week";
import { computeWeekStats } from "@/lib/crm/week-stats";
import { isTestOrgName } from "@/lib/crm/test-data";
import { isDevisSlaBreached } from "@/lib/crm/devis-sla";
import {
  countOutreachInPeriod,
  outreachCountByOpportunityIds,
} from "@/lib/crm/follow-up-count";
import {
  dateRangeFilter,
  parseCrmOwner,
  parseCrmPeriod,
} from "@/lib/crm/scope-period";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ActionLink } from "@/components/ui/action-link";
import { MetricNavCard, METRIC_NAV_TONE_CHART } from "@/components/ui/metric-nav-card";
import { HubMiniRadial } from "@/components/commercial/hub-mini-radial";
import { StageDonutChart } from "@/components/crm/stage-donut-chart";
import { ConversionPipelineCard } from "@/components/crm/conversion-pipeline-card";
import { GoalsProgressStrip } from "@/components/crm/goals-progress-strip";
import { RelanceCountBadge } from "@/components/crm/relance-count-badge";
import { CrmScopeBar } from "@/components/crm/crm-scope-bar";
import { normalizeUiStage } from "@/lib/crm/guide-rules";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function CrmDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const sp = await searchParams;
  const canManageGoals =
    user.isSuperAdmin || hasPermission(user, "crm.reports.global");

  const teamIds = await commercialTeamUserIds();
  const memberIds = [...new Set([user.id, ...teamIds])];
  const owners = (
    await prisma.user.findMany({
      where: { id: { in: memberIds }, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    })
  ).map((u) => ({
    value: u.id,
    label: `${u.firstName} ${u.lastName}`,
  }));

  const period = parseCrmPeriod(sp);
  const ownerScope = parseCrmOwner(
    sp,
    user,
    owners.map((o) => o.value),
  );
  const weeks = listWeekOptions({ fromYear: new Date().getFullYear() - 1 });
  const weekStart = parseWeekParam(period.semaine);
  const occurredBetween = dateRangeFilter(period.from, period.to);

  const baseScope = dealOwnerScopeWhere(user, teamIds);
  const scope = {
    ...baseScope,
    ...(ownerScope.ownerId ? { ownerId: ownerScope.ownerId } : {}),
  };

  const assigneeScope = ownerScope.ownerId
    ? { assigneeId: ownerScope.ownerId }
    : canManageGoals
      ? {}
      : hasPermission(user, "crm.view_team")
        ? { assigneeId: { in: memberIds } }
        : { assigneeId: user.id };

  const statsUserId = ownerScope.ownerId ?? user.id;

  // Séquentiel — pool Prisma connection_limit=1 (évite P2024)
  const deals = await prisma.crmOpportunity.findMany({
    where: scope,
    include: {
      organization: { select: { name: true } },
      comQuotes: { select: { id: true }, take: 1 },
    },
    orderBy: [{ followUpAt: "asc" }, { updatedAt: "desc" }],
    take: 500,
  });
  const openTasks = await prisma.crmTask.count({
    where: { status: CrmTaskStatus.OPEN, ...assigneeScope },
  });
  const overdue = await prisma.crmTask.count({
    where: {
      status: CrmTaskStatus.OPEN,
      dueAt: { lt: new Date() },
      ...assigneeScope,
    },
  });
  const goals = await resolveGoals(statsUserId);
  const weekStats = await computeWeekStats(statsUserId, weekStart);
  const relancesFaites = await countOutreachInPeriod({
    ownerIds: ownerScope.ownerId
      ? [ownerScope.ownerId]
      : ownerScope.canFilterOwners
        ? memberIds
        : [user.id],
    occurredBetween,
  });

  const now = Date.now();

  const byStage = STAGE_ORDER.map((stage) => ({
    stage,
    key: stage.toLowerCase(),
    statut: STAGE_LABELS[stage],
    count: deals.filter((d) => normalizeUiStage(d.stage) === stage).length,
  }));

  const openDeals = deals.filter(
    (d) => d.stage !== "GAGNE" && d.stage !== "PERDU",
  );
  const outreachMap = await outreachCountByOpportunityIds(
    openDeals.map((d) => d.id),
  );

  const wonInPeriod = deals.filter((d) => {
    if (d.stage !== "GAGNE") return false;
    const t = (d.wonAt ?? d.updatedAt).getTime();
    return t >= period.from.getTime() && t <= period.to.getTime();
  });
  const montantEnCours = openDeals.reduce((s, d) => s + (d.budgetXof ?? 0), 0);
  const montantSigne = wonInPeriod.reduce((s, d) => s + (d.budgetXof ?? 0), 0);
  const conversionPct =
    deals.length > 0 ? (wonInPeriod.length / deals.length) * 100 : 0;
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
      const st = normalizeUiStage(d.stage);
      if (st === "GAGNE" || st === "PERDU") return false;
      const late = d.followUpAt != null && d.followUpAt.getTime() < now;
      return late || st === "INTERESSE" || st === "NOUVEAU";
    })
    .slice(0, 5);

  const goalProgress = buildGoalProgress(goals, weekStats);

  const openScale = Math.max(5, openDeals.length);
  const interesseScale = Math.max(5, interesses);
  const relancesAvenir = Math.max(0, openTasks - overdue);
  const showDevis = devisUrgent.length > 0;
  const indicatorCols = showDevis
    ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    : "grid gap-3 sm:grid-cols-2 xl:grid-cols-3";

  const stockHint = "à date";
  const eventHint = period.label;

  return (
    <PageShell>
      <PageHeader
        title="Tableau de bord"
        description={`Indicateurs · ${eventHint} · stocks ${stockHint}.`}
        breadcrumbs={[
          { label: "Accueil", href: "/accueil" },
          { label: "Commercial", href: "/commercial" },
        ]}
        actions={
          hasPermission(user, "crm.prospect.create") ? (
            <ActionLink href="/crm/prospects/nouveau" icon={UserPlus}>
              Nouveau prospect
            </ActionLink>
          ) : null
        }
      />

      <CrmScopeBar
        mode={period.mode}
        semaine={period.semaine}
        mois={period.mois}
        on={period.on}
        from={period.fromIso}
        to={period.toIso}
        weeks={weeks}
        ownerId={ownerScope.ownerId}
        owners={owners}
        canFilterOwners={ownerScope.canFilterOwners}
        periodLabel={period.label}
      />

      <section aria-labelledby="crm-indicateurs" className="space-y-3">
        <h2
          id="crm-indicateurs"
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/40"
        >
          Indicateurs
        </h2>
        <div className={indicatorCols}>
          {showDevis ? (
            <MetricNavCard
              href="/crm/prospects?devisRetard=1"
              icon={FileWarning}
              tone="coral"
              title="Sans devis"
              description="Intéressés depuis plus de 24 h sans proposition (à date)."
              footer={
                <HubMiniRadial
                  value={devisUrgent.length}
                  max={Math.max(5, devisUrgent.length)}
                  color={METRIC_NAV_TONE_CHART.coral}
                  centerLabel={devisUrgent.length}
                  caption={
                    devisUrgent.length > 1
                      ? "dossiers à proposer"
                      : "dossier à proposer"
                  }
                />
              }
            />
          ) : null}
          <MetricNavCard
            href={prospectsStagesHref(OPEN_PIPELINE_STAGES)}
            icon={FolderOpen}
            tone="blue"
            title="Ouverts"
            description="Dossiers encore actifs (à date)."
            footer={
              <HubMiniRadial
                value={openDeals.length}
                max={openScale}
                color={METRIC_NAV_TONE_CHART.blue}
                centerLabel={openDeals.length}
                caption={
                  openDeals.length > 1 ? "dossiers ouverts" : "dossier ouvert"
                }
              />
            }
          />
          <MetricNavCard
            href={prospectsStagesHref(["INTERESSE"])}
            icon={Sparkles}
            tone="cyan"
            title="Intéressés"
            description="Prospects prêts à recevoir une proposition (à date)."
            footer={
              <HubMiniRadial
                value={interesses}
                max={interesseScale}
                color="#1384CB"
                centerLabel={interesses}
                caption={interesses > 1 ? "intéressés" : "intéressé"}
              />
            }
          />
          <MetricNavCard
            href="/crm/relances"
            icon={Bell}
            tone="coral"
            title="Relances"
            description={`À venir et en retard (à date) · faites sur ${eventHint.toLowerCase()}.`}
            footer={
              <div className="flex w-full items-end justify-end gap-1.5 sm:gap-2">
                <HubMiniRadial
                  className="w-[4.5rem] sm:w-20"
                  value={relancesAvenir}
                  max={Math.max(5, relancesAvenir, overdue, relancesFaites)}
                  color={METRIC_NAV_TONE_CHART.blue}
                  centerLabel={relancesAvenir}
                  caption="à venir"
                />
                <HubMiniRadial
                  className="w-[4.5rem] sm:w-20"
                  value={overdue}
                  max={Math.max(5, relancesAvenir, overdue, relancesFaites)}
                  color={METRIC_NAV_TONE_CHART.coral}
                  centerLabel={overdue}
                  caption="en retard"
                />
                <HubMiniRadial
                  className="w-[4.5rem] sm:w-20"
                  value={relancesFaites}
                  max={Math.max(5, relancesAvenir, overdue, relancesFaites)}
                  color="#1384CB"
                  centerLabel={relancesFaites}
                  caption="faites"
                />
              </div>
            }
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ConversionPipelineCard
          ratePercent={conversionPct}
          signedAmount={montantSigne}
          signedCount={wonInPeriod.length}
          openAmount={montantEnCours}
          openCount={openDeals.length}
          totalDeals={deals.length}
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
                    {d.nextAction || STAGE_LABELS[normalizeUiStage(d.stage)]}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                  <RelanceCountBadge
                    count={outreachMap.get(d.id) ?? 0}
                    showZero={false}
                    compact
                  />
                  <Badge tone="muted">
                    {STAGE_LABELS[normalizeUiStage(d.stage)]}
                  </Badge>
                </div>
              </Link>
            ))
          )}
        </Surface>
      </section>

      <GoalsProgressStrip
        progress={goalProgress}
        compact
        detailHref="/crm/objectifs"
        detailLabel={canManageGoals ? "Assigner" : "Voir le détail"}
      />
    </PageShell>
  );
}
