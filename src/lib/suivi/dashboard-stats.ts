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

/** Charges fournisseurs (sv_expense_*) — distinct des factures clients. */
export type SvExpenseRow = {
  id: string;
  number: string | null;
  vendorName: string;
  category: "ORANGE_INTERNET" | "EDM_ELECTRICITE" | "LOYER" | "AUTRE";
  status: string;
  totalTtc: number;
  amountPaid: number;
  dueAt: Date | null;
  issuedAt: Date | null;
};

export type SvExpenseCategorySlice = {
  category: SvExpenseRow["category"];
  label: string;
  amountDue: number;
  count: number;
};

export type SvExpenseKpis = {
  unpaidCount: number;
  paidCount: number;
  resteAPayer: number;
  amountPaidPeriod: number;
  /** Ouvertes avec échéance passée (reste > 0). */
  overdueCount: number;
  overdueAmount: number;
  /** Ouvertes avec échéance dans ≤ SV_EXPENSE_DUE_SOON_DAYS. */
  dueSoonCount: number;
  dueSoonAmount: number;
  byCategory: SvExpenseCategorySlice[];
};

export type SvAlertKind =
  | "charge_retard"
  | "charge_bientot"
  | "dette_client";

export type SvDashboardAlert = {
  kind: SvAlertKind;
  severity: "urgent" | "attention";
  title: string;
  detail: string;
  amount: number;
  href: string;
};

const EXPENSE_CAT_LABEL: Record<SvExpenseRow["category"], string> = {
  ORANGE_INTERNET: "Orange / Internet",
  EDM_ELECTRICITE: "EDM",
  LOYER: "Loyer",
  AUTRE: "Autre",
};

const MS_DAY = 24 * 60 * 60 * 1000;
/** Fenêtre « bientôt due » (jours calendaires). */
export const SV_EXPENSE_DUE_SOON_DAYS = 7;

export function expenseReste(row: {
  totalTtc: number;
  amountPaid: number;
}): number {
  return Math.max(0, row.totalTtc - row.amountPaid);
}

export function isExpenseOpen(status: string): boolean {
  return status === "BROUILLON" || status === "EMISE" || status === "PARTIELLE";
}

/** Date d’échéance retenue (dueAt, sinon émission). */
export function expenseDueRef(row: {
  dueAt: Date | null;
  issuedAt: Date | null;
}): Date | null {
  return row.dueAt ?? row.issuedAt;
}

