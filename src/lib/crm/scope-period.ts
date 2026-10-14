import type { SessionUser } from "@/lib/rbac/resolve";
import { crmVisibility } from "@/lib/crm/scope";
import {
  parseWeekParam,
  weekEndSunday,
  weekStartIso,
  weekStartMonday,
} from "@/lib/crm/week";

export type PeriodMode = "semaine" | "mois" | "jour" | "plage";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MONTHS_FR = [
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

export type CrmPeriodScope = {
  mode: PeriodMode;
  from: Date;
  to: Date;
  label: string;
  semaine: string;
  mois: string;
  on: string;
  fromIso: string;
  toIso: string;
};

export type CrmOwnerScope = {
  /** null = toute l’équipe (si autorisé). */
  ownerId: string | null;
  canFilterOwners: boolean;
};

/** Direction / lead / Super Admin : filtre collaborateur. */
export function canFilterCrmOwners(user: SessionUser): boolean {
  return crmVisibility(user) !== "own";
}

function utcDayStart(y: number, m0: number, d: number): Date {
  return new Date(Date.UTC(y, m0, d, 0, 0, 0, 0));
}

function utcDayEnd(y: number, m0: number, d: number): Date {
  return new Date(Date.UTC(y, m0, d, 23, 59, 59, 999));
}

function parseIsoDate(raw: string | undefined): Date | null {
  if (!raw || !ISO_DATE.test(raw)) return null;
  const [y, m, d] = raw.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatIsoUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Parse les params URL période.
 * Défaut = semaine courante (aligné objectifs / rapport).
 */
export function parseCrmPeriod(
  sp: Record<string, string | undefined>,
): CrmPeriodScope {
  const rawMode = (sp.periode ?? "semaine").toLowerCase();
  const mode: PeriodMode =
    rawMode === "mois" || rawMode === "jour" || rawMode === "plage"
      ? rawMode
      : "semaine";

  const now = new Date();
  const currentWeek = weekStartMonday(now);
  const currentWeekIso = weekStartIso(currentWeek);

  if (mode === "semaine") {
    const weekStart = parseWeekParam(sp.semaine);
    const from = weekStart;
    const to = weekEndSunday(weekStart);
    const semaine = weekStartIso(weekStart);
    const mois = `${weekStart.getUTCFullYear()}-${String(weekStart.getUTCMonth() + 1).padStart(2, "0")}`;
    return {
      mode,
      from,
      to,
      label:
        semaine === currentWeekIso
          ? "Cette semaine"
          : `Semaine du ${formatDayLabel(weekStart)}`,
      semaine,
      mois,
      on: formatIsoUtc(from),
      fromIso: formatIsoUtc(from),
      toIso: formatIsoUtc(to),
    };
  }

  if (mode === "mois") {
    const moisRaw = sp.mois && ISO_MONTH.test(sp.mois) ? sp.mois : null;
    let y: number;
    let m0: number;
    if (moisRaw) {
      const [yy, mm] = moisRaw.split("-").map(Number);
      y = yy;
      m0 = mm - 1;
    } else {
      y = now.getUTCFullYear();
      m0 = now.getUTCMonth();
    }
    const from = utcDayStart(y, m0, 1);
    const lastDay = new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
    const to = utcDayEnd(y, m0, lastDay);
    const mois = `${y}-${String(m0 + 1).padStart(2, "0")}`;
    return {
      mode,
      from,
      to,
      label: `${MONTHS_FR[m0]} ${y}`,
      semaine: weekStartIso(weekStartMonday(from)),
      mois,
      on: formatIsoUtc(from),
      fromIso: formatIsoUtc(from),
      toIso: formatIsoUtc(to),
    };
  }

  if (mode === "jour") {
    const day = parseIsoDate(sp.on) ?? utcDayStart(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    const y = day.getUTCFullYear();
    const m0 = day.getUTCMonth();
    const d = day.getUTCDate();
    const from = utcDayStart(y, m0, d);
    const to = utcDayEnd(y, m0, d);
    return {
      mode,
      from,
      to,
      label: formatDayLabel(from),
      semaine: weekStartIso(weekStartMonday(from)),
      mois: `${y}-${String(m0 + 1).padStart(2, "0")}`,
      on: formatIsoUtc(from),
      fromIso: formatIsoUtc(from),
      toIso: formatIsoUtc(to),
    };
  }

  // plage
  let from = parseIsoDate(sp.from);
  let to = parseIsoDate(sp.to);
  if (!from && !to) {
    const ws = currentWeek;
    from = ws;
    to = weekEndSunday(ws);
  } else if (from && !to) {
    to = utcDayEnd(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate(),
    );
    from = utcDayStart(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate(),
    );
  } else if (!from && to) {
    from = utcDayStart(
      to.getUTCFullYear(),
      to.getUTCMonth(),
      to.getUTCDate(),
    );
    to = utcDayEnd(
      to.getUTCFullYear(),
      to.getUTCMonth(),
      to.getUTCDate(),
    );
  } else if (from && to) {
    from = utcDayStart(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate(),
    );
    to = utcDayEnd(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
    if (from.getTime() > to.getTime()) {
      const tmp = from;
      from = utcDayStart(
        to.getUTCFullYear(),
        to.getUTCMonth(),
        to.getUTCDate(),
      );
      to = utcDayEnd(
        tmp.getUTCFullYear(),
        tmp.getUTCMonth(),
        tmp.getUTCDate(),
      );
    }
  }

  const fromSafe = from!;
  const toSafe = to!;
  return {
    mode: "plage",
    from: fromSafe,
    to: toSafe,
    label: `Du ${formatDayLabel(fromSafe)} au ${formatDayLabel(toSafe)}`,
    semaine: weekStartIso(weekStartMonday(fromSafe)),
    mois: `${fromSafe.getUTCFullYear()}-${String(fromSafe.getUTCMonth() + 1).padStart(2, "0")}`,
    on: formatIsoUtc(fromSafe),
    fromIso: formatIsoUtc(fromSafe),
    toIso: formatIsoUtc(toSafe),
  };
}

/** Résout `?owner=` — null = toute l’équipe (si autorisé). */
export function parseCrmOwner(
  sp: Record<string, string | undefined>,
  user: SessionUser,
  allowedOwnerIds: string[],
): CrmOwnerScope {
  const canFilter = canFilterCrmOwners(user);
  if (!canFilter) {
    return { ownerId: user.id, canFilterOwners: false };
  }
  const raw = sp.owner?.trim();
  if (!raw || raw === "all") {
    return { ownerId: null, canFilterOwners: true };
  }
  if (UUID_RE.test(raw) && allowedOwnerIds.includes(raw)) {
    return { ownerId: raw, canFilterOwners: true };
  }
  return { ownerId: null, canFilterOwners: true };
}

/** Clause Prisma `{ field: { gte, lte } }`. */
export function dateRangeFilter(
  from: Date,
  to: Date,
): { gte: Date; lte: Date } {
  return { gte: from, lte: to };
}

/** Construit les searchParams à conserver pour la barre de filtres. */
export function crmScopeToSearchParams(opts: {
  period: CrmPeriodScope;
  ownerId: string | null;
  canFilterOwners: boolean;
  /** Params additionnels à conserver (ex. vue, collab). */
  keep?: Record<string, string | undefined>;
}): URLSearchParams {
  const p = new URLSearchParams();
  const { period, ownerId, canFilterOwners, keep } = opts;

  if (period.mode !== "semaine") p.set("periode", period.mode);
  // Semaine courante : pas besoin de `semaine` si défaut
  const currentIso = weekStartIso(weekStartMonday());
  if (period.mode === "semaine" && period.semaine !== currentIso) {
    p.set("semaine", period.semaine);
  } else if (period.mode === "semaine" && period.semaine === currentIso) {
    /* défaut */
  } else if (period.mode === "mois") {
    p.set("mois", period.mois);
  } else if (period.mode === "jour") {
    p.set("on", period.on);
  } else {
    p.set("from", period.fromIso);
    p.set("to", period.toIso);
  }

  if (canFilterOwners && ownerId) {
    p.set("owner", ownerId);
  }

  if (keep) {
    for (const [k, v] of Object.entries(keep)) {
      if (v && !p.has(k)) p.set(k, v);
    }
  }
  return p;
}

export function isUuid(raw: string): boolean {
  return UUID_RE.test(raw);
}
