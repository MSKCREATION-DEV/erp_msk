import { listWeekOptions, type WeekOption } from "@/lib/crm/week";
import {
  periodModeToGrain,
  periodStartForGrain,
  type GoalPeriodGrain,
} from "@/lib/crm/goal-scale";
import { parseCrmPeriod, type CrmPeriodScope } from "@/lib/crm/scope-period";

/** Période par défaut pour les écrans d’assignation (semaine courante). */
export function defaultAssignPeriod(
  sp?: Record<string, string | undefined>,
): CrmPeriodScope {
  const raw = parseCrmPeriod(sp ?? {});
  if (raw.mode === "plage") {
    return parseCrmPeriod({ semaine: sp?.semaine, periode: "semaine" });
  }
  return raw;
}

export function assignFormDefaults(period: CrmPeriodScope): {
  grain: GoalPeriodGrain;
  periodStartIso: string;
  weeks: WeekOption[];
} {
  const grain = periodModeToGrain(period.mode) ?? "WEEK";
  const periodStartDate = periodStartForGrain(grain, period);
  const periodStartIso =
    grain === "MONTH"
      ? period.mois
      : periodStartDate.toISOString().slice(0, 10);
  const weeks = listWeekOptions({ fromYear: new Date().getFullYear() - 1 });
  return {
    grain,
    periodStartIso,
    weeks,
  };
}
