import { prisma } from "@/lib/prisma";
import { runSeries } from "@/lib/db/serial";
import {
  accountBalanceFromMoves,
  ensureSvAccounts,
} from "@/lib/suivi/accounts";
import { clientBalance, invoiceReste } from "@/lib/suivi/balances";
import {
  buildCompareBars,
  buildFlowSeries,
  buildSvDashboardAlerts,
  computeExpenseKpis,
  computeRunRate,
  expenseByFamily,
  filterMovesByFamily,
  sumFlows,
  type SvAccountBalance,
  type SvCategorySlice,
  type SvCompareBar,
  type SvDashboardAlert,
  type SvExpenseKpis,
  type SvExpenseRow,
  type SvFlowTotals,
  type SvMoveRow,
  type SvRunRate,
  type SvSeriesPoint,
} from "@/lib/suivi/dashboard-stats";
import type { SvDashboardScope } from "@/lib/suivi/dashboard-period";

export type SvDebtorRow = {
  id: string;
  name: string;
  restant: number;
  totale: number;
  paye: number;
};

export type SvInvoicePeriodKpis = {
  paidCount: number;
  unpaidCount: number;
  resteDue: number;
  amountPaidPeriod: number;
};

export type SvDashboardData = {
  accounts: SvAccountBalance[];
  current: SvFlowTotals;
  previous: SvFlowTotals;
  series: SvSeriesPoint[];
  categories: SvCategorySlice[];
  compare: SvCompareBar[];
  runRate: SvRunRate;
  invoices: SvInvoicePeriodKpis;
  debtors: SvDebtorRow[];
  expenses: SvExpenseKpis;
  alerts: SvDashboardAlert[];
  movementCount: number;
};

function toMoveRow(m: {
  movedAt: Date;
  direction: "IN" | "OUT";
  amount: number;
  category: string;
  accountId: string | null;
  transferId: string | null;
}): SvMoveRow {
  return {
    movedAt: m.movedAt,
    direction: m.direction,
    amount: m.amount,
    category: m.category,
    accountId: m.accountId,
    transferId: m.transferId,
  };
}

