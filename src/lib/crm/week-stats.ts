import { prisma } from "@/lib/prisma";
import { weekEndSunday } from "@/lib/crm/week";

export type WeekStats = {
  newProspects: number;
  firstContacts: number;
  replies: number;
  inDiscussion: number;
  qualified: number;
  meetings: number;
  followUpsDone: number;
};

/** Préremplissage rapport depuis l’activité CRM de la semaine. */
export async function computeWeekStats(
  authorId: string,
  weekStart: Date,
): Promise<WeekStats> {
  const from = weekStart;
  const to = weekEndSunday(weekStart);

  const [newProspects, firstContacts, meetings, followUpsDone, inDiscussion, qualified] =
    await Promise.all([
      prisma.crmOpportunity.count({
        where: {
          ownerId: authorId,
          createdAt: { gte: from, lte: to },
        },
      }),
      prisma.crmActivity.count({
        where: {
          actorId: authorId,
          occurredAt: { gte: from, lte: to },
          type: { in: ["APPEL", "WHATSAPP", "INSTAGRAM", "LINKEDIN", "EMAIL"] },
        },
      }),
      prisma.crmActivity.count({
        where: {
          actorId: authorId,
          occurredAt: { gte: from, lte: to },
          type: "RDV",
        },
      }),
      prisma.crmTask.count({
        where: {
          assigneeId: authorId,
          status: "DONE",
          completedAt: { gte: from, lte: to },
        },
      }),
      prisma.crmOpportunity.count({
        where: {
          ownerId: authorId,
          stage: { in: ["CONTACTE", "QUALIFICATION"] },
        },
      }),
      prisma.crmOpportunity.count({
        where: {
          ownerId: authorId,
          stage: { in: ["INTERESSE", "DEVIS_ENVOYE"] },
        },
      }),
    ]);

  // Réponses : activités hors 1er contact pure — approx. notes + RDV + canaux après contact
  const replies = await prisma.crmActivity.count({
    where: {
      actorId: authorId,
      occurredAt: { gte: from, lte: to },
      type: { in: ["NOTE", "RDV", "APPEL"] },
      summary: { contains: "réponse", mode: "insensitive" },
    },
  });

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
