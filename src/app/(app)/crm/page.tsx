import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { CrmTaskStatus } from "@prisma/client";
import {
  Bell,
  FileWarning,
  FolderOpen,
  Sparkles,
  UserPlus,
  UserRoundPlus,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { commercialTeamUserIds } from "@/lib/crm/team";
import {
  OPEN_PIPELINE_STAGES,
  STAGE_LABELS,
  STAGE_ORDER,
  prospectsStagesHref,
} from "@/lib/crm/labels";
import {
  buildGoalProgress,
  loadTeamGoalsForPeriod,
  resolveGoalsForPeriod,
} from "@/lib/crm/goals";
import { listWeekOptions } from "@/lib/crm/week";
import { computePeriodStats } from "@/lib/crm/week-stats";
import { isTestOrgName } from "@/lib/crm/test-data";
import { isDevisSlaBreached } from "@/lib/crm/devis-sla";
import {
  countOutreachInPeriod,
  outreachCountByOpportunityIds,
} from "@/lib/crm/follow-up-count";
import {
  buildCrmScopeHref,
  dateRangeFilter,
  goalsCompatibleWithPeriod,
  normalizeSearchParams,
  parseCrmOwner,
  parseCrmPeriod,
  resolveCrmOwnerIds,
  resolveCrmScopeLens,
  showStockWidgets,
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
import { CrmScopeContext } from "@/components/crm/crm-scope-context";
import { normalizeUiStage } from "@/lib/crm/guide-rules";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function CrmDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const rawSp = await searchParams;
  const sp = normalizeSearchParams(rawSp);
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
  const lens = resolveCrmScopeLens(period);
  const showStocks = showStockWidgets(lens);
  const showGoals = goalsCompatibleWithPeriod(period);

  const ownerScope = parseCrmOwner(
    sp,
    user,
    owners.map((o) => o.value),
  );
  const ownerIds = resolveCrmOwnerIds({
    ownerId: ownerScope.ownerId,
    canFilterOwners: ownerScope.canFilterOwners,
    memberIds,
    userId: user.id,
  });
  const ownerWhere = { ownerId: { in: ownerIds } };
  const assigneeWhere = { assigneeId: { in: ownerIds } };

  const weeks = listWeekOptions({ fromYear: new Date().getFullYear() - 1 });
  const occurredBetween = dateRangeFilter(period.from, period.to);

  // Événements période (toujours)
  const relancesFaites = await countOutreachInPeriod({
    ownerIds,
    occurredBetween,
  });
  const wonRows = await prisma.crmOpportunity.findMany({
    where: {
      ...ownerWhere,
      stage: "GAGNE",
      OR: [
        { wonAt: occurredBetween },
        { wonAt: null, updatedAt: occurredBetween },
      ],
    },
    select: { budgetXof: true },
  });
  const periodStats = await computePeriodStats(
    ownerIds,
    period.from,
    period.to,
  );

  const goals =
    showGoals
      ? ownerScope.ownerId != null
        ? await resolveGoalsForPeriod(ownerScope.ownerId, period)
        : ownerScope.canFilterOwners
          ? await loadTeamGoalsForPeriod(period)
          : await resolveGoalsForPeriod(user.id, period)
      : null;

  // Stocks à date — uniquement lentille live (évite requêtes inutiles + chiffres trompeurs)
  const deals = showStocks
    ? await prisma.crmOpportunity.findMany({
        where: ownerWhere,
        include: {
          organization: { select: { name: true } },
          comQuotes: { select: { id: true }, take: 1 },
        },
        orderBy: [{ followUpAt: "asc" }, { updatedAt: "desc" }],
        take: 500,
      })
    : [];
  const openTasks = showStocks
    ? await prisma.crmTask.count({
        where: { status: CrmTaskStatus.OPEN, ...assigneeWhere },
      })
    : 0;
  const overdue = showStocks
    ? await prisma.crmTask.count({
        where: {
          status: CrmTaskStatus.OPEN,
          dueAt: { lt: new Date() },
          ...assigneeWhere,
        },
      })
    : 0;

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
  const outreachMap =
    showStocks && openDeals.length > 0
      ? await outreachCountByOpportunityIds(openDeals.map((d) => d.id))
      : new Map<string, number>();

  const wonCount = wonRows.length;
  const montantEnCours = openDeals.reduce((s, d) => s + (d.budgetXof ?? 0), 0);
  const montantSigne = wonRows.reduce((s, d) => s + (d.budgetXof ?? 0), 0);
  const conversionDenom = wonCount + openDeals.length;
  const conversionPct =
    conversionDenom > 0 ? (wonCount / conversionDenom) * 100 : 0;
  const interesses = byStage.find((x) => x.stage === "INTERESSE")?.count ?? 0;
  const newProspects = periodStats.newProspects;

  const devisUrgent = showStocks
    ? deals.filter((d) =>
        isDevisSlaBreached({
          stage: d.stage,
          interestedAt: d.interestedAt,
          updatedAt: d.updatedAt,
          quoteCount: d.comQuotes.length,
        }),
      )
    : [];

  const aTraiter = showStocks
    ? deals
        .filter((d) => {
          const st = normalizeUiStage(d.stage);
          if (st === "GAGNE" || st === "PERDU") return false;
          const late = d.followUpAt != null && d.followUpAt.getTime() < now;
          return late || st === "INTERESSE" || st === "NOUVEAU";
        })
        .slice(0, 5)
    : [];

  const goalProgress =
    goals && showGoals ? buildGoalProgress(goals, periodStats) : [];

  const openScale = Math.max(5, openDeals.length);
  const interesseScale = Math.max(5, interesses);
  const relancesAvenir = Math.max(0, openTasks - overdue);
  const showDevis = showStocks && devisUrgent.length > 0;

  const focusOwner = ownerScope.ownerId;
  const ownerLabel = focusOwner
    ? (owners.find((o) => o.value === focusOwner)?.label ?? "Collaborateur")
    : null;

  const resetHref = buildCrmScopeHref("/crm", {
    period: parseCrmPeriod({ periode: "semaine" }),
    ownerId: focusOwner,
    canFilterOwners: ownerScope.canFilterOwners,
  });
  /** Lead : écran d’assignation dédié · Collab : vue d’ensemble lecture. */
  const goalsHref = canManageGoals
    ? focusOwner
      ? `/crm/objectifs/assigner/${focusOwner}`
      : "/crm/objectifs/assigner"
    : buildCrmScopeHref("/crm/objectifs", {
        period:
          period.mode === "plage"
            ? parseCrmPeriod({ periode: "semaine", semaine: period.semaine })
            : period,
        ownerId: null,
        canFilterOwners: false,
        forcePeriod: true,
      });

  /** Liens événements : période forcée + owner. */
  const eventHref = (
    path: string,
    keep?: Record<string, string | undefined>,
  ) =>
    buildCrmScopeHref(path, {
      period,
      ownerId: focusOwner,
      canFilterOwners: ownerScope.canFilterOwners,
      forcePeriod: true,
      keep,
    });

  /** Liens stocks à date : `view=stock` pour ne pas filtrer createdAt sur Prospects. */
  const stockHref = (
    path: string,
    keep?: Record<string, string | undefined>,
  ) =>
    buildCrmScopeHref(path, {
      period,
      ownerId: focusOwner,
      canFilterOwners: ownerScope.canFilterOwners,
      keep: path.startsWith("/crm/prospects")
        ? { view: "stock", ...keep }
        : keep,
    });

  const description =
    lens === "live"
      ? `Indicateurs · ${period.label} · portefeuille à date.`
      : `Activité · ${period.label} · sans portefeuille à date.`;

  const scopeKey = `${period.mode}:${period.fromIso}:${period.toIso}:${ownerScope.ownerId ?? "all"}`;

  return (
    <PageShell key={scopeKey}>
      <PageHeader
        title="Tableau de bord"
        description={description}
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
        lens={lens}
      />

      <CrmScopeContext
        lens={lens}
        periodLabel={period.label}
        ownerLabel={ownerLabel}
        resetHref={resetHref}
      />

      {/* Toujours : réagit à période (+ collab). */}
      <section aria-labelledby="crm-activite" className="space-y-3">
        <h2
          id="crm-activite"
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/40"
        >
          Activité · {period.label}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricNavCard
            href={eventHref("/crm/relances", { focus: "faites" })}
            icon={Bell}
            tone="coral"
            title="Relances faites"
            description={`Journalisées sur ${period.label.toLowerCase()}.`}
            footer={
              <HubMiniRadial
                value={relancesFaites}
                max={Math.max(5, relancesFaites)}
                color={METRIC_NAV_TONE_CHART.coral}
                centerLabel={relancesFaites}
                caption="faites"
              />
            }
          />
          <MetricNavCard
            href={eventHref("/crm/prospects", { event: "nouveaux" })}
            icon={UserRoundPlus}
            tone="blue"
            title="Nouveaux"
            description={`Créés sur ${period.label.toLowerCase()}.`}
            footer={
              <HubMiniRadial
                value={newProspects}
                max={Math.max(5, newProspects)}
                color={METRIC_NAV_TONE_CHART.blue}
                centerLabel={newProspects}
                caption={newProspects > 1 ? "créés" : "créé"}
              />
            }
          />
          <MetricNavCard
            href={eventHref("/commercial/clients", { event: "gagnes" })}
            icon={Sparkles}
            tone="cyan"
            title="Clients gagnés"
            description={`Passés Client sur ${period.label.toLowerCase()}.`}
            footer={
              <HubMiniRadial
                value={wonCount}
                max={Math.max(5, wonCount)}
                color="#1384CB"
                centerLabel={wonCount}
                caption={wonCount > 1 ? "clients" : "client"}
              />
            }
          />
        </div>
        <ConversionPipelineCard
          ratePercent={conversionPct}
          signedAmount={montantSigne}
          signedCount={wonCount}
          openAmount={montantEnCours}
          openCount={openDeals.length}
          totalDeals={conversionDenom}
          periodLabel={period.label}
          signedOnly={!showStocks}
          signedHref={eventHref("/commercial/clients", { event: "gagnes" })}
          openHref={
            showStocks
              ? stockHref(prospectsStagesHref(OPEN_PIPELINE_STAGES))
              : undefined
          }
        />
      </section>

      {/* Uniquement lentille live : réagit au collab, pas à la période. */}
      {showStocks ? (
        <section aria-labelledby="crm-portefeuille" className="space-y-3">
          <h2
            id="crm-portefeuille"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/40"
          >
            Portefeuille à date
            {ownerLabel ? ` · ${ownerLabel}` : ""}
          </h2>
          <div
            className={
              showDevis
                ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
                : "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
            }
          >
            {showDevis ? (
              <MetricNavCard
                href={stockHref("/crm/prospects", { devisRetard: "1" })}
                icon={FileWarning}
                tone="coral"
                title="Sans devis"
                description="Intéressés > 24 h sans proposition (à date)."
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
              href={stockHref(prospectsStagesHref(OPEN_PIPELINE_STAGES))}
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
                    openDeals.length > 1
                      ? "dossiers ouverts"
                      : "dossier ouvert"
                  }
                />
              }
            />
            <MetricNavCard
              href={stockHref(prospectsStagesHref(["INTERESSE"]))}
              icon={Sparkles}
              tone="cyan"
              title="Intéressés"
              description="Prêts à recevoir une proposition (à date)."
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
              href={stockHref("/crm/relances")}
              icon={Bell}
              tone="coral"
              title="Relances à faire"
              description="À venir et en retard (à date)."
              footer={
                <div className="flex w-full items-end justify-end gap-1.5 sm:gap-2">
                  <HubMiniRadial
                    className="w-18 sm:w-20"
                    value={relancesAvenir}
                    max={Math.max(5, relancesAvenir, overdue)}
                    color={METRIC_NAV_TONE_CHART.blue}
                    centerLabel={relancesAvenir}
                    caption="à venir"
                  />
                  <HubMiniRadial
                    className="w-18 sm:w-20"
                    value={overdue}
                    max={Math.max(5, relancesAvenir, overdue)}
                    color={METRIC_NAV_TONE_CHART.coral}
                    centerLabel={overdue}
                    caption="en retard"
                  />
                </div>
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <StageDonutChart
              data={byStage}
              ownerId={focusOwner}
              period={period}
              canFilterOwners={ownerScope.canFilterOwners}
              subtitle="à date — clic = filtre liste"
            />
            <Surface className="divide-y divide-msk-ink/6 overflow-hidden p-0">
              <div className="flex items-center justify-between px-4 py-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
                  Priorités
                </h3>
                <Link
                  prefetch={false}
                  href={stockHref("/crm/prospects")}
                  className="text-sm font-medium text-msk-blue hover:underline"
                >
                  Tous les prospects
                </Link>
              </div>
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
                        {d.nextAction ||
                          STAGE_LABELS[normalizeUiStage(d.stage)]}
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
          </div>
        </section>
      ) : null}

      {showGoals && goalProgress.length > 0 ? (
        <GoalsProgressStrip
          progress={goalProgress}
          compact
          title={
            ownerScope.ownerId
              ? `Objectifs · ${ownerLabel ?? "Collaborateur"} · ${period.label}`
              : ownerScope.canFilterOwners
                ? `Objectifs équipe · ${period.label}`
                : `Objectifs · ${period.label}`
          }
          detailHref={goalsHref}
          detailLabel={canManageGoals ? "Assigner" : "Voir le détail"}
        />
      ) : null}
    </PageShell>
  );
}