export async function loadSvDashboard(
  scope: SvDashboardScope,
  opts: {
    canAccounts: boolean;
    canMovements: boolean;
    canInvoices: boolean;
    canClients: boolean;
    canExpenses: boolean;
  },
): Promise<SvDashboardData> {
  const emptyFlows: SvFlowTotals = {
    inOps: 0,
    outOps: 0,
    inAll: 0,
    outAll: 0,
    netOps: 0,
  };

  let accounts: SvAccountBalance[] = [];
  let accountIdByKind: Partial<Record<"PHYSICAL" | "BANK", string>> = {};

  if (opts.canAccounts) {
    await ensureSvAccounts(prisma);
    const rows = await prisma.svAccount.findMany({
      orderBy: { kind: "asc" },
      include: {
        movements: {
          select: {
            direction: true,
            amount: true,
            countsTowardBalance: true,
          },
        },
      },
    });
    accounts = rows.map((a) => ({
      id: a.id,
      kind: a.kind,
      label: a.label,
      balance: accountBalanceFromMoves(a.movements),
    }));
    accountIdByKind = Object.fromEntries(rows.map((a) => [a.kind, a.id]));
  }

  const accountFilterId = scope.compte
    ? (accountIdByKind[scope.compte] ?? null)
    : null;

  let current = emptyFlows;
  let previous = emptyFlows;
  let series: SvSeriesPoint[] = [];
  let categories: SvCategorySlice[] = [];
  let movementCount = 0;

  if (opts.canMovements) {
    /** Ledger courant uniquement (archive pre-bascule exclue — décision I). */
    const ledgerWhere = {
      countsTowardBalance: true as const,
      ...(accountFilterId ? { accountId: accountFilterId } : {}),
    };
    const [curRaw, prevRaw] = await runSeries([
      () =>
        prisma.svCashMovement.findMany({
          where: {
            ...ledgerWhere,
            movedAt: { gte: scope.from, lte: scope.to },
          },
          select: {
            movedAt: true,
            direction: true,
            amount: true,
            category: true,
            accountId: true,
            transferId: true,
          },
        }),
      () =>
        prisma.svCashMovement.findMany({
          where: {
            ...ledgerWhere,
            movedAt: { gte: scope.prevFrom, lte: scope.prevTo },
          },
          select: {
            movedAt: true,
            direction: true,
            amount: true,
            category: true,
            accountId: true,
            transferId: true,
          },
        }),
    ]);

    let curMoves = curRaw.map(toMoveRow);
    let prevMoves = prevRaw.map(toMoveRow);
    curMoves = filterMovesByFamily(curMoves, scope.categorie);
    prevMoves = filterMovesByFamily(prevMoves, scope.categorie);

    current = sumFlows(curMoves);
    previous = sumFlows(prevMoves);
    series = buildFlowSeries(curMoves, scope.mode, scope.from, scope.to);
    categories = expenseByFamily(curMoves);
    movementCount = curMoves.length;
  }

  const runRate = computeRunRate(current.outOps, scope.daysInPeriod);
  const compare = buildCompareBars(current, previous);

  let invoices: SvInvoicePeriodKpis = {
    paidCount: 0,
    unpaidCount: 0,
    resteDue: 0,
    amountPaidPeriod: 0,
  };
  let debtors: SvDebtorRow[] = [];
  let expenses: SvExpenseKpis = {
    unpaidCount: 0,
    paidCount: 0,
    resteAPayer: 0,
    amountPaidPeriod: 0,
    byCategory: [],
  };
  let expenseRows: SvExpenseRow[] = [];

  if (opts.canInvoices) {
    const allInvoices = await prisma.svInvoice.findMany({
      where: { status: { not: "ANNULEE" } },
      select: {
        status: true,
        totalTtc: true,
        amountPaid: true,
        issuedAt: true,
        clientId: true,
        client: { select: { id: true, name: true } },
        payments: {
          where: {
            paidAt: { gte: scope.from, lte: scope.to },
          },
          select: { amount: true },
        },
      },
    });

    let paidCount = 0;
    let unpaidCount = 0;
    let resteDue = 0;
    let amountPaidPeriod = 0;

    for (const inv of allInvoices) {
      const reste = invoiceReste(inv);
      if (reste > 0) {
        unpaidCount += 1;
        resteDue += reste;
      }
      if (inv.status === "PAYEE") paidCount += 1;
      for (const p of inv.payments) amountPaidPeriod += p.amount;
    }

    invoices = { paidCount, unpaidCount, resteDue, amountPaidPeriod };
  }

  if (opts.canClients) {
    const clients = await prisma.svClient.findMany({
      select: {
        id: true,
        name: true,
        invoices: {
          where: { status: { not: "ANNULEE" } },
          select: {
            totalTtc: true,
            amountPaid: true,
            status: true,
            dueAt: true,
            issuedAt: true,
          },
        },
      },
    });
    debtors = clients
      .map((c) => {
        const bal = clientBalance(c.invoices);
        return {
          id: c.id,
          name: c.name,
          restant: bal.restant,
          totale: bal.totale,
          paye: bal.paye,
        };
      })
      .filter((c) => c.restant > 0)
      .sort((a, b) => b.restant - a.restant)
      .slice(0, 8);
  }

  if (opts.canExpenses) {
    const [allExpenses, periodPays] = await runSeries([
      () =>
        prisma.svExpenseInvoice.findMany({
          where: { status: { not: "ANNULEE" } },
          select: {
            id: true,
            number: true,
            vendorName: true,
            category: true,
            status: true,
            totalTtc: true,
            amountPaid: true,
            dueAt: true,
            issuedAt: true,
          },
        }),
      () =>
        prisma.svExpensePayment.findMany({
          where: {
            paidAt: { gte: scope.from, lte: scope.to },
            invoice: { status: { not: "ANNULEE" } },
          },
          select: { amount: true },
        }),
    ]);
    expenseRows = allExpenses;
    expenses = computeExpenseKpis(allExpenses, periodPays);
  }

  const alerts = buildSvDashboardAlerts({
    expenses: opts.canExpenses ? expenseRows : [],
    debtors: opts.canClients ? debtors : [],
  });

  return {
    accounts,
    current,
    previous,
    series,
    categories,
    compare,
    runRate,
    invoices,
    debtors,
    expenses,
    alerts,
    movementCount,
  };
}
