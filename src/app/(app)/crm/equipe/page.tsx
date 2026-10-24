import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { FileText, FolderOpen, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { crmVisibility, dealOwnerScopeWhere } from "@/lib/crm/scope";
import {
  commercialTeamUserIds,
  listCommercialRoster,
  rosterToOwnerOptions,
} from "@/lib/crm/team";
import { STAGE_ORDER } from "@/lib/crm/labels";
import { normalizeUiStage } from "@/lib/crm/guide-rules";
import { resolveGoalsSnapshots } from "@/lib/crm/goals";
import { listWeekOptions } from "@/lib/crm/week";
import { outreachCountByOwnerInPeriod } from "@/lib/crm/follow-up-count";
import {
  buildCrmScopeHref,
  buildPortfolioProspectsHref,
  crmScopeToSearchParams,
  dateRangeFilter,
  goalsCompatibleWithPeriod,
  normalizeSearchParams,
  parseCrmOwner,
  parseCrmPeriod,
  resolveCrmScopeLens,
  showStockWidgets,
} from "@/lib/crm/scope-period";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ActionLink } from "@/components/ui/action-link";
import { ScopeFocusBanner } from "@/components/crm/scope-focus-banner";
import { EquipeCollabCard } from "@/components/crm/equipe-collab-card";
import { CrmScopeBar } from "@/components/crm/crm-scope-bar";
import { CrmScopeContext } from "@/components/crm/crm-scope-context";

export const metadata: Metadata = { title: "Vue Équipe" };

type OwnerRow = {
  name: string;
  /** Prospects actifs (hors Client). */
  total: number;
  overdue: number;
  caOpen: number;
  clients: number;
  interesses: number;
  byStage: Record<string, number>;
};

function emptyRow(name: string): OwnerRow {
  return {
    name,
    total: 0,
    overdue: 0,
    caOpen: 0,
    clients: 0,
    interesses: 0,
    byStage: Object.fromEntries(STAGE_ORDER.map((s) => [s, 0])),
  };
}

