import { prisma } from "@/lib/prisma";
import type { WeekStats } from "@/lib/crm/week-stats";
import { computeWeekStatsByOwner } from "@/lib/crm/week-stats";

export type GoalMetric =
  | "NEW_PROSPECTS"
  | "FIRST_CONTACTS"
  | "MEETINGS"
  | "FOLLOW_UPS";

export const GOAL_METRICS: GoalMetric[] = [
  "NEW_PROSPECTS",
  "FIRST_CONTACTS",
  "MEETINGS",
  "FOLLOW_UPS",
];

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

export type GoalProgressItem = {
  metric: GoalMetric;
  label: string;
  current: number;
  target: number;
  pct: number;
};

type GoalRow = {
  scope: string;
  userId: string | null;
  metric: string;
  target: number;
};

function applyGoalRows(
  rows: GoalRow[],
  userId?: string,
): Record<GoalMetric, number> {
  const out = { ...DEFAULT_GOALS };
  for (const r of rows) {
    if (r.scope === "TEAM" && r.metric in out) {
      out[r.metric as GoalMetric] = r.target;
    }
  }
  if (userId) {
    for (const r of rows) {
      if (
        r.scope === "USER" &&
        r.userId === userId &&
        r.metric in out
      ) {
        out[r.metric as GoalMetric] = r.target;
      }
    }
  }
  return out;
}

/** Cibles TEAM brutes (ou défauts si aucune ligne). */
export async function loadTeamGoals(): Promise<Record<GoalMetric, number>> {
  const rows = await prisma.crmWeeklyGoal.findMany({
    where: { scope: "TEAM", userId: null },
  });
  return applyGoalRows(rows);
}

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
  return applyGoalRows(rows, userId);
}

/**
 * Une seule requête pour N collabs (TEAM + USER).
 * À préférer à N× `resolveGoals` (pool connection_limit=1).
 */
export async function resolveGoalsMap(
  userIds: string[],
): Promise<Map<string, Record<GoalMetric, number>>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const rows = await prisma.crmWeeklyGoal.findMany({
    where: {
      OR: [
        { scope: "TEAM", userId: null },
        ...(ids.length
          ? [{ scope: "USER" as const, userId: { in: ids } }]
          : []),
      ],
    },
  });
  const map = new Map<string, Record<GoalMetric, number>>();
  for (const id of ids) {
    map.set(id, applyGoalRows(rows, id));
  }
  return map;
}

/** Progression semaine vs cibles résolues. */
export function buildGoalProgress(
  goals: Record<GoalMetric, number>,
  weekStats: WeekStats,
): GoalProgressItem[] {
  const currentByMetric: Record<GoalMetric, number> = {
    NEW_PROSPECTS: weekStats.newProspects,
    FIRST_CONTACTS: weekStats.firstContacts,
    MEETINGS: weekStats.meetings,
    FOLLOW_UPS: weekStats.followUpsDone,
  };
  return GOAL_METRICS.map((metric) => {
    const target = goals[metric];
    const current = currentByMetric[metric];
    const pct =
      target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    return {
      metric,
      label: GOAL_LABELS[metric],
      current,
      target,
      pct,
    };
  });
}

export type CollabGoalSnapshot = {
  userId: string;
  firstName: string;
  lastName: string;
  goals: Record<GoalMetric, number>;
  progress: GoalProgressItem[];
};

/**
 * Snapshots objectifs + stats pour une liste de collabs.
 * Batch goals (1 query) + stats séquentielles — compatible pool limit=1.
 */
export async function resolveGoalsSnapshots(
  members: { id: string; firstName: string; lastName: string }[],
  weekStart: Date,
): Promise<CollabGoalSnapshot[]> {
  if (members.length === 0) return [];
  const goalsMap = await resolveGoalsMap(members.map((m) => m.id));
  const statsMap = await computeWeekStatsByOwner(
    members.map((m) => m.id),
    weekStart,
  );
  return members.map((m) => {
    const goals = goalsMap.get(m.id) ?? { ...DEFAULT_GOALS };
    const weekStats = statsMap.get(m.id) ?? {
      newProspects: 0,
      firstContacts: 0,
      replies: 0,
      inDiscussion: 0,
      qualified: 0,
      meetings: 0,
      followUpsDone: 0,
      relancesJournalisees: 0,
    };
    return {
      userId: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      goals,
      progress: buildGoalProgress(goals, weekStats),
    };
  });
}
