/**
 * Résolution pure des cibles objectifs CRM — safe hors server-only / sans Prisma.
 */
import {
  type GoalPeriodGrain,
  scaleGoalTarget,
} from "@/lib/crm/goal-scale";
import {
  DEFAULT_GOALS,
  GOAL_METRICS,
  type GoalMetric,
} from "@/lib/crm/goals-meta";

export type GoalRow = {
  scope: string;
  userId: string | null;
  metric: string;
  periodType: string;
  periodStart: Date;
  target: number;
};

function isGrain(v: string): v is GoalPeriodGrain {
  return v === "DAY" || v === "WEEK" || v === "MONTH";
}

export function defaultsForGrain(
  grain: GoalPeriodGrain,
): Record<GoalMetric, number> {
  const out = {} as Record<GoalMetric, number>;
  for (const m of GOAL_METRICS) {
    out[m] = scaleGoalTarget(DEFAULT_GOALS[m], "WEEK", grain);
  }
  return out;
}

function containingWeekStart(day: Date): Date {
  const d = new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()),
  );
  const dow = d.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function containingMonthStart(day: Date): Date {
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1));
}

function sameUtcDate(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

/**
 * Résout une cible pour un grain affiché :
 * USER exact → TEAM exact → parent USER → parent TEAM → défauts.
 */
export function resolveMetricTargetFromRows(
  rows: GoalRow[],
  metric: GoalMetric,
  grain: GoalPeriodGrain,
  periodStart: Date,
  userId?: string,
): number {
  const candidates = rows.filter(
    (r) => r.metric === metric && isGrain(r.periodType),
  );

  const find = (
    scope: "USER" | "TEAM",
    type: GoalPeriodGrain,
    start: Date,
  ): number | null => {
    const hit = candidates.find((r) => {
      if (r.scope !== scope || r.periodType !== type) return false;
      if (!sameUtcDate(r.periodStart, start)) return false;
      if (scope === "USER") return userId != null && r.userId === userId;
      return r.userId == null;
    });
    return hit ? hit.target : null;
  };

  const exactUser = userId ? find("USER", grain, periodStart) : null;
  if (exactUser != null) return exactUser;

  const exactTeam = find("TEAM", grain, periodStart);
  if (exactTeam != null) return exactTeam;

  const weekStart = containingWeekStart(periodStart);
  const monthStart = containingMonthStart(periodStart);

  const parentChain: { type: GoalPeriodGrain; start: Date }[] =
    grain === "DAY"
      ? [
          { type: "WEEK", start: weekStart },
          { type: "MONTH", start: monthStart },
        ]
      : grain === "WEEK"
        ? [
            { type: "MONTH", start: monthStart },
            { type: "DAY", start: periodStart },
          ]
        : [
            { type: "WEEK", start: weekStart },
            { type: "DAY", start: periodStart },
          ];

  for (const parent of parentChain) {
    if (userId) {
      const u = find("USER", parent.type, parent.start);
      if (u != null) return scaleGoalTarget(u, parent.type, grain);
    }
    const t = find("TEAM", parent.type, parent.start);
    if (t != null) return scaleGoalTarget(t, parent.type, grain);
  }

  return defaultsForGrain(grain)[metric];
}

export function applyRowsForPeriod(
  rows: GoalRow[],
  grain: GoalPeriodGrain,
  periodStart: Date,
  userId?: string,
): Record<GoalMetric, number> {
  const out = {} as Record<GoalMetric, number>;
  for (const m of GOAL_METRICS) {
    out[m] = resolveMetricTargetFromRows(rows, m, grain, periodStart, userId);
  }
  return out;
}

/**
 * Synthèse équipe TB : somme des cibles effectives (USER > TEAM > défaut)
 * des collaborateurs opérationnels fournis.
 */
export function sumEffectiveGoalTargets(
  perUserGoals: Record<GoalMetric, number>[],
): Record<GoalMetric, number> {
  const out = {} as Record<GoalMetric, number>;
  for (const m of GOAL_METRICS) {
    out[m] = 0;
  }
  for (const g of perUserGoals) {
    for (const m of GOAL_METRICS) {
      out[m] += g[m] ?? 0;
    }
  }
  return out;
}
