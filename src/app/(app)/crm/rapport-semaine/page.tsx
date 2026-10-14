import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FolderOpen, Target } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { dealOwnerScopeWhere } from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/crm/labels";
import {
  buildGoalProgress,
  loadTeamGoals,
  resolveGoals,
} from "@/lib/crm/goals";
import {
  formatWeekRangeLabel,
  isoWeekNumber,
  listWeekOptions,
  parseWeekParam,
  weekEndFriday,
  weekEndSunday,
  weekStartIso,
  weekStartMonday,
} from "@/lib/crm/week";
import { computeWeekStats } from "@/lib/crm/week-stats";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { StageDonutChart } from "@/components/crm/stage-donut-chart";
import { StageBarChart } from "@/components/crm/stage-bar-chart";
import { KpiRadial } from "@/components/crm/kpi-radial";
import { GoalsProgressStrip } from "@/components/crm/goals-progress-strip";
import { ScopeFocusBanner } from "@/components/crm/scope-focus-banner";
import { CrmScopeBar } from "@/components/crm/crm-scope-bar";
import { ActionLink } from "@/components/ui/action-link";
import {
  parseCrmOwner,
  parseCrmPeriod,
} from "@/lib/crm/scope-period";

export const metadata: Metadata = { title: "Rapport commercial" };

