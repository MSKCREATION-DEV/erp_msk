import type { CrmPipelineStage, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeUiStage } from "@/lib/crm/guide-rules";
import { STAGE_ORDER } from "@/lib/crm/labels";

export type EquipeOwnerAgg = {
  ownerId: string;
  total: number;
  overdue: number;
  caOpen: number;
  clients: number;
  interesses: number;
  byStage: Record<string, number>;
};

function emptyAgg(ownerId: string): EquipeOwnerAgg {
  return {
    ownerId,
    total: 0,
    overdue: 0,
    caOpen: 0,
    clients: 0,
    interesses: 0,
    byStage: Object.fromEntries(STAGE_ORDER.map((s) => [s, 0])),
  };
}

/**
 * Agrégats Vue Équipe via groupBy SQL — pas de findMany de toutes les opportunités.
 */
export async function loadEquipeOwnerAggregates(
  where: Prisma.CrmOpportunityWhereInput,
): Promise<Map<string, EquipeOwnerAgg>> {
  const byOwner = new Map<string, EquipeOwnerAgg>();

  const stageGroups = await prisma.crmOpportunity.groupBy({
    by: ["ownerId", "stage"],
    where,
    _count: { _all: true },
    _sum: { budgetXof: true },
  });

  for (const g of stageGroups) {
    if (!byOwner.has(g.ownerId)) byOwner.set(g.ownerId, emptyAgg(g.ownerId));
    const row = byOwner.get(g.ownerId)!;
    const stage = normalizeUiStage(g.stage as CrmPipelineStage);
    const n = g._count._all;
    row.byStage[stage] = (row.byStage[stage] ?? 0) + n;
    if (stage === "GAGNE") {
      row.clients += n;
    } else if (stage !== "PERDU") {
      row.total += n;
      row.caOpen += Number(g._sum.budgetXof ?? 0);
    }
    if (stage === "INTERESSE") row.interesses += n;
  }

  const overdueGroups = await prisma.crmOpportunity.groupBy({
    by: ["ownerId"],
    where: {
      AND: [
        where,
        {
          stage: { notIn: ["GAGNE", "PERDU"] },
          followUpAt: { lt: new Date() },
        },
      ],
    },
    _count: { _all: true },
  });
  for (const g of overdueGroups) {
    if (!byOwner.has(g.ownerId)) byOwner.set(g.ownerId, emptyAgg(g.ownerId));
    byOwner.get(g.ownerId)!.overdue = g._count._all;
  }

  return byOwner;
}
