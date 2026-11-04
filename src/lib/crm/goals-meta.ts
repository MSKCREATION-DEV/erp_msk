/**
 * Constantes objectifs CRM — safe client (pas d’import Prisma).
 */

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