export default async function CrmRapportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const sp = await searchParams;
  const teamIds = await commercialTeamUserIds();
  const canGlobal =
    user.isSuperAdmin || hasPermission(user, "crm.reports.global");

  const memberIds = [...new Set([user.id, ...teamIds])];
  const owners = canGlobal
    ? (
        await prisma.user.findMany({
          where: { id: { in: memberIds }, status: "ACTIVE" },
          select: { id: true, firstName: true, lastName: true },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        })
      ).map((u) => ({
        value: u.id,
        label: `${u.firstName} ${u.lastName}`,
      }))
    : [];

  const period = parseCrmPeriod({
    ...sp,
    periode: sp.periode ?? "semaine",
  });
  const ownerScope = parseCrmOwner(
    sp,
    user,
    owners.map((o) => o.value),
  );

  /** `all` = équipe · uuid = collab · self si pas Direction. */
  const scopeMode: "all" | "user" =
    canGlobal && !ownerScope.ownerId ? "all" : "user";
  const focusOwnerId: string | null = canGlobal
    ? ownerScope.ownerId
    : user.id;

  const weeks = listWeekOptions({
    fromYear: new Date().getFullYear() - 1,
  });
  const weekValues = new Set(weeks.map((w) => w.value));
  const weekStart = (() => {
    const parsed = parseWeekParam(period.semaine);
    const iso = weekStartIso(parsed);
    if (weekValues.has(iso)) return parsed;
    return weekStartMonday();
  })();
  const weekIso = weekStartIso(weekStart);
  const weekFri = weekEndFriday(weekStart);
  const weekSun = weekEndSunday(weekStart);

  const statsOwnerIds =
    scopeMode === "all" ? memberIds : [focusOwnerId!];

  const baseDealWhere = {
    ...dealOwnerScopeWhere(user, teamIds),
    ...(scopeMode === "user" && focusOwnerId
      ? { ownerId: focusOwnerId }
      : scopeMode === "all"
        ? { ownerId: { in: memberIds } }
        : {}),
  };

  // Séquentiel — pool Prisma connection_limit=1
  const goals =
    scopeMode === "all"
      ? await loadTeamGoals()
      : await resolveGoals(focusOwnerId!);
  const weekStats = await computeWeekStats(statsOwnerIds, weekStart);
  const deals = await prisma.crmOpportunity.findMany({
    where: baseDealWhere,
    select: { stage: true, createdAt: true },
  });

  const byStage = STAGE_ORDER.map((stage) => ({
    stage,
    key: stage.toLowerCase(),
    statut: STAGE_LABELS[stage],
    count: deals.filter((d) =>
      stage === "DEVIS_ENVOYE"
        ? d.stage === "DEVIS_ENVOYE" || d.stage === "NEGOCIATION"
        : d.stage === stage,
    ).length,
  }));

  const totalDossiers = byStage.reduce((a, b) => a + b.count, 0);

  // 4 semaines glissantes se terminant à la semaine sélectionnée
  const weekBars = [];
  for (let i = 3; i >= 0; i--) {
    const start = new Date(weekStart);
    start.setUTCDate(start.getUTCDate() - i * 7);
    const end = weekEndSunday(start);
    const count = await prisma.crmOpportunity.count({
      where: {
        ownerId: { in: statsOwnerIds },
        createdAt: { gte: start, lte: end },
      },
    });
    weekBars.push({ statut: `S${isoWeekNumber(start)}`, count });
  }

  const qualifiedOpen = byStage
    .filter((s) => s.stage === "INTERESSE" || s.stage === "DEVIS_ENVOYE")
    .reduce((a, b) => a + b.count, 0);
  const inExchange = byStage
    .filter((s) => s.stage === "CONTACTE" || s.stage === "QUALIFICATION")
    .reduce((a, b) => a + b.count, 0);

  const goalProgress = buildGoalProgress(goals, weekStats);

  const scopeLabel =
    scopeMode === "all"
      ? "Toute l’équipe"
      : (owners.find((o) => o.value === focusOwnerId)?.label ??
        (focusOwnerId === user.id
          ? `${user.firstName} ${user.lastName}`
          : "Collaborateur"));

  const rangeLabel = formatWeekRangeLabel(weekStart);
  const isCurrentWeek = weekIso === weekStartIso(weekStartMonday());

  const clearHref = (() => {
    const p = new URLSearchParams();
    if (!isCurrentWeek) p.set("semaine", weekIso);
    const s = p.toString();
    return s ? `/crm/rapport-semaine?${s}` : "/crm/rapport-semaine";
  })();

  const objectifsHref =
    scopeMode === "user" && focusOwnerId && canGlobal
      ? `/crm/objectifs?collab=${focusOwnerId}`
      : "/crm/objectifs";

  return (
    <PageShell>
      <PageHeader
        title="Rapport"
        description={`Activité CRM · ${scopeLabel} · ${rangeLabel}${isCurrentWeek ? " (semaine actuelle)" : ""}.`}
        backHref="/commercial"
        backLabel="Retour Commercial"
        breadcrumbs={[{ label: "Commercial", href: "/commercial" }]}
      />

      <CrmScopeBar
        mode="semaine"
        semaine={weekIso}
        mois={period.mois}
        on={period.on}
        from={period.fromIso}
        to={period.toIso}
        weeks={weeks}
        ownerId={scopeMode === "all" ? null : focusOwnerId}
        owners={owners}
        canFilterOwners={canGlobal}
        periodLabel={rangeLabel}
        periodModes={["semaine"]}
      />

      {canGlobal && scopeMode === "user" && focusOwnerId ? (
        <ScopeFocusBanner
          label={scopeLabel}
          clearHref={clearHref}
          clearAriaLabel="Voir toute l’équipe"
        >
          <ActionLink
            href={`/crm/prospects?owner=${focusOwnerId}`}
            icon={FolderOpen}
            variant="secondary"
            size="sm"
          >
            Prospects
          </ActionLink>
        </ScopeFocusBanner>
      ) : null}

      {totalDossiers === 0 &&
      weekStats.newProspects === 0 &&
      weekStats.firstContacts === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/45">
          Aucune activité pour {scopeLabel.toLowerCase()} sur cette semaine.
          Essayez une autre semaine
          {canGlobal ? " ou un autre collaborateur" : ""}.
        </Surface>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiRadial
          label="Nouveaux (semaine)"
          value={weekStats.newProspects}
          target={goals.NEW_PROSPECTS}
        />
        <KpiRadial
          label="Premiers contacts"
          value={weekStats.firstContacts}
          target={goals.FIRST_CONTACTS}
        />
        <KpiRadial
          label="Relances faites"
          value={weekStats.relancesJournalisees}
          hint="actions de suivi (hors notes)"
        />
        <KpiRadial
          label="En échange"
          value={inExchange}
          hint="Contacté + En discussion"
        />
        <KpiRadial
          label="Prêts à convertir"
          value={qualifiedOpen}
          hint="Intéressé + Devis envoyé"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StageBarChart
          data={weekBars}
          title="Nouveaux prospects — 4 semaines"
          subtitle={`Jusqu’à la semaine du ${weekStart.toLocaleDateString("fr-FR", { timeZone: "UTC" })}`}
        />
        <StageDonutChart data={byStage} />
      </div>

      {scopeMode === "user" ? (
        <GoalsProgressStrip
          progress={goalProgress}
          title={`Objectifs — ${scopeLabel}`}
          detailHref={objectifsHref}
          detailLabel="Objectifs"
        />
      ) : (
        <Surface className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-semibold text-msk-ink">
              Objectifs de l’équipe
            </p>
            <p className="mt-1 text-xs text-msk-ink/45">
              Vue combinée : choisissez un collaborateur pour voir ses objectifs
              individuels, ou ouvrez l’assignation globale.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionLink
              href="/crm/objectifs"
              icon={Target}
              variant="secondary"
              size="sm"
            >
              Objectifs
            </ActionLink>
          </div>
        </Surface>
      )}

      <p className="text-xs text-msk-ink/40">
        Semaine ouvrée :{" "}
        {weekStart.toLocaleDateString("fr-FR", { timeZone: "UTC" })} →{" "}
        {weekFri.toLocaleDateString("fr-FR", { timeZone: "UTC" })}
        {" · "}données jusqu’au{" "}
        {weekSun.toLocaleDateString("fr-FR", { timeZone: "UTC" })}
      </p>
    </PageShell>
  );
}