export default async function CrmEquipePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const vis = crmVisibility(user);
  if (vis === "own") redirect("/crm/prospects");

  const rawSp = await searchParams;
  const sp = normalizeSearchParams(rawSp);
  const teamIds = await commercialTeamUserIds();
  const period = parseCrmPeriod(sp);
  const lens = resolveCrmScopeLens(period);
  const showStocks = showStockWidgets(lens);
  const showGoals = goalsCompatibleWithPeriod(period);
  const weeks = listWeekOptions({ fromYear: new Date().getFullYear() - 1 });
  const occurredBetween = dateRangeFilter(period.from, period.to);

  const deals = await prisma.crmOpportunity.findMany({
    where: dealOwnerScopeWhere(user, teamIds),
    select: {
      id: true,
      stage: true,
      followUpAt: true,
      budgetXof: true,
      ownerId: true,
      owner: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const now = Date.now();
  const byOwner = new Map<string, OwnerRow>();

  for (const d of deals) {
    if (!byOwner.has(d.ownerId)) {
      byOwner.set(
        d.ownerId,
        emptyRow(`${d.owner.firstName} ${d.owner.lastName}`),
      );
    }
    const row = byOwner.get(d.ownerId)!;
    const stage = normalizeUiStage(d.stage);
    row.byStage[stage] = (row.byStage[stage] ?? 0) + 1;
    if (stage === "GAGNE") {
      row.clients += 1;
    } else {
      row.total += 1;
    }
    if (stage === "INTERESSE") row.interesses += 1;
    if (stage !== "GAGNE" && stage !== "PERDU") {
      row.caOpen += d.budgetXof ?? 0;
    }
    if (
      d.followUpAt &&
      d.followUpAt.getTime() < now &&
      stage !== "GAGNE" &&
      stage !== "PERDU"
    ) {
      row.overdue += 1;
    }
  }

  const members = await listCommercialRoster({ mode: "team" });

  for (const m of members) {
    if (!byOwner.has(m.id)) {
      byOwner.set(m.id, emptyRow(`${m.firstName} ${m.lastName}`));
    }
  }

  const owners = rosterToOwnerOptions(members);
  const ownerScope = parseCrmOwner(
    sp,
    user,
    owners.map((o) => o.value),
  );
  const filterOwner = ownerScope.ownerId;

  const goalByOwner = showGoals
    ? new Map(
        (await resolveGoalsSnapshots(members, period)).map((s) => [
          s.userId,
          s.progress,
        ]),
      )
    : new Map();

  const relancesByOwner = await outreachCountByOwnerInPeriod({
    ownerIds: members.map((m) => m.id),
    occurredBetween,
  });

  let rows = Array.from(byOwner.entries()).sort(
    (a, b) => b[1].total - a[1].total,
  );
  if (filterOwner) {
    rows = rows.filter(([id]) => id === filterOwner);
  }

  const filteredName = filterOwner
    ? byOwner.get(filterOwner)?.name
    : null;

  const periodOnlyParams = crmScopeToSearchParams({
    period,
    ownerId: null,
    canFilterOwners: true,
    forcePeriod: true,
  });
  const baseQuery = periodOnlyParams.toString();
  const clearScopeHref = buildCrmScopeHref("/crm/equipe", {
    period,
    ownerId: null,
    canFilterOwners: true,
  });

  const scopeKey = `${period.mode}:${period.fromIso}:${period.toIso}:${filterOwner ?? "all"}`;

  return (
    <PageShell key={scopeKey}>
      <PageHeader
        title="Vue Équipe"
        description={
          showStocks
            ? filteredName
              ? `${filteredName} — portefeuille à date · relances ${period.label.toLowerCase()}.`
              : `Cliquez le nom d’une carte · ${period.label}.`
            : filteredName
              ? `${filteredName} — activité ${period.label.toLowerCase()} (sans stocks à date).`
              : `Activité historique · ${period.label}.`
        }
        backHref="/commercial"
        backLabel="Retour Menu"
        breadcrumbs={[{ label: "Commercial", href: "/commercial" }]}
      />

      <CrmScopeBar
        mode={period.mode}
        semaine={period.semaine}
        mois={period.mois}
        on={period.on}
        from={period.fromIso}
        to={period.toIso}
        weeks={weeks}
        ownerId={filterOwner}
        owners={owners}
        canFilterOwners={ownerScope.canFilterOwners}
        periodLabel={period.label}
        lens={lens}
      />

      {filterOwner && filteredName ? (
        <ScopeFocusBanner
          label={filteredName}
          periodLabel={period.label}
          lens={lens}
          clearHref={clearScopeHref}
          clearAriaLabel="Voir toute l’équipe"
          resetHref={buildCrmScopeHref("/crm/equipe", {
            period: parseCrmPeriod({ periode: "semaine" }),
            ownerId: filterOwner,
            canFilterOwners: true,
          })}
          actions={
            <>
              <ActionLink
                href={buildCrmScopeHref("/crm/rapport-semaine", {
                  period: { ...period, mode: "semaine" },
                  ownerId: filterOwner,
                  canFilterOwners: true,
                })}
                icon={FileText}
                variant="secondary"
                size="sm"
              >
                Rapport
              </ActionLink>
              <ActionLink
                href={buildPortfolioProspectsHref({
                  period,
                  ownerId: filterOwner,
                  canFilterOwners: true,
                })}
                icon={FolderOpen}
                variant="secondary"
                size="sm"
              >
                Prospects
              </ActionLink>
            </>
          }
        />
      ) : (
        <CrmScopeContext
          lens={lens}
          periodLabel={period.label}
          ownerLabel={null}
          resetHref={buildCrmScopeHref("/crm/equipe", {
            period: parseCrmPeriod({ periode: "semaine" }),
            ownerId: null,
            canFilterOwners: true,
          })}
        />
      )}

      {rows.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/40">
          Aucun collaborateur dans le périmètre équipe.
        </Surface>
      ) : (
        <div className="space-y-4">
          {rows.map(([ownerId, row]) => (
            <EquipeCollabCard
              key={ownerId}
              ownerId={ownerId}
              name={row.name}
              total={row.total}
              caOpen={row.caOpen}
              interesses={row.interesses}
              overdue={row.overdue}
              relancesFaites={relancesByOwner.get(ownerId) ?? 0}
              byStage={row.byStage}
              goals={goalByOwner.get(ownerId) ?? []}
              focused={filterOwner === ownerId}
              periodLabel={period.label}
              baseQuery={baseQuery}
              rapportHref={buildCrmScopeHref("/crm/rapport-semaine", {
                period: { ...period, mode: "semaine" },
                ownerId,
                canFilterOwners: true,
              })}
              prospectsHref={buildPortfolioProspectsHref({
                period,
                ownerId,
                canFilterOwners: true,
              })}
              showStocks={showStocks}
              showGoals={showGoals}
            />
          ))}
        </div>
      )}

      {!filterOwner && rows.length > 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-msk-ink/40">
          <Users className="h-3.5 w-3.5" aria-hidden />
          Astuce : filtrez par collaborateur ou cliquez le nom d’une carte —
          Rapport et Prospects suivent le même filtre.
        </p>
      ) : null}
    </PageShell>
  );
}
