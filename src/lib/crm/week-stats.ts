import { prisma } from "@/lib/prisma";
import { weekEndSunday } from "@/lib/crm/week";
import { mapSeries, runSeries } from "@/lib/db/serial";

export type WeekStats = {
  newProspects: number;
  firstContacts: number;
  replies: number;
  inDiscussion: number;
  qualified: number;
  meetings: number;
  followUpsDone: number;
};

const EMPTY_STATS: WeekStats = {
  newProspects: 0,
  firstContacts: 0,
  replies: 0,
  inDiscussion: 0,
  qualified: 0,
  meetings: 0,
  followUpsDone: 0,
};

function asIdList(authorId: string | string[]): string[] {
  const ids = Array.isArray(authorId) ? authorId : [authorId];
  return [...new Set(ids.filter(Boolean))];
}

/**
 * Stats semaine pour 1 ou N owners.
 * Requêtes **séquentielles** — pool Prisma `connection_limit=1`.
 */
export async function computeWeekStats(
  authorId: string | string[],
  weekStart: Date,
): Promise<WeekStats> {
  const ids = asIdList(authorId);
  if (ids.length === 0) return { ...EMPTY_STATS };

  const from = weekStart;
  const to = weekEndSunday(weekStart);
  const ownerIn = { ownerId: { in: ids } };
  const actorIn = { actorId: { in: ids } };
  const assigneeIn = { assigneeId: { in: ids } };

  const [
    newProspects,
    firstContacts,
    meetings,
    followUpsDone,
    inDiscussion,
    qualified,
    replies,
  ] = await runSeries([
    () =>
      prisma.crmOpportunity.count({
        where: { ...ownerIn, createdAt: { gte: from, lte: to } },
      }),
    () =>
      prisma.crmActivity.count({
        where: {
          ...actorIn,
          occurredAt: { gte: from, lte: to },
          type: { in: ["APPEL", "WHATSAPP", "INSTAGRAM", "LINKEDIN", "EMAIL"] },
        },
      }),
    () =>
      prisma.crmActivity.count({
        where: {
          ...actorIn,
          occurredAt: { gte: from, lte: to },
          type: "RDV",
        },
      }),
    () =>
      prisma.crmTask.count({
        where: {
          ...assigneeIn,
          status: "DONE",
          completedAt: { gte: from, lte: to },
        },
      }),
    () =>
      prisma.crmOpportunity.count({
        where: {
          ...ownerIn,
          stage: { in: ["CONTACTE", "QUALIFICATION"] },
        },
      }),
    () =>
      prisma.crmOpportunity.count({
        where: {
          ...ownerIn,
          stage: { in: ["INTERESSE", "DEVIS_ENVOYE"] },
        },
      }),
    () =>
      prisma.crmActivity.count({
        where: {
          ...actorIn,
          occurredAt: { gte: from, lte: to },
          type: { in: ["NOTE", "RDV", "APPEL"] },
          summary: { contains: "réponse", mode: "insensitive" },
        },
      }),
  ]);

  return {
    newProspects,
    firstContacts,
    replies,
    inDiscussion,
    qualified,
    meetings,
    followUpsDone,
  };
}

/** Stats par collaborateur — une série par user (pas de Promise.all). */
export async function computeWeekStatsByOwner(
  ownerIds: string[],
  weekStart: Date,
): Promise<Map<string, WeekStats>> {
  const ids = [...new Set(ownerIds.filter(Boolean))];
  const entries = await mapSeries(ids, async (id) => {
    const stats = await computeWeekStats(id, weekStart);
    return [id, stats] as const;
  });
  return new Map(entries);
}
