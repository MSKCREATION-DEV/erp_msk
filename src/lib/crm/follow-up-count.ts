import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  OUTREACH_ACTIVITY_TYPES,
  idsMeetingMinOutreach,
} from "@/lib/crm/follow-up-meta";

export {
  OUTREACH_ACTIVITY_TYPES,
  RELANCE_GUIDE_THRESHOLD,
  formatRelanceCount,
  sumOutreachCounts,
  idsMeetingMinOutreach,
  isOutreachActivityType,
} from "@/lib/crm/follow-up-meta";

export function outreachActivityWhere(
  opportunityId?: string,
): Prisma.CrmActivityWhereInput {
  return {
    type: { in: OUTREACH_ACTIVITY_TYPES },
    ...(opportunityId ? { opportunityId } : {}),
  };
}

/** Compte les relances d’un deal. */
export async function countOutreachActivities(
  opportunityId: string,
): Promise<number> {
  return prisma.crmActivity.count({
    where: outreachActivityWhere(opportunityId),
  });
}

/**
 * Map opportunityId → N relances (1 requête groupBy).
 * `occurredBetween` borne les activités (filtre période CRM).
 */
export async function outreachCountByOpportunityIds(
  opportunityIds: string[],
  opts?: { occurredBetween?: { gte: Date; lte: Date } },
): Promise<Map<string, number>> {
  const ids = [...new Set(opportunityIds.filter(Boolean))];
  const map = new Map<string, number>();
  for (const id of ids) map.set(id, 0);
  if (ids.length === 0) return map;

  const rows = await prisma.crmActivity.groupBy({
    by: ["opportunityId"],
    where: {
      opportunityId: { in: ids },
      type: { in: OUTREACH_ACTIVITY_TYPES },
      ...(opts?.occurredBetween
        ? { occurredAt: opts.occurredBetween }
        : {}),
    },
    _count: { _all: true },
  });

  for (const row of rows) {
    if (row.opportunityId) {
      map.set(row.opportunityId, row._count._all);
    }
  }
  return map;
}

/** Total relances (outreach) pour un ou plusieurs owners, borné en date. */
export async function countOutreachInPeriod(opts: {
  ownerIds?: string[] | null;
  occurredBetween: { gte: Date; lte: Date };
}): Promise<number> {
  return prisma.crmActivity.count({
    where: {
      type: { in: OUTREACH_ACTIVITY_TYPES },
      occurredAt: opts.occurredBetween,
      ...(opts.ownerIds && opts.ownerIds.length > 0
        ? { opportunity: { ownerId: { in: opts.ownerIds } } }
        : {}),
    },
  });
}

/**
 * Map ownerId → N relances sur la période.
 * groupBy opportunityId puis agrégation owner — évite de charger toutes les rows activité.
 */
export async function outreachCountByOwnerInPeriod(opts: {
  ownerIds: string[];
  occurredBetween: { gte: Date; lte: Date };
}): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const id of opts.ownerIds) map.set(id, 0);
  if (opts.ownerIds.length === 0) return map;

  const byOpp = await prisma.crmActivity.groupBy({
    by: ["opportunityId"],
    where: {
      type: { in: OUTREACH_ACTIVITY_TYPES },
      occurredAt: opts.occurredBetween,
      opportunityId: { not: null },
      opportunity: { ownerId: { in: opts.ownerIds } },
    },
    _count: { _all: true },
  });
  const oppIds = byOpp
    .map((r) => r.opportunityId)
    .filter((id): id is string => Boolean(id));
  if (oppIds.length === 0) return map;

  const owners = await prisma.crmOpportunity.findMany({
    where: { id: { in: oppIds } },
    select: { id: true, ownerId: true },
  });
  const ownerByOpp = new Map(owners.map((o) => [o.id, o.ownerId]));
  for (const row of byOpp) {
    if (!row.opportunityId) continue;
    const ownerId = ownerByOpp.get(row.opportunityId);
    if (!ownerId) continue;
    map.set(ownerId, (map.get(ownerId) ?? 0) + row._count._all);
  }
  return map;
}

/** IDs de deals ayant au moins `min` relances (parmi une liste). */
export async function opportunityIdsWithMinOutreach(
  opportunityIds: string[],
  min: number,
): Promise<string[]> {
  if (min <= 0) return [...new Set(opportunityIds.filter(Boolean))];
  const map = await outreachCountByOpportunityIds(opportunityIds);
  return idsMeetingMinOutreach(map, min);
}
