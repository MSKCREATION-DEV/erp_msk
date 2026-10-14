import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileText, FolderOpen, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { crmVisibility, dealOwnerScopeWhere } from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import { STAGE_ORDER } from "@/lib/crm/labels";
import { normalizeUiStage } from "@/lib/crm/guide-rules";
import { resolveGoalsSnapshots } from "@/lib/crm/goals";
import { listWeekOptions, parseWeekParam } from "@/lib/crm/week";
import { outreachCountByOwnerInPeriod } from "@/lib/crm/follow-up-count";
import {
  dateRangeFilter,
  parseCrmOwner,
  parseCrmPeriod,
} from "@/lib/crm/scope-period";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ActionLink } from "@/components/ui/action-link";
import { ScopeFocusBanner } from "@/components/crm/scope-focus-banner";
import { EquipeCollabCard } from "@/components/crm/equipe-collab-card";
import { CrmScopeBar } from "@/components/crm/crm-scope-bar";

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
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const vis = crmVisibility(user);
  if (vis === "own") redirect("/crm/prospects");

  const sp = await searchParams;
  const teamIds = await commercialTeamUserIds();
  const period = parseCrmPeriod(sp);
  const weekStart = parseWeekParam(period.semaine);
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

  const memberIds = [...new Set([...teamIds, ...byOwner.keys()])];
  const members = await prisma.user.findMany({
    where: { id: { in: memberIds }, status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  for (const m of members) {
    if (!byOwner.has(m.id)) {
      byOwner.set(m.id, emptyRow(`${m.firstName} ${m.lastName}`));
    }
  }

  const owners = members.map((m) => ({
    value: m.id,
    label: `${m.firstName} ${m.lastName}`,
  }));
  const ownerScope = parseCrmOwner(
    sp,
    user,
    owners.map((o) => o.value),
  );
  const filterOwner = ownerScope.ownerId;

  const goalByOwner = new Map(
    (await resolveGoalsSnapshots(members, weekStart)).map((s) => [
      s.userId,
      s.progress,
    ]),
  );

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

  const clearScopeHref = (() => {
    const p = new URLSearchParams();
    if (period.mode !== "semaine") p.set("periode", period.mode);
    if (period.mode === "mois") p.set("mois", period.mois);
    if (period.mode === "jour") p.set("on", period.on);
    if (period.mode === "plage") {
      p.set("from", period.fromIso);
      p.set("to", period.toIso);
    }
    if (period.mode === "semaine") {
      const current = weeks.find((w) => w.isCurrent)?.value;
      if (period.semaine !== current) p.set("semaine", period.semaine);
    }
    const s = p.toString();
    return s ? `/crm/equipe?${s}` : "/crm/equipe";
  })();

  return (
    <PageShell>
      <PageHeader
        title="Vue Équipe"
        description={
          filteredName
            ? `${filteredName} — prospects, rapport et accès rapides · ${period.label}.`
            : `Cliquez le nom d’une carte pour voir un collaborateur · ${period.label}.`
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
      />

      {filterOwner && filteredName ? (
        <ScopeFocusBanner
          label={filteredName}
          clearHref={clearScopeHref}
          clearAriaLabel="Voir toute l’équipe"
        >
          <ActionLink
            href={`/crm/rapport-semaine?owner=${filterOwner}&semaine=${period.semaine}`}
            icon={FileText}
            variant="secondary"
            size="sm"
          >
            Rapport
          </ActionLink>
          <ActionLink
            href={`/crm/prospects?owner=${filterOwner}`}
            icon={FolderOpen}
            variant="secondary"
            size="sm"
          >
            Prospects
          </ActionLink>
        </ScopeFocusBanner>
      ) : null}

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
