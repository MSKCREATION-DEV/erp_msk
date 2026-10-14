import type { CrmActivityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MIN_ACTIVITIES_BEFORE_LOST } from "@/lib/crm/guide-rules";

/**
 * LOT-G — activités de suivi comptées comme « relances ».
 * Exclut NOTE (journaux système / libres).
 */
export const OUTREACH_ACTIVITY_TYPES: CrmActivityType[] = [
  "APPEL",
  "WHATSAPP",
  "INSTAGRAM",
  "LINKEDIN",
  "EMAIL",
  "RDV",
  "AUTRE",
];

/** Seuil GUIDE / badge coral (≥ N relances). */
export const RELANCE_GUIDE_THRESHOLD = MIN_ACTIVITIES_BEFORE_LOST;

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
 */
export async function outreachCountByOpportunityIds(
  opportunityIds: string[],
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

/** Filtre pur Map id→count (testable sans DB). */
export function idsMeetingMinOutreach(
  counts: Map<string, number>,
  min: number,
): string[] {
  if (min <= 0) return [...counts.keys()];
  return [...counts.entries()]
    .filter(([, n]) => n >= min)
    .map(([id]) => id);
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

export function formatRelanceCount(n: number): string {
  return `${Math.max(0, Math.trunc(n))}×`;
}

/** Somme des N relances d’une Map id→count. */
export function sumOutreachCounts(counts: Map<string, number>): number {
  let total = 0;
  for (const n of counts.values()) total += n;
  return total;
}

/** NOTE exclue du compteur historique. */
export function isOutreachActivityType(type: CrmActivityType): boolean {
  return (OUTREACH_ACTIVITY_TYPES as readonly string[]).includes(type);
}
