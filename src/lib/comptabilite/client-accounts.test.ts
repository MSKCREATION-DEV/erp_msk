import assert from "node:assert/strict";
import {
  deriveClientAccountStatut,
  filterClientAccountRows,
  matchesClientAccountQuery,
  parseClientAccountSortKey,
  parseClientAccountStatutFilter,
  sortClientAccountRows,
  sumClientAccountTotals,
  type ClientAccountRow,
} from "./client-accounts";
import type { ClientFinancialSnapshot } from "@/lib/billing/client-financials";

function fin(partial: Partial<ClientFinancialSnapshot>): ClientFinancialSnapshot {
  return {
    totalInvoiced: 0,
    totalPaidAllocated: 0,
    openReceivable: 0,
    overdueAmount: 0,
    unpaidCount: 0,
    paidCount: 0,
    partialCount: 0,
    unallocatedCredit: 0,
    lastPaymentAt: null,
    nextDueDate: null,
    aging: { rows: [], byBucket: { "0_30": 0, "31_60": 0, "61_90": 0, "90_PLUS": 0 }, totalOpen: 0 },
    ...partial,
  };
}

function row(
  id: string,
  name: string,
  finPartial: Partial<ClientFinancialSnapshot>,
  extra?: Partial<ClientAccountRow["client"]>,
): ClientAccountRow {
  return {
    client: {
      id,
      name,
      status: "ACTIF",
      contactName: null,
      email: null,
      phone: null,
      ownerName: "Awa Diop",
      createdAt: new Date("2026-01-01"),
      ...extra,
    },
    fin: fin(finPartial),
  };
}

// deriveClientAccountStatut
assert.equal(
  deriveClientAccountStatut({ openReceivable: 0, overdueAmount: 0 }),
  "SOLDE",
);
assert.equal(
  deriveClientAccountStatut({ openReceivable: 1000, overdueAmount: 500 }),
  "RETARD",
);
assert.equal(
  deriveClientAccountStatut({ openReceivable: 1000, overdueAmount: 0 }),
  "OUVERT",
);

// parseClientAccountStatutFilter — ignore valeurs invalides
assert.deepEqual(parseClientAccountStatutFilter({ statut: "RETARD,SOLDE" }), [
  "RETARD",
  "SOLDE",
]);
assert.deepEqual(parseClientAccountStatutFilter({ statut: "RETARD,FOO" }), [
  "RETARD",
]);
assert.deepEqual(parseClientAccountStatutFilter({}), []);

// matchesClientAccountQuery — accents / casse insensibles
assert.equal(
  matchesClientAccountQuery(
    { id: "1", name: "Société Électrique", status: "ACTIF", contactName: null, email: null, phone: null, ownerName: "", createdAt: new Date() },
    "electrique",
  ),
  true,
);
assert.equal(
  matchesClientAccountQuery(
    { id: "1", name: "Acme", status: "ACTIF", contactName: null, email: "jean@acme.com", phone: null, ownerName: "", createdAt: new Date() },
    "jean@acme",
  ),
  true,
);
assert.equal(
  matchesClientAccountQuery(
    { id: "1", name: "Acme", status: "ACTIF", contactName: null, email: null, phone: null, ownerName: "", createdAt: new Date() },
    "zzz",
  ),
  false,
);

// filterClientAccountRows — statut + q combinés
const rows: ClientAccountRow[] = [
  row("a", "Alpha SARL", { openReceivable: 0, overdueAmount: 0 }),
  row("b", "Beta SA", { openReceivable: 1000, overdueAmount: 1000 }),
  row("c", "Gamma Corp", { openReceivable: 500, overdueAmount: 0 }),
];
assert.deepEqual(
  filterClientAccountRows(rows, { statut: ["RETARD"] }).map((r) => r.client.id),
  ["b"],
);
assert.deepEqual(
  filterClientAccountRows(rows, { q: "gamma" }).map((r) => r.client.id),
  ["c"],
);
assert.deepEqual(
  filterClientAccountRows(rows, {}).map((r) => r.client.id),
  ["a", "b", "c"],
);

// sortClientAccountRows
const byBalanceDesc = sortClientAccountRows(rows, "balance", "desc").map(
  (r) => r.client.id,
);
assert.deepEqual(byBalanceDesc, ["b", "c", "a"]);
const byNameAsc = sortClientAccountRows(rows, "name", "asc").map(
  (r) => r.client.id,
);
assert.deepEqual(byNameAsc, ["a", "b", "c"]);

// parseClientAccountSortKey — fallback balance
assert.equal(parseClientAccountSortKey("name"), "name");
assert.equal(parseClientAccountSortKey("bogus"), "balance");
assert.equal(parseClientAccountSortKey(undefined), "balance");

// sumClientAccountTotals
const totals = sumClientAccountTotals(rows);
assert.deepEqual(totals, {
  totalInvoiced: 0,
  totalPaid: 0,
  totalOpen: 1500,
  totalOverdue: 1000,
});

console.log("client-accounts.test.ts OK");
