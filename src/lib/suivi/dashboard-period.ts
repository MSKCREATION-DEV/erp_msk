import { z } from "zod";
import {
  parseWeekParam,
  weekEndSunday,
  weekStartIso,
  weekStartMonday,
} from "@/lib/crm/week";
import type { SvAccountKind } from "@/generated/prisma/client";
import {
  SV_CATEGORY_FAMILIES,
  type SvCategoryFamily,
} from "@/lib/suivi/categories";

export const SV_PERIOD_MODES = [
  "jour",
  "semaine",
  "mois",
  "annee",
] as const;

export type SvPeriodMode = (typeof SV_PERIOD_MODES)[number];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;
const ISO_YEAR = /^\d{4}$/;

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
] as const;

function utcDayStart(y: number, m0: number, d: number): Date {
  return new Date(Date.UTC(y, m0, d, 0, 0, 0, 0));
}

function utcDayEnd(y: number, m0: number, d: number): Date {
  return new Date(Date.UTC(y, m0, d, 23, 59, 59, 999));
}

function formatIsoUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function firstParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

export const svDashboardFilterSchema = z.object({
  periode: z.enum(SV_PERIOD_MODES).default("mois"),
  on: z.string().regex(ISO_DATE).optional(),
  semaine: z.string().regex(ISO_DATE).optional(),
  mois: z.string().regex(ISO_MONTH).optional(),
  annee: z.string().regex(ISO_YEAR).optional(),
  compte: z.enum(["PHYSICAL", "BANK"]).optional(),
  categorie: z.enum(SV_CATEGORY_FAMILIES).optional(),
});

export type SvDashboardFilters = z.infer<typeof svDashboardFilterSchema>;

export type SvPeriodScope = {
  mode: SvPeriodMode;
  from: Date;
  to: Date;
  label: string;
  on: string;
  semaine: string;
  mois: string;
  annee: string;
  fromIso: string;
  toIso: string;
  /** Période précédente de même durée (comparatif). */
  prevFrom: Date;
  prevTo: Date;
  prevLabel: string;
  daysInPeriod: number;
};

export type SvDashboardScope = SvPeriodScope & {
  compte: SvAccountKind | null;
  categorie: SvCategoryFamily | null;
};

function daysInclusive(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(1, Math.floor(ms / 86_400_000) + 1);
}

export function parseSvDashboardFilters(
  sp: Record<string, string | string[] | undefined>,
): SvDashboardScope {
  const raw = {
    periode: firstParam(sp, "periode") ?? "mois",
    on: firstParam(sp, "on"),
    semaine: firstParam(sp, "semaine"),
    mois: firstParam(sp, "mois"),
    annee: firstParam(sp, "annee"),
    compte: firstParam(sp, "compte"),
    categorie: firstParam(sp, "categorie"),
  };

  const parsed = svDashboardFilterSchema.safeParse(raw);
  const filters: SvDashboardFilters = parsed.success
    ? parsed.data
    : { periode: "mois" };

  const period = resolveSvPeriod(filters);
  return {
    ...period,
    compte: filters.compte ?? null,
    categorie: filters.categorie ?? null,
  };
}

