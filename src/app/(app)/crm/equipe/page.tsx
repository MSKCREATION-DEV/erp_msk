import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileText, FolderOpen, Target, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { crmVisibility, dealOwnerScopeWhere } from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import { STAGE_ORDER } from "@/lib/crm/labels";
import { resolveGoalsSnapshots } from "@/lib/crm/goals";
import { weekStartMonday } from "@/lib/crm/week";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ActionLink } from "@/components/ui/action-link";
import { ScopeFocusBanner } from "@/components/crm/scope-focus-banner";
import { EquipeCollabCard } from "@/components/crm/equipe-collab-card";

export const metadata: Metadata = { title: "Vue Équipe" };

type OwnerRow = {
  name: string;
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
  searchParams: Promise<{ owner?: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const vis = crmVisibility(user);
  if (vis === "own") redirect("/crm/prospects");

  const sp = await searchParams;
  const canManageGoals =
    user.isSuperAdmin || hasPermission(user, "crm.reports.global");

  const teamIds = await commercialTeamUserIds();
  const weekStart = weekStartMonday();

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
    row.total += 1;
    const stage = d.stage === "NEGOCIATION" ? "DEVIS_ENVOYE" : d.stage;
    row.byStage[stage] = (row.byStage[stage] ?? 0) + 1;
    if (stage === "GAGNE") row.clients += 1;
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

  const filterOwner =
    sp.owner && byOwner.has(sp.owner) ? sp.owner : null;

  const goalByOwner = new Map(
    (await resolveGoalsSnapshots(members, weekStart)).map((s) => [
      s.userId,
      s.progress,
    ]),
  );

  let rows = Array.from(byOwner.entries()).sort(
    (a, b) => b[1].total - a[1].total,
  );
  if (filterOwner) {
    rows = rows.filter(([id]) => id === filterOwner);
  }

  const filteredName = filterOwner
    ? byOwner.get(filterOwner)?.name
    : null;

  return (
    <PageShell>
      <PageHeader
        title="Vue Équipe"
        description={
          filteredName
            ? `${filteredName} — prospects, objectifs et accès rapides.`
            : "Cliquez le nom d’une carte pour voir un collaborateur. Objectifs, rapport et prospects suivent le même filtre."
        }
        backHref="/commercial"
        backLabel="Retour Menu"
        breadcrumbs={[{ label: "Commercial", href: "/commercial" }]}
        actions={
          canManageGoals ? (
            <ActionLink
              href={
                filterOwner
                  ? `/crm/objectifs?collab=${filterOwner}`
                  : "/crm/objectifs"
              }
              icon={Target}
              variant="secondary"
            >
              Objectifs
            </ActionLink>
          ) : null
        }
      />

      {filterOwner && filteredName ? (
        <ScopeFocusBanner
          label={filteredName}
          clearHref="/crm/equipe"
          clearLabel="Toute l’équipe"
        >
          {canManageGoals ? (
            <ActionLink
              href={`/crm/objectifs?collab=${filterOwner}`}
              icon={Target}
              variant="secondary"
              size="sm"
            >
              Assigner objectifs
            </ActionLink>
          ) : null}
          <ActionLink
            href={`/crm/rapport-semaine?owner=${filterOwner}`}
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
              byStage={row.byStage}
              goals={goalByOwner.get(ownerId) ?? []}
              canManageGoals={canManageGoals}
              focused={filterOwner === ownerId}
            />
          ))}
        </div>
      )}

      {!filterOwner && rows.length > 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-msk-ink/40">
          <Users className="h-3.5 w-3.5" aria-hidden />
          Astuce : clic sur le nom d’une carte pour voir ce collaborateur —
          Objectifs, Rapport et Prospects suivent le même filtre.
        </p>
      ) : null}
    </PageShell>
  );
}
