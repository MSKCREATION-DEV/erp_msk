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

/**
 * Lentille d’affichage (best practice dashboards filtrés) :
 * - `live` : la période contient « maintenant » → stocks à date + événements OK
 * - `period` : période historique → uniquement événements (masquer stocks non comparables)
 */
export type CrmScopeLens = "live" | "period";

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

/** aplati `string | string[]` (Next searchParams) → 1ʳᵉ valeur. */
export function firstSearchParam(
  raw: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export function normalizeSearchParams(
  sp: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) {
    out[k] = firstSearchParam(v);
  }
  return out;
}

/**
 * Parse les params URL période.
 * Défaut = semaine courante (aligné objectifs / rapport).
 */
export function parseCrmPeriod(
  sp: Record<string, string | string[] | undefined>,
): CrmPeriodScope {
  const periode = firstSearchParam(sp.periode);
  const rawMode = (periode ?? "semaine").toLowerCase();
  const mode: PeriodMode =
    rawMode === "mois" || rawMode === "jour" || rawMode === "plage"
      ? rawMode
      : "semaine";

  const now = new Date();
  const currentWeek = weekStartMonday(now);
  const currentWeekIso = weekStartIso(currentWeek);

  if (mode === "semaine") {
    const weekStart = parseWeekParam(firstSearchParam(sp.semaine));
    const from = weekStart;
    const to = weekEndSunday(weekStart);
    const semaine = weekStartIso(weekStart);
    const mois = `${weekStart.getUTCFullYear()}-${String(weekStart.getUTCMonth() + 1).padStart(2, "0")}`;
    const out = {
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
    return out;
  }

  if (mode === "mois") {
    const moisParam = firstSearchParam(sp.mois);
    const moisRaw = moisParam && ISO_MONTH.test(moisParam) ? moisParam : null;
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
    const out = {
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
    return out;
  }

  if (mode === "jour") {
    const day = parseIsoDate(firstSearchParam(sp.on)) ?? utcDayStart(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    const y = day.getUTCFullYear();
    const m0 = day.getUTCMonth();
    const d = day.getUTCDate();
    const from = utcDayStart(y, m0, d);
    const to = utcDayEnd(y, m0, d);
    const out = {
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
    return out;
  }

  // plage
  let from = parseIsoDate(firstSearchParam(sp.from));
  let to = parseIsoDate(firstSearchParam(sp.to));
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
  const out = {
    mode: "plage" as const,
    from: fromSafe,
    to: toSafe,
    label: `Du ${formatDayLabel(fromSafe)} au ${formatDayLabel(toSafe)}`,
    semaine: weekStartIso(weekStartMonday(fromSafe)),
    mois: `${fromSafe.getUTCFullYear()}-${String(fromSafe.getUTCMonth() + 1).padStart(2, "0")}`,
    on: formatIsoUtc(fromSafe),
    fromIso: formatIsoUtc(fromSafe),
    toIso: formatIsoUtc(toSafe),
  };
  return out;
}

/** Résout `?owner=` (ou clé custom) — null = toute l’équipe (si autorisé). */
export function parseCrmOwner(
  sp: Record<string, string | string[] | undefined>,
  user: SessionUser,
  allowedOwnerIds: string[],
  opts?: { paramKey?: "owner" | "collab" },
): CrmOwnerScope {
  const canFilter = canFilterCrmOwners(user);
  if (!canFilter) {
    return { ownerId: user.id, canFilterOwners: false };
  }
  const key = opts?.paramKey ?? "owner";
  const raw = (
    firstSearchParam(sp[key]) ??
    (key === "collab" ? firstSearchParam(sp.owner) : undefined)
  )?.trim();
  if (!raw || raw === "all") {
    const out = { ownerId: null as string | null, canFilterOwners: true };
    return out;
  }
  if (UUID_RE.test(raw) && allowedOwnerIds.includes(raw)) {
    const out = { ownerId: raw, canFilterOwners: true };
    return out;
  }
  const out = { ownerId: null as string | null, canFilterOwners: true };
  return out;
}

/**
 * IDs de suivi à interroger selon le filtre collab.
 * - collab choisi → `[ownerId]`
 * - toute l’équipe (autorisé) → `memberIds`
 * - commercial own → `[userId]`
 */
export function resolveCrmOwnerIds(opts: {
  ownerId: string | null;
  canFilterOwners: boolean;
  memberIds: string[];
  userId: string;
}): string[] {
  if (opts.ownerId) return [opts.ownerId];
  if (opts.canFilterOwners) {
    const ids = [...new Set(opts.memberIds.filter(Boolean))];
    return ids.length > 0 ? ids : [opts.userId];
  }
  return [opts.userId];
}

/** Construit une URL avec période + owner (et params à conserver). */
export function buildCrmScopeHref(
  path: string,
  opts: {
    period: CrmPeriodScope;
    ownerId?: string | null;
    canFilterOwners?: boolean;
    ownerParamKey?: "owner" | "collab";
    keep?: Record<string, string | undefined>;
  },
): string {
  const p = crmScopeToSearchParams({
    period: opts.period,
    ownerId: opts.ownerId ?? null,
    canFilterOwners: opts.canFilterOwners ?? true,
    keep: opts.keep,
  });
  if (opts.ownerParamKey === "collab" && p.has("owner")) {
    const v = p.get("owner")!;
    p.delete("owner");
    p.set("collab", v);
  }
  const qs = p.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Clause Prisma `{ field: { gte, lte } }`. */
export function dateRangeFilter(
  from: Date,
  to: Date,
): { gte: Date; lte: Date } {
  return { gte: from, lte: to };
}

/** `live` si « maintenant » est dans [from, to], sinon vue historique. */
export function resolveCrmScopeLens(
  period: CrmPeriodScope,
  now: Date = new Date(),
): CrmScopeLens {
  const t = now.getTime();
  const lens: CrmScopeLens =
    t >= period.from.getTime() && t <= period.to.getTime() ? "live" : "period";
  return lens;
}

/** Objectifs hebdo : pertinents seulement en mode semaine. */
export function goalsCompatibleWithPeriod(period: CrmPeriodScope): boolean {
  return period.mode === "semaine";
}

/** Stocks « à date » (ouverts, retards, priorités…) — uniquement en lentille live. */
export function showStockWidgets(lens: CrmScopeLens): boolean {
  return lens === "live";
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
