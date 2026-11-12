import type { SvAccountKind, SvCashDirection } from "@/generated/prisma/client";
import {
  isOpsExpenseFamily,
  normalizeSvCategoryFamily,
  SV_CATEGORY_FAMILY_COLOR,
  SV_CATEGORY_FAMILY_LABEL,
  type SvCategoryFamily,
} from "@/lib/suivi/categories";
import type { SvPeriodMode } from "@/lib/suivi/dashboard-period";

export type SvMoveRow = {
  movedAt: Date;
  direction: SvCashDirection;
  amount: number;
  category: string;
  accountId: string | null;
  transferId: string | null;
};

export type SvAccountBalance = {
  id: string;
  kind: SvAccountKind;
  label: string;
  balance: number;
};

export type SvFlowTotals = {
  inOps: number;
  outOps: number;
  inAll: number;
  outAll: number;
  netOps: number;
};

export type SvCategorySlice = {
  family: SvCategoryFamily;
  label: string;
  color: string;
  amount: number;
  key: string;
};

export type SvSeriesPoint = {
  key: string;
  label: string;
  inOps: number;
  outOps: number;
};

export type SvRunRate = {
  dailyAvgOut: number;
  /** Estimation projection mois civil (30,44 j). */
  monthEstimate: number;
  /** Estimation projection année (365 j). */
  yearEstimate: number;
  daysSampled: number;
};

export type SvCompareBar = {
  key: string;
  label: string;
  current: number;
  previous: number;
};

function isOpsMove(m: SvMoveRow): boolean {
  const family = normalizeSvCategoryFamily(m.category);
  if (m.transferId) return false;
  if (!isOpsExpenseFamily(family) && m.direction === "OUT") return false;
  if (family === "ouverture") return false;
  if (family === "transfert") return false;
  if (family === "encaissement" && m.direction === "OUT") return false;
  return true;
}

export function sumFlows(moves: SvMoveRow[]): SvFlowTotals {
  let inOps = 0;
  let outOps = 0;
  let inAll = 0;
  let outAll = 0;
  for (const m of moves) {
    if (m.direction === "IN") inAll += m.amount;
    else outAll += m.amount;
    if (!isOpsMove(m)) continue;
    if (m.direction === "IN") inOps += m.amount;
    else outOps += m.amount;
  }
  return { inOps, outOps, inAll, outAll, netOps: inOps - outOps };
}

export function expenseByFamily(moves: SvMoveRow[]): SvCategorySlice[] {
  const map = new Map<SvCategoryFamily, number>();
  for (const m of moves) {
    if (m.direction !== "OUT") continue;
    if (m.transferId) continue;
    const family = normalizeSvCategoryFamily(m.category);
    if (!isOpsExpenseFamily(family)) continue;
    map.set(family, (map.get(family) ?? 0) + m.amount);
  }
  return [...map.entries()]
    .map(([family, amount]) => ({
      family,
      label: SV_CATEGORY_FAMILY_LABEL[family],
      color: SV_CATEGORY_FAMILY_COLOR[family],
      amount,
      key: family,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function bucketKey(d: Date, mode: SvPeriodMode): string {
  const iso = d.toISOString().slice(0, 10);
  if (mode === "annee") return iso.slice(0, 7); // YYYY-MM
  if (mode === "mois") return iso; // day
  if (mode === "semaine") return iso;
  return iso;
}

function bucketLabel(key: string, mode: SvPeriodMode): string {
  if (mode === "annee") {
    const [y, m] = key.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("fr-FR", {
      month: "short",
      timeZone: "UTC",
    });
  }
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function buildFlowSeries(
  moves: SvMoveRow[],
  mode: SvPeriodMode,
  from: Date,
  to: Date,
): SvSeriesPoint[] {
  const map = new Map<string, { inOps: number; outOps: number }>();

  // Prefill buckets for continuous axis
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  while (cursor.getTime() <= end.getTime()) {
    const key = bucketKey(cursor, mode);
    if (!map.has(key)) map.set(key, { inOps: 0, outOps: 0 });
    if (mode === "annee") {
      cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
    } else {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  for (const m of moves) {
    if (!isOpsMove(m)) continue;
    const key = bucketKey(m.movedAt, mode);
    const slot = map.get(key) ?? { inOps: 0, outOps: 0 };
    if (m.direction === "IN") slot.inOps += m.amount;
    else slot.outOps += m.amount;
    map.set(key, slot);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      key,
      label: bucketLabel(key, mode),
      inOps: v.inOps,
      outOps: v.outOps,
    }));
}

export function computeRunRate(
  outOps: number,
  daysInPeriod: number,
): SvRunRate {
  const days = Math.max(1, daysInPeriod);
  const dailyAvgOut = Math.round(outOps / days);
  return {
    dailyAvgOut,
    monthEstimate: dailyAvgOut * 30,
    yearEstimate: dailyAvgOut * 365,
    daysSampled: days,
  };
}

export function buildCompareBars(
  current: SvFlowTotals,
  previous: SvFlowTotals,
): SvCompareBar[] {
  return [
    {
      key: "out",
      label: "Sorties",
      current: current.outOps,
      previous: previous.outOps,
    },
    {
      key: "in",
      label: "Entrées",
      current: current.inOps,
      previous: previous.inOps,
    },
  ];
}

export function filterMovesByAccount(
  moves: SvMoveRow[],
  accountId: string | null,
): SvMoveRow[] {
  if (!accountId) return moves;
  return moves.filter((m) => m.accountId === accountId);
}

export function filterMovesByFamily(
  moves: SvMoveRow[],
  family: SvCategoryFamily | null,
): SvMoveRow[] {
  if (!family) return moves;
  return moves.filter((m) => normalizeSvCategoryFamily(m.category) === family);
}
