import { prisma } from "@/lib/prisma";

export type GoalMetric =
  | "NEW_PROSPECTS"
  | "FIRST_CONTACTS"
  | "MEETINGS"
  | "FOLLOW_UPS";

export const DEFAULT_GOALS: Record<GoalMetric, number> = {
  NEW_PROSPECTS: 15,
  FIRST_CONTACTS: 10,
  MEETINGS: 1,
  FOLLOW_UPS: 10,
};

export const GOAL_LABELS: Record<GoalMetric, string> = {
  NEW_PROSPECTS: "Nouveaux prospects",
  FIRST_CONTACTS: "Premiers contacts",
  MEETINGS: "RDV",
  FOLLOW_UPS: "Relances faites",
};

/** Cible effective : override USER > TEAM > défaut. */
export async function resolveGoals(
  userId: string,
): Promise<Record<GoalMetric, number>> {
  const rows = await prisma.crmWeeklyGoal.findMany({
    where: {
      OR: [
        { scope: "TEAM", userId: null },
        { scope: "USER", userId },
      ],
    },
  });

  const out = { ...DEFAULT_GOALS };
  for (const r of rows) {
    if (r.scope === "TEAM" && r.metric in out) {
      out[r.metric as GoalMetric] = r.target;
    }
  }
  for (const r of rows) {
    if (r.scope === "USER" && r.userId === userId && r.metric in out) {
      out[r.metric as GoalMetric] = r.target;
    }
  }
  return out;
}
