import assert from "node:assert/strict";
import {
  buildCompareBars,
  buildFlowSeries,
  buildSvDashboardAlerts,
  computeExpenseKpis,
  computeRunRate,
  expenseByFamily,
  sumFlows,
  type SvExpenseRow,
  type SvMoveRow,
} from "@/lib/suivi/dashboard-stats";
import { normalizeSvCategoryFamily } from "@/lib/suivi/categories";
import { parseSvDashboardFilters } from "@/lib/suivi/dashboard-period";

assert.equal(normalizeSvCategoryFamily("Repas / eau"), "alimentation");
assert.equal(normalizeSvCategoryFamily("Transport / carburant"), "transport");
assert.equal(normalizeSvCategoryFamily("Téléphone / Internet"), "internet");
assert.equal(normalizeSvCategoryFamily("Ouverture / bascule"), "ouverture");
assert.equal(
  normalizeSvCategoryFamily("Ouverture / Bascule Direction"),
  "ouverture",
);

const moves: SvMoveRow[] = [
  {
    movedAt: new Date("2026-11-05T10:00:00Z"),
    direction: "OUT",
    amount: 5_000,
    category: "Transport",
    accountId: "a1",
    transferId: null,
  },
  {
    movedAt: new Date("2026-11-06T10:00:00Z"),
    direction: "OUT",
    amount: 3_000,
    category: "Repas / eau",
    accountId: "a1",
    transferId: null,
  },
  {
    movedAt: new Date("2026-11-06T12:00:00Z"),
    direction: "OUT",
    amount: 50_000,
    category: "Banque / transfert",
    accountId: "a1",
    transferId: "t1",
  },
  {
    movedAt: new Date("2026-11-07T10:00:00Z"),
    direction: "IN",
    amount: 200_000,
    category: "Encaissement client",
    accountId: "a1",
    transferId: null,
  },
  {
    movedAt: new Date("2026-11-12T08:00:00Z"),
    direction: "IN",
    amount: 145_000,
    category: "Ouverture / bascule",
    accountId: "a1",
    transferId: null,
  },
];

const flows = sumFlows(moves);
assert.equal(flows.outOps, 8_000, "transferts exclus des sorties ops");
assert.equal(flows.inOps, 200_000, "ouverture exclue des entrées ops");
assert.equal(flows.outAll, 58_000);
assert.equal(flows.inAll, 345_000);

const slices = expenseByFamily(moves);
assert.equal(slices.length, 2);
assert.equal(slices[0]!.family, "transport");
assert.equal(slices[0]!.amount, 5_000);
assert.equal(slices[1]!.family, "alimentation");

const rate = computeRunRate(8_000, 10);
assert.equal(rate.dailyAvgOut, 800);
assert.equal(rate.monthEstimate, 24_000);
assert.equal(rate.yearEstimate, 292_000);

const series = buildFlowSeries(
  moves,
  "mois",
  new Date("2026-11-01T00:00:00Z"),
  new Date("2026-11-30T23:59:59Z"),
);
assert.ok(series.length >= 28);
const day5 = series.find((p) => p.key === "2026-11-05");
assert.equal(day5?.outOps, 5_000);

const bars = buildCompareBars(flows, {
  inOps: 100_000,
  outOps: 4_000,
  inAll: 100_000,
  outAll: 4_000,
  netOps: 96_000,
});
assert.equal(bars[0]!.current, 8_000);
assert.equal(bars[0]!.previous, 4_000);

const scope = parseSvDashboardFilters({
  periode: "mois",
  mois: "2026-11",
  compte: "PHYSICAL",
  categorie: "transport",
});
assert.equal(scope.mode, "mois");
assert.equal(scope.mois, "2026-11");
assert.equal(scope.compte, "PHYSICAL");
assert.equal(scope.categorie, "transport");
assert.equal(scope.daysInPeriod, 30);

const bad = parseSvDashboardFilters({ periode: "invalid", compte: "X" });
assert.equal(bad.mode, "mois");
assert.equal(bad.compte, null);

const expenseRows: SvExpenseRow[] = [
  {
    id: "e1",
    number: "2026/01597",
    vendorName: "GAMBY",
    category: "LOYER",
    status: "EMISE",
    totalTtc: 400_000,
    amountPaid: 0,
    dueAt: new Date("2026-11-07T00:00:00Z"),
    issuedAt: new Date("2026-11-02T00:00:00Z"),
  },
  {
    id: "e2",
    number: "455053",
    vendorName: "EDM",
    category: "EDM_ELECTRICITE",
    status: "EMISE",
    totalTtc: 47_615,
    amountPaid: 0,
    dueAt: new Date("2026-11-13T00:00:00Z"),
    issuedAt: new Date("2026-10-28T00:00:00Z"),
  },
  {
    id: "e3",
    number: "CB503620260801",
    vendorName: "Orange",
    category: "ORANGE_INTERNET",
    status: "PAYEE",
    totalTtc: 79_113,
    amountPaid: 79_113,
    dueAt: new Date("2026-10-12T00:00:00Z"),
    issuedAt: new Date("2026-09-10T00:00:00Z"),
  },
];

const expKpis = computeExpenseKpis(expenseRows, [{ amount: 79_113 }]);
assert.equal(expKpis.unpaidCount, 2);
assert.equal(expKpis.paidCount, 1);
assert.equal(expKpis.resteAPayer, 447_615);
assert.equal(expKpis.amountPaidPeriod, 79_113);
assert.equal(expKpis.byCategory[0]!.category, "LOYER");

const alerts = buildSvDashboardAlerts({
  now: new Date("2026-11-12T12:00:00Z"),
  expenses: expenseRows,
  debtors: [
    { id: "c1", name: "ECOSOL", restant: 153_600 },
    { id: "c2", name: "Petit", restant: 50_000 },
  ],
});
assert.ok(alerts.some((a) => a.kind === "charge_retard" && a.href.includes("e1")));
assert.ok(alerts.some((a) => a.kind === "charge_bientot" && a.href.includes("e2")));
assert.ok(alerts.some((a) => a.kind === "dette_client" && a.title.includes("ECOSOL")));
assert.ok(!alerts.some((a) => a.title.includes("Petit")));

console.log("dashboard-stats.test.ts OK");
