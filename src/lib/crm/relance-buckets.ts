/**
 * Classification des relances ouvertes (file `/crm/relances`).
 *
 * Les quatre buckets sont **exclusifs** et partitionnent la file ouverte :
 * overdue ∪ today ∪ week ∪ later = toutes les tâches OPEN.
 *
 * « week » = échéance après aujourd’hui et ≤ maintenant+7j (pas la semaine CRM UTC).
 * « Relances faites » (activités journalisées) est un indicateur de **flux**
 * séparé — ne fait pas partie de cette partition.
 */

export type RelanceDueBucket = "overdue" | "today" | "week" | "later";

export type RelanceDueBuckets<T> = {
  overdue: T[];
  today: T[];
  week: T[];
  later: T[];
};

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfLocalDay(d: Date): Date {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    23,
    59,
    59,
    999,
  );
}

/** Fin de la fenêtre « sous 7 jours » (jour J+7 inclus, hors aujourd’hui). */
export function endOfLocalWeekAhead(now: Date, days = 7): Date {
  const sod = startOfLocalDay(now);
  return endOfLocalDay(
    new Date(sod.getFullYear(), sod.getMonth(), sod.getDate() + days),
  );
}

export function classifyRelanceDue(
  dueAt: Date,
  now: Date = new Date(),
): RelanceDueBucket {
  const sod = startOfLocalDay(now);
  const eod = endOfLocalDay(now);
  const weekEnd = endOfLocalWeekAhead(now);
  if (dueAt < sod) return "overdue";
  if (dueAt <= eod) return "today";
  if (dueAt <= weekEnd) return "week";
  return "later";
}

export function partitionRelanceDue<T extends { dueAt: Date }>(
  tasks: T[],
  now: Date = new Date(),
): RelanceDueBuckets<T> {
  const out: RelanceDueBuckets<T> = {
    overdue: [],
    today: [],
    week: [],
    later: [],
  };
  for (const t of tasks) {
    out[classifyRelanceDue(t.dueAt, now)].push(t);
  }
  return out;
}

/** Totaux pour KPI — `open` = file complète (retard inclus). */
export function summarizeRelanceDueBuckets(
  buckets: RelanceDueBuckets<unknown>,
): {
  overdue: number;
  today: number;
  week: number;
  later: number;
  open: number;
} {
  const overdue = buckets.overdue.length;
  const today = buckets.today.length;
  const week = buckets.week.length;
  const later = buckets.later.length;
  return {
    overdue,
    today,
    week,
    later,
    open: overdue + today + week + later,
  };
}
