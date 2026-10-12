import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { crmVisibility, dealOwnerScopeWhere } from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import { STAGE_LABELS, STAGE_ORDER, formatXof } from "@/lib/crm/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { KpiRadial } from "@/components/crm/kpi-radial";

export const metadata: Metadata = { title: "Vue Équipe" };

export default async function CrmEquipePage() {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const vis = crmVisibility(user);
  if (vis === "own") redirect("/crm/prospects");

  const teamIds = await commercialTeamUserIds();
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
  type Row = {
    name: string;
    total: number;
    overdue: number;
    caOpen: number;
    clients: number;
    interesses: number;
    byStage: Record<string, number>;
  };
  const byOwner = new Map<string, Row>();

  for (const d of deals) {
    const key = d.ownerId;
    if (!byOwner.has(key)) {
      byOwner.set(key, {
        name: `${d.owner.firstName} ${d.owner.lastName}`,
        total: 0,
        overdue: 0,
        caOpen: 0,
        clients: 0,
        interesses: 0,
        byStage: Object.fromEntries(STAGE_ORDER.map((s) => [s, 0])),
      });
    }
    const row = byOwner.get(key)!;
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

  const rows = Array.from(byOwner.entries()).sort(
    (a, b) => b[1].total - a[1].total,
  );

  return (
    <PageShell>
      <PageHeader
        title="Vue Équipe"
        description="Portefeuille par collab — volumes, retards, CA en cours."
        backHref="/commercial"
        backLabel="Retour Menu"
        breadcrumbs={[{ label: "Commercial", href: "/commercial" }]}
      />

      {rows.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/40">
          Aucun prospect dans le périmètre équipe.
        </Surface>
      ) : (
        <div className="space-y-4">
          {rows.map(([ownerId, row]) => {
            return (
              <Surface key={ownerId} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-msk-ink">
                      {row.name}
                    </h2>
                    <p className="mt-1 text-sm text-msk-ink/50">
                      {row.total} prospect{row.total > 1 ? "s" : ""} · CA en
                      cours {formatXof(row.caOpen)}
                    </p>
                  </div>
                  <Link
                    prefetch={false}
                    href={`/crm/prospects?owner=${ownerId}`}
                    className="text-sm font-medium text-msk-blue hover:underline"
                  >
                    Voir le portefeuille →
                  </Link>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <KpiRadial
                    label="Portefeuille"
                    value={row.total}
                    hint="dossiers suivis"
                  />
                  <KpiRadial
                    label="Intéressés"
                    value={row.interesses}
                    hint="à convertir"
                  />
                  <KpiRadial
                    label="Retards"
                    value={row.overdue}
                    tone={row.overdue > 0 ? "coral" : "blue"}
                    hint="relances dues"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {STAGE_ORDER.map((s) => {
                    const n = row.byStage[s] ?? 0;
                    if (n === 0) return null;
                    return (
                      <Badge
                        key={s}
                        tone={
                          s === "PERDU"
                            ? "coral"
                            : s === "GAGNE"
                              ? "success"
                              : "muted"
                        }
                      >
                        {STAGE_LABELS[s]} · {n}
                      </Badge>
                    );
                  })}
                </div>
              </Surface>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
