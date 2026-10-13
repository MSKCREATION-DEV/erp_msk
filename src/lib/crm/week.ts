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

/** Vendredi (fin de journée) — affichage semaine ouvrée lundi–vendredi. */
export function weekEndFriday(weekStart: Date): Date {
  const e = new Date(weekStart);
  e.setUTCDate(e.getUTCDate() + 4);
  e.setUTCHours(23, 59, 59, 999);
  return e;
}

export function weekStartIso(weekStart: Date): string {
  return weekStart.toISOString().slice(0, 10);
}

/** Numéro de semaine ISO (1–53). */
export function isoWeekNumber(weekStart: Date): number {
  const d = new Date(
    Date.UTC(
      weekStart.getUTCFullYear(),
      weekStart.getUTCMonth(),
      weekStart.getUTCDate(),
    ),
  );
  // Jeudi de la semaine = année ISO
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse `?semaine=YYYY-MM-DD` (lundi attendu).
 * Garde-fou : invalide / hors plage → semaine courante.
 */
export function parseWeekParam(
  raw: string | undefined,
  opts?: { earliest?: Date; latest?: Date },
): Date {
  const current = weekStartMonday();
  if (!raw || !ISO_DATE.test(raw)) return current;

  const [y, m, day] = raw.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, day));
  if (Number.isNaN(parsed.getTime())) return current;

  const monday = weekStartMonday(parsed);
  // Si la date n’était pas un lundi, on normalise quand même
  const earliest = opts?.earliest ?? weekStartMonday(new Date(Date.UTC(y - 1, 0, 1)));
  const latest = opts?.latest ?? current;
  if (monday.getTime() < earliest.getTime()) return earliest;
  if (monday.getTime() > latest.getTime()) return latest;
  return monday;
}

export type WeekOption = {
  value: string;
  label: string;
  monthKey: string;
  monthLabel: string;
  isCurrent: boolean;
};

/**
 * Liste des semaines (lundis) de `fromYear` jusqu’à la semaine courante.
 * Couvre mois + année pour le sélecteur Rapport.
 */
export function listWeekOptions(opts?: {
  fromYear?: number;
  through?: Date;
}): WeekOption[] {
  const through = weekStartMonday(opts?.through ?? new Date());
  const year = opts?.fromYear ?? through.getUTCFullYear();
  let cursor = weekStartMonday(new Date(Date.UTC(year, 0, 1)));

  const out: WeekOption[] = [];
  const currentIso = weekStartIso(through);
  const monthsFr = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];

  while (cursor.getTime() <= through.getTime()) {
    const fri = weekEndFriday(cursor);
    const value = weekStartIso(cursor);
    const wn = isoWeekNumber(cursor);
    const monLabel = cursor.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
    const friLabel = fri.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
    const monthIdx = cursor.getUTCMonth();
    const y = cursor.getUTCFullYear();
    out.push({
      value,
      label: `Sem. ${wn} · ${monLabel} – ${friLabel}`,
      monthKey: `${y}-${String(monthIdx + 1).padStart(2, "0")}`,
      monthLabel: `${monthsFr[monthIdx]} ${y}`,
      isCurrent: value === currentIso,
    });
    cursor = new Date(cursor);
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return out;
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const fri = weekEndFriday(weekStart);
  const a = weekStart.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  const b = fri.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${a} – ${b}`;
}
