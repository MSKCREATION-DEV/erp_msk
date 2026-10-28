import { prisma } from "@/lib/prisma";
import { weekEndSunday } from "@/lib/crm/week";
import { OUTREACH_ACTIVITY_TYPES } from "@/lib/crm/follow-up-count";
import { mapSeries, runSeries } from "@/lib/db/serial";

export type WeekStats = {
  newProspects: number;
  firstContacts: number;
  replies: number;
  inDiscussion: number;
  qualified: number;
  meetings: number;
  /** Tasks DONE (objectifs FOLLOW_UPS). */
  followUpsDone: number;
  /** Activités de suivi outreach (LOT-G — hors NOTE). */
  relancesJournalisees: number;
};

const EMPTY_STATS: WeekStats = {
  newProspects: 0,
  firstContacts: 0,
  replies: 0,
  inDiscussion: 0,
  qualified: 0,
  meetings: 0,
  followUpsDone: 0,
  relancesJournalisees: 0,
};

function asIdList(authorId: string | string[]): string[] {
  const ids = Array.isArray(authorId) ? authorId : [authorId];
  return [...new Set(ids.filter(Boolean))];
}

/**
 * Stats d’activité sur une plage pour 1 ou N owners (suivi = `ownerId`).
 * Activités comptées via `opportunity.ownerId` (pas `actorId`) pour coller au filtre collab.
 * Requêtes **séquentielles** — pool Prisma `connection_limit=1`.
 */
export async function computePeriodStats(
  authorId: string | string[],
  from: Date,
  to: Date,
): Promise<WeekStats> {
  const ids = asIdList(authorId);
  if (ids.length === 0) return { ...EMPTY_STATS };

  const ownerIn = { ownerId: { in: ids } };
  const oppOwner = { opportunity: { ownerId: { in: ids } } };
  const assigneeIn = { assigneeId: { in: ids } };
  const occurred = { occurredAt: { gte: from, lte: to } };

  const [
    newProspects,
    firstContacts,
    meetings,
    followUpsDone,
    relancesJournalisees,
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
          ...oppOwner,
          ...occurred,
          type: { in: ["APPEL", "WHATSAPP", "INSTAGRAM", "LINKEDIN", "EMAIL"] },
        },
      }),
    async () => {
      const [legacyRdv, apptDone] = await Promise.all([
        prisma.crmActivity.count({
          where: {
            ...oppOwner,
            ...occurred,
            type: "RDV",
          },
        }),
        prisma.crmAppointment.count({
          where: {
            ...assigneeIn,
            status: "DONE",
            completedAt: { gte: from, lte: to },
          },
        }),
      ]);
      return legacyRdv + apptDone;
    },
    () =>
      prisma.crmTask.count({
        where: {
          ...assigneeIn,
          status: "DONE",
          completedAt: { gte: from, lte: to },
        },
      }),
    () =>
      prisma.crmActivity.count({
        where: {
          ...oppOwner,
          ...occurred,
          type: { in: OUTREACH_ACTIVITY_TYPES },
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
          ...oppOwner,
          ...occurred,
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
    relancesJournalisees,
  };
}

/**
 * Stats semaine pour 1 ou N owners.
 */
export async function computeWeekStats(
  authorId: string | string[],
  weekStart: Date,
): Promise<WeekStats> {
  return computePeriodStats(authorId, weekStart, weekEndSunday(weekStart));
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
