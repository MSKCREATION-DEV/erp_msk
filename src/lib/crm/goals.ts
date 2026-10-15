import { prisma } from "@/lib/prisma";
import type { WeekStats } from "@/lib/crm/week-stats";
import { computePeriodStats } from "@/lib/crm/week-stats";
import type { CrmPeriodScope } from "@/lib/crm/scope-period";
import {
  type GoalPeriodGrain,
  periodModeToGrain,
  periodStartForGrain,
  scaleGoalTarget,
} from "@/lib/crm/goal-scale";

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

/** Défauts = cibles **hebdo** (grain WEEK). */
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
  periodType: string;
  periodStart: Date;
  target: number;
};

function isGrain(v: string): v is GoalPeriodGrain {
  return v === "DAY" || v === "WEEK" || v === "MONTH";
}

function defaultsForGrain(grain: GoalPeriodGrain): Record<GoalMetric, number> {
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

  const exactUser = userId
    ? find("USER", grain, periodStart)
    : null;
  if (exactUser != null) return exactUser;

  const exactTeam = find("TEAM", grain, periodStart);
  if (exactTeam != null) return exactTeam;

  // Parents / enfants convertis
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

function applyRowsForPeriod(
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

/** Cibles TEAM pour la période affichée (ou défauts). */
export async function loadTeamGoalsForPeriod(
  period: CrmPeriodScope,
): Promise<Record<GoalMetric, number>> {
  const gs = grainAndStart(period);
  if (!gs) return defaultsForGrain("WEEK");
  const rows = await loadGoalRows();
  return applyRowsForPeriod(rows, gs.grain, gs.periodStart);
}

/** @deprecated Prefer loadTeamGoalsForPeriod — alias semaine courante absente. */
export async function loadTeamGoals(): Promise<Record<GoalMetric, number>> {
  const rows = await prisma.crmPeriodGoal.findMany({
    where: { scope: "TEAM", userId: null },
  });
  // Sans période : meilleur effort — grain WEEK, défauts si rien
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
