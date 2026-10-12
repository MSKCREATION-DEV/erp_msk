/** Lundi (date UTC) de la semaine contenant `ref`. */
export function weekStartMonday(ref: Date = new Date()): Date {
  const d = new Date(
    Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate()),
  );
  const day = d.getUTCDay(); // 0=dim
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export function weekEndSunday(weekStart: Date): Date {
  const e = new Date(weekStart);
  e.setUTCDate(e.getUTCDate() + 6);
  e.setUTCHours(23, 59, 59, 999);
  return e;
}

export function weekStartIso(weekStart: Date): string {
  return weekStart.toISOString().slice(0, 10);
}
