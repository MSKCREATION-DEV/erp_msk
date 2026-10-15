/**
 * Conversion objectifs jour ↔ semaine ↔ mois (jours ouvrés).
 * 1 semaine = 5 j · 1 mois = 22 j ≈ 4,4 sem.
 */

export type GoalPeriodGrain = "DAY" | "WEEK" | "MONTH";

export const DAYS_PER_WEEK = 5;
export const DAYS_PER_MONTH = 22;

const GRAIN_TO_DAYS: Record<GoalPeriodGrain, number> = {
  DAY: 1,
  WEEK: DAYS_PER_WEEK,
  MONTH: DAYS_PER_MONTH,
};

/** Convertit une cible entière d’une granularité à une autre (arrondi, min 0). */
export function scaleGoalTarget(
  value: number,
  from: GoalPeriodGrain,
  to: GoalPeriodGrain,
): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (from === to) return Math.round(value);
  // value_from × (jours_to / jours_from) — ex. 22/mois → 22×(5/22)=5/sem
  const scaled =
    (value * GRAIN_TO_DAYS[to]) / GRAIN_TO_DAYS[from];
  return Math.max(0, Math.round(scaled));
}

/** Map période CRM UI → grain objectifs. */
export function periodModeToGrain(
  mode: "jour" | "semaine" | "mois" | "plage",
): GoalPeriodGrain | null {
  if (mode === "jour") return "DAY";
  if (mode === "semaine") return "WEEK";
  if (mode === "mois") return "MONTH";
  return null;
}

export function grainToPeriodMode(
  grain: GoalPeriodGrain,
): "jour" | "semaine" | "mois" {
  if (grain === "DAY") return "jour";
  if (grain === "WEEK") return "semaine";
  return "mois";
}

/**
 * Ancre `periodStart` (UTC date) pour un grain + une période CRM.
 * - DAY → jour `on` / from
 * - WEEK → lundi ISO (`semaine`)
 * - MONTH → 1er du mois (`mois` YYYY-MM)
 */
export function periodStartForGrain(
  grain: GoalPeriodGrain,
  period: {
    mode: string;
    from: Date;
    semaine: string;
    mois: string;
    on: string;
  },
): Date {
  if (grain === "WEEK") {
    const [y, m, d] = period.semaine.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  if (grain === "MONTH") {
    const [y, m] = period.mois.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1));
  }
  // DAY
  const iso = period.on || period.from.toISOString().slice(0, 10);
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Normalise une date ISO / Date → Date UTC midnight pour periodStart. */
export function toPeriodStartDate(
  grain: GoalPeriodGrain,
  raw: string | Date,
): Date {
  if (raw instanceof Date) {
    return periodStartForGrain(grain, {
      mode: grainToPeriodMode(grain),
      from: raw,
      semaine: raw.toISOString().slice(0, 10),
      mois: `${raw.getUTCFullYear()}-${String(raw.getUTCMonth() + 1).padStart(2, "0")}`,
      on: raw.toISOString().slice(0, 10),
    });
  }
  if (grain === "MONTH" && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1));
  }
  const [y, m, d] = raw.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d || 1));
  if (grain === "WEEK") {
    const day = dt.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    dt.setUTCDate(dt.getUTCDate() + diff);
  }
  if (grain === "MONTH") {
    return new Date(Date.UTC(y, m - 1, 1));
  }
  return dt;
}

export const GOAL_GRAIN_LABELS: Record<GoalPeriodGrain, string> = {
  DAY: "jour",
  WEEK: "semaine",
  MONTH: "mois",
};
