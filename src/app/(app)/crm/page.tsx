import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { CrmTaskStatus } from "@prisma/client";
import {
  Bell,
  FileWarning,
  FolderOpen,
  History,
  Sparkles,
  UserPlus,
  UserRoundPlus,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import {
  commercialTeamUserIds,
  injectOwnerIfMissing,
  isOperationalCrmStatus,
  listCommercialRoster,
  loadCollaboratorStatus,
  rosterToOwnerOptions,
} from "@/lib/crm/team";
import {
  OPEN_PIPELINE_STAGES,
  STAGE_LABELS,
  STAGE_ORDER,
  prospectsStagesHref,
} from "@/lib/crm/labels";
import {
  buildGoalProgress,
  loadSummedOperationalGoalsForPeriod,
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
  buildNouveauxProspectsHref,
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
import { gridKpi3, gridKpi4 } from "@/lib/ui/layout-grids";

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
  const operationalRoster = await listCommercialRoster({
    mode: "filter",
    extraIds: [user.id],
  });

  const period = parseCrmPeriod(sp);
  const lens = resolveCrmScopeLens(period);
  const showStocks = showStockWidgets(lens);
  const showGoals = goalsCompatibleWithPeriod(period);

  /** URL : tout le roster historique ; select : opérationnels (+ inject si deep-link). */
  const ownerScope = parseCrmOwner(sp, user, memberIds);
  let owners = rosterToOwnerOptions(operationalRoster);
  owners = await injectOwnerIfMissing(owners, ownerScope.ownerId);

  const focusStatus = ownerScope.ownerId
    ? await loadCollaboratorStatus(ownerScope.ownerId)
    : null;
  const focusOperational =
    focusStatus == null ? true : isOperationalCrmStatus(focusStatus);
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
  const wonAgg = await prisma.crmOpportunity.aggregate({
    where: {
      ...ownerWhere,
      stage: "GAGNE",
      OR: [
        { wonAt: occurredBetween },
        { wonAt: null, updatedAt: occurredBetween },
      ],
    },
    _count: { _all: true },
    _sum: { budgetXof: true },
  });
  const periodStats = await computePeriodStats(
    ownerIds,
    period.from,
    period.to,
  );

  const goals =
    showGoals && focusOperational
      ? ownerScope.ownerId != null
        ? await resolveGoalsForPeriod(ownerScope.ownerId, period)
        : ownerScope.canFilterOwners
          ? await loadSummedOperationalGoalsForPeriod(
              (
                await listCommercialRoster({
                  mode: "assign",
                  extraIds: [user.id],
                })
              ).map((m) => m.id),
              period,
            )
          : await resolveGoalsForPeriod(user.id, period)
      : null;

  // Stocks à date — agrégats SQL + listes ciblées (pas de findMany 500).
  const stageGroups = showStocks
    ? await prisma.crmOpportunity.groupBy({
        by: ["stage"],
        where: ownerWhere,
        _count: { _all: true },
        _sum: { budgetXof: true },
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
  const byStage = STAGE_ORDER.map((stage) => {
    const matching = stageGroups.filter(
      (g) => normalizeUiStage(g.stage) === stage,
    );
    return {
      stage,
      key: stage.toLowerCase(),
      statut: STAGE_LABELS[stage],
      count: matching.reduce((s, g) => s + g._count._all, 0),
    };
  });
  let openDealsCount = 0;
  let montantEnCours = 0;
  for (const g of stageGroups) {
    const st = normalizeUiStage(g.stage);
    if (st !== "GAGNE" && st !== "PERDU") {
      openDealsCount += g._count._all;
      montantEnCours += Number(g._sum.budgetXof ?? 0);
    }
  }

  const wonCount = wonAgg._count._all;
  const montantSigne = Number(wonAgg._sum.budgetXof ?? 0);
  const conversionDenom = wonCount + openDealsCount;
  const conversionPct =
    conversionDenom > 0 ? (wonCount / conversionDenom) * 100 : 0;
  const interesses = byStage.find((x) => x.stage === "INTERESSE")?.count ?? 0;
  const newProspects = periodStats.newProspects;

  const devisCandidates = showStocks
    ? await prisma.crmOpportunity.findMany({
        where: {
          ...ownerWhere,
          stage: "INTERESSE",
          comQuotes: { none: {} },
        },
        select: {
          id: true,
          stage: true,
          interestedAt: true,
          updatedAt: true,
          organization: { select: { name: true } },
        },
        take: 100,
      })
    : [];
  const devisUrgent = devisCandidates.filter((d) =>
    isDevisSlaBreached({
      stage: d.stage,
      interestedAt: d.interestedAt,
      updatedAt: d.updatedAt,
      quoteCount: 0,
    }),
  );

  const aTraiter = showStocks
    ? await prisma.crmOpportunity.findMany({
        where: {
          ...ownerWhere,
          stage: { notIn: ["GAGNE", "PERDU"] },
          OR: [
            { followUpAt: { lt: new Date() } },
            { stage: { in: ["INTERESSE", "NOUVEAU"] } },
          ],
        },
        select: {
          id: true,
          stage: true,
          followUpAt: true,
          nextAction: true,
          organization: { select: { name: true } },
        },
        orderBy: [{ followUpAt: "asc" }, { updatedAt: "desc" }],
        take: 5,
      })
    : [];

  const outreachMap =
    showStocks && aTraiter.length > 0
      ? await outreachCountByOpportunityIds(aTraiter.map((d) => d.id))
      : new Map<string, number>();

  const goalProgress =
    goals && showGoals ? buildGoalProgress(goals, periodStats) : [];

  const openScale = Math.max(5, openDealsCount);
  const interesseScale = Math.max(5, interesses);
  const relancesAvenir = Math.max(0, openTasks - overdue);
  const showDevis = showStocks && devisUrgent.length > 0;

  const focusOwner = ownerScope.ownerId;
  const ownerLabel = focusOwner
    ? (owners.find((o) => o.value === focusOwner)?.label ?? "Collaborateur")
    : null;

  /**
   * Total liste partagée (hors filtre collab) — pour dual « total / suivis »
   * quand on regarde mon portefeuille (own ou focus = moi).
   */
  const showProspectsDual =
    showStocks &&
    (!ownerScope.canFilterOwners || focusOwner === user.id);
  const sharedOpenTotal = showProspectsDual
    ? await prisma.crmOpportunity.count({
        where: { stage: { notIn: ["GAGNE", "PERDU"] } },
      })
    : null;

  const resetHref = buildCrmScopeHref("/crm", {
    period: parseCrmPeriod({ periode: "semaine" }),
    ownerId: focusOwner,
    canFilterOwners: ownerScope.canFilterOwners,
  });
  /** Lead : assignation (actifs seulement) · historique / lecture sinon. */
  const goalsHref =
    focusOwner && !focusOperational
      ? `/crm/objectifs/${focusOwner}`
      : canManageGoals
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
  const goalsDetailLabel =
    focusOwner && !focusOperational
      ? "Voir l’historique"
      : canManageGoals
        ? "Assigner"
        : "Voir le détail";

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
      ? ownerLabel
        ? `${ownerLabel} · activité ${period.label.toLowerCase()} + prospects à date.`
        : ownerScope.canFilterOwners
          ? `Équipe · activité ${period.label.toLowerCase()} + prospects à date.`
          : `Mon activité · ${period.label.toLowerCase()} + mes prospects à date.`
      : ownerLabel
        ? `${ownerLabel} · activité historique · ${period.label}.`
        : `Activité historique · ${period.label} (stocks à date masqués).`;

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
        <div className={gridKpi3}>
          <MetricNavCard
            href={eventHref("/crm/relances", { focus: "faites" })}
            icon={Bell}
            tone="coral"
            title="Relances faites"
            description={`Actions de suivi journalisées pendant ${period.label.toLowerCase()} (pas le stock ouvert).`}
            footer={
              <HubMiniRadial
                value={relancesFaites}
                max={Math.max(5, relancesFaites)}
                color={METRIC_NAV_TONE_CHART.coral}
                centerLabel={relancesFaites}
                caption="journalisées"
              />
            }
          />
          <MetricNavCard
            href={buildNouveauxProspectsHref({
              period,
              ownerId: focusOwner,
              canFilterOwners: ownerScope.canFilterOwners,
            })}
            icon={UserRoundPlus}
            tone="blue"
            title="Nouveaux prospects"
            description={`Prospects créés pendant ${period.label.toLowerCase()} (nouveaux, pas le stock à date).`}
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
            description={`Passés au statut Client pendant ${period.label.toLowerCase()}.`}
            footer={
              <HubMiniRadial
                value={wonCount}
                max={Math.max(5, wonCount)}
                color="#1384CB"
                centerLabel={wonCount}
                caption={wonCount > 1 ? "gagnés" : "gagné"}
              />
            }
          />
        </div>
        <ConversionPipelineCard
          ratePercent={conversionPct}
          signedAmount={montantSigne}
          signedCount={wonCount}
          openAmount={montantEnCours}
          openCount={openDealsCount}
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
        <section aria-labelledby="crm-prospects-stock" className="space-y-3">
          <h2
            id="crm-prospects-stock"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/40"
          >
            Prospects à date
            {ownerLabel ? ` · ${ownerLabel}` : ""}
          </h2>
          <div
            className={
              showDevis
                ? gridKpi4
                : gridKpi3
            }
          >
            {showDevis ? (
              <MetricNavCard
                href={stockHref("/crm/prospects", { devisRetard: "1" })}
                icon={FileWarning}
                tone="coral"
                title="Sans devis depuis 24 h"
                description="Prospects Intéressés depuis plus d’un jour, encore sans devis — à traiter."
                footer={
                  <HubMiniRadial
                    value={devisUrgent.length}
                    max={Math.max(5, devisUrgent.length)}
                    color={METRIC_NAV_TONE_CHART.coral}
                    centerLabel={devisUrgent.length}
                    caption={
                      devisUrgent.length > 1
                        ? "prospects à proposer"
                        : "prospect à proposer"
                    }
                  />
                }
              />
            ) : null}
            <MetricNavCard
              href={stockHref(prospectsStagesHref(OPEN_PIPELINE_STAGES))}
              icon={FolderOpen}
              tone="blue"
              title={
                showProspectsDual ? "Mes prospects actifs" : "Prospects actifs"
              }
              description={
                showProspectsDual
                  ? "Total partagé vs prospects que je suis (hors Client / Perdu) — clic = mes prospects."
                  : "Prospects non clos (hors Client / Perdu) — stock à date."
              }
              footer={
                showProspectsDual && sharedOpenTotal != null ? (
                  <div className="flex w-full items-end justify-end gap-1.5 sm:gap-2">
                    <HubMiniRadial
                      className="w-18 sm:w-20"
                      value={sharedOpenTotal}
                      max={Math.max(5, sharedOpenTotal, openDealsCount)}
                      color={METRIC_NAV_TONE_CHART.blue}
                      centerLabel={sharedOpenTotal}
                      caption="total"
                    />
                    <HubMiniRadial
                      className="w-18 sm:w-20"
                      value={openDealsCount}
                      max={Math.max(5, sharedOpenTotal, openDealsCount)}
                      color={METRIC_NAV_TONE_CHART.coral}
                      centerLabel={openDealsCount}
                      caption="suivis par moi"
                    />
                  </div>
                ) : (
                  <HubMiniRadial
                    value={openDealsCount}
                    max={openScale}
                    color={METRIC_NAV_TONE_CHART.blue}
                    centerLabel={openDealsCount}
                    caption={
                      openDealsCount > 1
                        ? "prospects actifs"
                        : "prospect actif"
                    }
                  />
                )
              }
            />
            <MetricNavCard
              href={stockHref(prospectsStagesHref(["INTERESSE"]))}
              icon={Sparkles}
              tone="cyan"
              title="Statut Intéressé"
              description="Prospects au statut Intéressé — prêts pour une proposition (à date)."
              footer={
                <HubMiniRadial
                  value={interesses}
                  max={interesseScale}
                  color="#1384CB"
                  centerLabel={interesses}
                  caption="au statut Intéressé"
                />
              }
            />
            <MetricNavCard
              href={stockHref("/crm/relances")}
              icon={Bell}
              tone="coral"
              title="Relances ouvertes"
              description="Tâches de relance encore ouvertes — échéance à venir ou dépassée."
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

      {showGoals && goalProgress.length > 0 && focusOperational ? (
        <GoalsProgressStrip
          progress={goalProgress}
          compact
          title={
            ownerScope.ownerId
              ? `Objectifs · ${ownerLabel ?? "Collaborateur"} · ${period.label}`
              : ownerScope.canFilterOwners
                ? `Synthèse objectifs (somme collabs actifs) · ${period.label}`
                : `Objectifs · ${period.label}`
          }
          detailHref={goalsHref}
          detailLabel={goalsDetailLabel}
        />
      ) : focusOwner && !focusOperational ? (
        <Surface className="flex flex-wrap items-center justify-between gap-3 border border-msk-coral/20 bg-msk-coral/5 p-4 text-sm text-msk-ink/70">
          <p>
            Compte{" "}
            {focusStatus === "SUSPENDED" ? "suspendu" : "archivé"} — pas
            d’objectifs opérationnels ni d’assignation. L’historique reste
            consultable.
          </p>
          <ActionLink
            href={goalsHref}
            icon={History}
            variant="secondary"
            size="sm"
          >
            Voir l’historique
          </ActionLink>
        </Surface>
      ) : null}
    </PageShell>
  );
}