/** Affichage JJ/MM/AAAA en UTC (Bamako = UTC+0). */
export function formatSvDateFr(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export type ExpenseDueBucket = "retard" | "bientot";

/** Retard / bientôt dû pour une charge ouverte avec reste. */
export function expenseDueBucket(
  row: {
    status: string;
    totalTtc: number;
    amountPaid: number;
    dueAt: Date | null;
    issuedAt: Date | null;
  },
  now: Date = new Date(),
): ExpenseDueBucket | null {
  if (!isExpenseOpen(row.status)) return null;
  if (expenseReste(row) <= 0) return null;
  const due = expenseDueRef(row);
  if (!due) return null;
  const delta = due.getTime() - now.getTime();
  if (delta < 0) return "retard";
  if (delta <= SV_EXPENSE_DUE_SOON_DAYS * MS_DAY) return "bientot";
  return null;
}

/** Libellé alerte / liste : date + retard ou délai. */
export function formatExpenseDueAlertDetail(
  due: Date,
  now: Date,
  kind: ExpenseDueBucket,
): string {
  const dateFr = formatSvDateFr(due);
  const delta = due.getTime() - now.getTime();
  if (kind === "retard") {
    const days = Math.max(1, Math.ceil(-delta / MS_DAY));
    return `Échéance le ${dateFr} · ${days} jour${days > 1 ? "s" : ""} de retard`;
  }
  const days = Math.max(0, Math.ceil(delta / MS_DAY));
  if (days === 0) return `Échéance le ${dateFr} · à régler aujourd’hui`;
  return `Échéance le ${dateFr} · dans ${days} jour${days > 1 ? "s" : ""}`;
}

/** Agrégats charges : à payer, payées période, répartition type. */
export function computeExpenseKpis(
  rows: SvExpenseRow[],
  periodPayments: { amount: number }[],
  now: Date = new Date(),
): SvExpenseKpis {
  let unpaidCount = 0;
  let paidCount = 0;
  let resteAPayer = 0;
  let overdueCount = 0;
  let overdueAmount = 0;
  let dueSoonCount = 0;
  let dueSoonAmount = 0;
  const byCat = new Map<
    SvExpenseRow["category"],
    { amountDue: number; count: number }
  >();

  for (const row of rows) {
    if (row.status === "ANNULEE") continue;
    const reste = expenseReste(row);
    if (reste > 0 && isExpenseOpen(row.status)) {
      unpaidCount += 1;
      resteAPayer += reste;
      const slot = byCat.get(row.category) ?? { amountDue: 0, count: 0 };
      slot.amountDue += reste;
      slot.count += 1;
      byCat.set(row.category, slot);
      const bucket = expenseDueBucket(row, now);
      if (bucket === "retard") {
        overdueCount += 1;
        overdueAmount += reste;
      } else if (bucket === "bientot") {
        dueSoonCount += 1;
        dueSoonAmount += reste;
      }
    }
    if (row.status === "PAYEE") paidCount += 1;
  }

  const amountPaidPeriod = periodPayments.reduce((s, p) => s + p.amount, 0);
  const byCategory: SvExpenseCategorySlice[] = [...byCat.entries()]
    .map(([category, v]) => ({
      category,
      label: EXPENSE_CAT_LABEL[category],
      amountDue: v.amountDue,
      count: v.count,
    }))
    .sort((a, b) => b.amountDue - a.amountDue);

  return {
    unpaidCount,
    paidCount,
    resteAPayer,
    amountPaidPeriod,
    overdueCount,
    overdueAmount,
    dueSoonCount,
    dueSoonAmount,
    byCategory,
  };
}

/** Alertes unifiées charges + dettes clients critiques. */
export function buildSvDashboardAlerts(input: {
  now?: Date;
  expenses: SvExpenseRow[];
  debtors: { id: string; name: string; restant: number }[];
  /** Seuil dette client « critique » (FCFA). */
  debtorCriticalMin?: number;
}): SvDashboardAlert[] {
  const now = input.now ?? new Date();
  const debtorMin = input.debtorCriticalMin ?? 100_000;
  const alerts: SvDashboardAlert[] = [];

  for (const row of input.expenses) {
    if (!isExpenseOpen(row.status)) continue;
    const reste = expenseReste(row);
    if (reste <= 0) continue;
    const due = expenseDueRef(row);
    if (!due) continue;
    const bucket = expenseDueBucket(row, now);
    if (!bucket) continue;
    const label =
      row.number?.trim() ||
      `${EXPENSE_CAT_LABEL[row.category]} · ${row.vendorName}`;
    if (bucket === "retard") {
      alerts.push({
        kind: "charge_retard",
        severity: "urgent",
        title: `Charge en retard · ${label}`,
        detail: formatExpenseDueAlertDetail(due, now, "retard"),
        amount: reste,
        href: `/suivi/charges/${row.id}`,
      });
    } else {
      alerts.push({
        kind: "charge_bientot",
        severity: "attention",
        title: `Charge bientôt due · ${label}`,
        detail: formatExpenseDueAlertDetail(due, now, "bientot"),
        amount: reste,
        href: `/suivi/charges/${row.id}`,
      });
    }
  }

  for (const d of input.debtors) {
    if (d.restant < debtorMin) continue;
    alerts.push({
      kind: "dette_client",
      severity: d.restant >= 500_000 ? "urgent" : "attention",
      title: `Dette client · ${d.name}`,
      detail: "Reste à encaisser (seuil critique)",
      amount: d.restant,
      href: `/suivi/clients/${d.id}`,
    });
  }

  const severityRank = { urgent: 0, attention: 1 };
  return alerts.sort((a, b) => {
    const s = severityRank[a.severity] - severityRank[b.severity];
    if (s !== 0) return s;
    return b.amount - a.amount;
  });
}
