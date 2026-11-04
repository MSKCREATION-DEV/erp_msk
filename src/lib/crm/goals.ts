import "server-only";

import { prisma } from "@/lib/prisma";
import type { WeekStats } from "@/lib/crm/week-stats";
import { computePeriodStats } from "@/lib/crm/week-stats";
import type { CrmPeriodScope } from "@/lib/crm/scope-period";
import {
  type GoalPeriodGrain,
  periodModeToGrain,
  periodStartForGrain,
} from "@/lib/crm/goal-scale";
import {
  DEFAULT_GOALS,
  GOAL_LABELS,
  GOAL_METRICS,
  type GoalMetric,
  type GoalProgressItem,
} from "@/lib/crm/goals-meta";
import {
  applyRowsForPeriod,
  defaultsForGrain,
  resolveMetricTargetFromRows,
  sumEffectiveGoalTargets,
  type GoalRow,
} from "@/lib/crm/goals-resolve";

export type { GoalMetric, GoalProgressItem };
export { DEFAULT_GOALS, GOAL_LABELS, GOAL_METRICS };
export {
  resolveMetricTargetFromRows,
  sumEffectiveGoalTargets,
} from "@/lib/crm/goals-resolve";

async function loadGoalRows(userIds?: string[]): Promise<GoalRow[]> {
  const ids = userIds ? [...new Set(userIds.filter(Boolean))] : [];
  return prisma.crmPeriodGoal.findMany({
    where: {
      OR: [
        { scope: "TEAM", userId: null },
        ...(ids.length
          ? [{ scope: "USER" as const, userId: { in: ids } }]
          : []),
      ],
    },
  });
}

function grainAndStart(period: CrmPeriodScope): {
  grain: GoalPeriodGrain;
  periodStart: Date;
} | null {
  const grain = periodModeToGrain(period.mode);
  if (!grain) return null;
  return { grain, periodStart: periodStartForGrain(grain, period) };
}

/** Cibles TEAM (modèle commun) pour la période affichée (ou défauts). */
export async function loadTeamGoalsForPeriod(
  period: CrmPeriodScope,
): Promise<Record<GoalMetric, number>> {
  const gs = grainAndStart(period);
  if (!gs) return defaultsForGrain("WEEK");
  const rows = await loadGoalRows();
  return applyRowsForPeriod(rows, gs.grain, gs.periodStart);
}

/** Charge la somme des objectifs effectifs pour une liste d’userIds. */
export async function loadSummedOperationalGoalsForPeriod(
  userIds: string[],
  period: CrmPeriodScope,
): Promise<Record<GoalMetric, number>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return defaultsForGrain("WEEK");
  const map = await resolveGoalsMapForPeriod(ids, period);
  return sumEffectiveGoalTargets(ids.map((id) => map.get(id)!).filter(Boolean));
}

/** @deprecated Prefer loadTeamGoalsForPeriod — alias semaine courante absente. */
export async function loadTeamGoals(): Promise<Record<GoalMetric, number>> {
  const rows = await prisma.crmPeriodGoal.findMany({
    where: { scope: "TEAM", userId: null },
  });
  const weekRows = rows.filter((r) => r.periodType === "WEEK");
  if (weekRows.length === 0) return { ...DEFAULT_GOALS };
  const latest = weekRows.reduce((a, b) =>
    a.periodStart > b.periodStart ? a : b,
  );
  return applyRowsForPeriod(rows, "WEEK", latest.periodStart);
}

/** Cible effective USER > TEAM > défaut pour une période. */
export async function resolveGoalsForPeriod(
  userId: string,
  period: CrmPeriodScope,
): Promise<Record<GoalMetric, number>> {
  const gs = grainAndStart(period);
  if (!gs) return defaultsForGrain("WEEK");
  const rows = await loadGoalRows([userId]);
  return applyRowsForPeriod(rows, gs.grain, gs.periodStart, userId);
}

/** @deprecated Prefer resolveGoalsForPeriod */
export async function resolveGoals(
  userId: string,
): Promise<Record<GoalMetric, number>> {
  const rows = await loadGoalRows([userId]);
  const weekRows = rows.filter(
    (r) =>
      r.periodType === "WEEK" &&
      (r.scope === "TEAM" || r.userId === userId),
  );
  if (weekRows.length === 0) return { ...DEFAULT_GOALS };
  const latest = weekRows.reduce((a, b) =>
    a.periodStart > b.periodStart ? a : b,
  );
  return applyRowsForPeriod(rows, "WEEK", latest.periodStart, userId);
}

export async function resolveGoalsMapForPeriod(
  userIds: string[],
  period: CrmPeriodScope,
): Promise<Map<string, Record<GoalMetric, number>>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const gs = grainAndStart(period);
  const map = new Map<string, Record<GoalMetric, number>>();
  if (!gs) {
    for (const id of ids) map.set(id, defaultsForGrain("WEEK"));
    return map;
  }
  const rows = await loadGoalRows(ids);
  for (const id of ids) {
    map.set(id, applyRowsForPeriod(rows, gs.grain, gs.periodStart, id));
  }
  return map;
}

/** @deprecated Prefer resolveGoalsMapForPeriod */
export async function resolveGoalsMap(
  userIds: string[],
): Promise<Map<string, Record<GoalMetric, number>>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const rows = await loadGoalRows(ids);
  const map = new Map<string, Record<GoalMetric, number>>();
  for (const id of ids) {
    const weekRows = rows.filter(
      (r) =>
        r.periodType === "WEEK" &&
        (r.scope === "TEAM" || r.userId === id),
    );
    if (weekRows.length === 0) {
      map.set(id, { ...DEFAULT_GOALS });
      continue;
    }
    const latest = weekRows.reduce((a, b) =>
      a.periodStart > b.periodStart ? a : b,
    );
    map.set(id, applyRowsForPeriod(rows, "WEEK", latest.periodStart, id));
  }
  return map;
}

/** Progression période vs cibles résolues. */
export function buildGoalProgress(
  goals: Record<GoalMetric, number>,
  weekStats: WeekStats,
): GoalProgressItem[] {
  const currentByMetric: Record<GoalMetric, number> = {
    NEW_PROSPECTS: weekStats.newProspects,
    FIRST_CONTACTS: weekStats.firstContacts,
    MEETINGS: weekStats.meetings,
    FOLLOW_UPS: weekStats.relancesJournalisees,
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
 * Snapshots objectifs + stats pour une liste de collabs sur une période CRM.
 */
export async function resolveGoalsSnapshots(
  members: { id: string; firstName: string; lastName: string }[],
  period: CrmPeriodScope,
): Promise<CollabGoalSnapshot[]> {
  if (members.length === 0) return [];
  const goalsMap = await resolveGoalsMapForPeriod(
    members.map((m) => m.id),
    period,
  );
  const out: CollabGoalSnapshot[] = [];
  for (const m of members) {
    const stats = await computePeriodStats(m.id, period.from, period.to);
    const goals = goalsMap.get(m.id) ?? defaultsForGrain("WEEK");
    out.push({
      userId: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      goals,
      progress: buildGoalProgress(goals, stats),
    });
  }
  return out;
}