function resolveSvPeriod(filters: SvDashboardFilters): SvPeriodScope {
  const now = new Date();
  const mode = filters.periode;

  if (mode === "jour") {
    const day =
      filters.on && ISO_DATE.test(filters.on)
        ? (() => {
            const [y, m, d] = filters.on!.split("-").map(Number);
            return utcDayStart(y, m - 1, d);
          })()
        : utcDayStart(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
          );
    const y = day.getUTCFullYear();
    const m0 = day.getUTCMonth();
    const d = day.getUTCDate();
    const from = utcDayStart(y, m0, d);
    const to = utcDayEnd(y, m0, d);
    const prev = new Date(from);
    prev.setUTCDate(prev.getUTCDate() - 1);
    const prevFrom = utcDayStart(
      prev.getUTCFullYear(),
      prev.getUTCMonth(),
      prev.getUTCDate(),
    );
    const prevTo = utcDayEnd(
      prev.getUTCFullYear(),
      prev.getUTCMonth(),
      prev.getUTCDate(),
    );
    return {
      mode,
      from,
      to,
      label: from.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      }),
      on: formatIsoUtc(from),
      semaine: weekStartIso(weekStartMonday(from)),
      mois: `${y}-${String(m0 + 1).padStart(2, "0")}`,
      annee: String(y),
      fromIso: formatIsoUtc(from),
      toIso: formatIsoUtc(to),
      prevFrom,
      prevTo,
      prevLabel: "Veille",
      daysInPeriod: 1,
    };
  }

  if (mode === "semaine") {
    const weekStart = parseWeekParam(filters.semaine);
    const from = weekStart;
    const to = weekEndSunday(weekStart);
    const prevStart = new Date(weekStart);
    prevStart.setUTCDate(prevStart.getUTCDate() - 7);
    const prevFrom = weekStartMonday(prevStart);
    const prevTo = weekEndSunday(prevFrom);
    const currentIso = weekStartIso(weekStartMonday());
    const semaine = weekStartIso(weekStart);
    return {
      mode,
      from,
      to,
      label:
        semaine === currentIso
          ? "Cette semaine"
          : `Semaine du ${from.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" })}`,
      on: formatIsoUtc(from),
      semaine,
      mois: `${weekStart.getUTCFullYear()}-${String(weekStart.getUTCMonth() + 1).padStart(2, "0")}`,
      annee: String(weekStart.getUTCFullYear()),
      fromIso: formatIsoUtc(from),
      toIso: formatIsoUtc(to),
      prevFrom,
      prevTo,
      prevLabel: "Semaine précédente",
      daysInPeriod: 7,
    };
  }

  if (mode === "annee") {
    const yRaw = filters.annee && ISO_YEAR.test(filters.annee)
      ? Number(filters.annee)
      : now.getUTCFullYear();
    const y = Number.isFinite(yRaw) ? yRaw : now.getUTCFullYear();
    const from = utcDayStart(y, 0, 1);
    const to = utcDayEnd(y, 11, 31);
    const prevFrom = utcDayStart(y - 1, 0, 1);
    const prevTo = utcDayEnd(y - 1, 11, 31);
    return {
      mode,
      from,
      to,
      label: String(y),
      on: formatIsoUtc(from),
      semaine: weekStartIso(weekStartMonday(from)),
      mois: `${y}-01`,
      annee: String(y),
      fromIso: formatIsoUtc(from),
      toIso: formatIsoUtc(to),
      prevFrom,
      prevTo,
      prevLabel: String(y - 1),
      daysInPeriod: daysInclusive(from, to),
    };
  }

  // mois (défaut)
  let y: number;
  let m0: number;
  if (filters.mois && ISO_MONTH.test(filters.mois)) {
    const [yy, mm] = filters.mois.split("-").map(Number);
    y = yy;
    m0 = mm - 1;
  } else {
    y = now.getUTCFullYear();
    m0 = now.getUTCMonth();
  }
  const from = utcDayStart(y, m0, 1);
  const lastDay = new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
  const to = utcDayEnd(y, m0, lastDay);
  const prevMonth = m0 === 0 ? 11 : m0 - 1;
  const prevYear = m0 === 0 ? y - 1 : y;
  const prevFrom = utcDayStart(prevYear, prevMonth, 1);
  const prevLast = new Date(Date.UTC(prevYear, prevMonth + 1, 0)).getUTCDate();
  const prevTo = utcDayEnd(prevYear, prevMonth, prevLast);

  return {
    mode: "mois",
    from,
    to,
    label: `${MONTHS_FR[m0]} ${y}`,
    on: formatIsoUtc(from),
    semaine: weekStartIso(weekStartMonday(from)),
    mois: `${y}-${String(m0 + 1).padStart(2, "0")}`,
    annee: String(y),
    fromIso: formatIsoUtc(from),
    toIso: formatIsoUtc(to),
    prevFrom,
    prevTo,
    prevLabel: `${MONTHS_FR[prevMonth]} ${prevYear}`,
    daysInPeriod: lastDay,
  };
}

export function buildSvDashboardHref(
  path: string,
  scope: Pick<
    SvDashboardScope,
    | "mode"
    | "on"
    | "semaine"
    | "mois"
    | "annee"
    | "compte"
    | "categorie"
  >,
  extra?: Record<string, string | undefined>,
): string {
  const p = new URLSearchParams();
  if (scope.mode !== "mois") p.set("periode", scope.mode);
  if (scope.mode === "jour") p.set("on", scope.on);
  if (scope.mode === "semaine") p.set("semaine", scope.semaine);
  if (scope.mode === "mois") {
    const now = new Date();
    const cur = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    if (scope.mois !== cur) p.set("mois", scope.mois);
  }
  if (scope.mode === "annee") {
    const curY = String(new Date().getUTCFullYear());
    if (scope.annee !== curY) p.set("annee", scope.annee);
  }
  if (scope.compte) p.set("compte", scope.compte);
  if (scope.categorie) p.set("categorie", scope.categorie);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) p.set(k, v);
    }
  }
  const q = p.toString();
  return q ? `${path}?${q}` : path;
}

export function buildSvMovementsHref(opts: {
  fromIso: string;
  toIso: string;
  direction?: "IN" | "OUT";
  compte?: SvAccountKind | null;
  categorie?: SvCategoryFamily | null;
  categoryRaw?: string;
}): string {
  const p = new URLSearchParams();
  p.set("from", opts.fromIso);
  p.set("to", opts.toIso);
  if (opts.direction) p.set("direction", opts.direction);
  if (opts.compte) p.set("compte", opts.compte);
  if (opts.categorie) p.set("categorie", opts.categorie);
  if (opts.categoryRaw) p.set("category", opts.categoryRaw);
  return `/suivi/mouvements?${p.toString()}`;
}
