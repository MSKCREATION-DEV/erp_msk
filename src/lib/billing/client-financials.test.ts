import assert from "node:assert/strict";
import { computeClientFinancials } from "./client-financials";

const snap = computeClientFinancials({
  asOf: new Date("2026-11-04T12:00:00Z"),
  invoices: [
    {
      id: "sept",
      status: "PARTIELLEMENT_PAYEE",
      totalTtc: 306_800,
      amountPaid: 200_000,
      dueDate: new Date("2026-10-05"),
      issuedAt: new Date("2026-09-29"),
      createdAt: new Date("2026-09-29"),
      allocations: [
        { paymentId: "p1", invoiceId: "sept", amount: 200_000 },
      ],
      creditNotesApplied: 0,
    },
    {
      id: "oct",
      status: "EMISE",
      totalTtc: 306_800,
      amountPaid: 0,
      dueDate: new Date("2026-11-05"),
      issuedAt: new Date("2026-10-29"),
      createdAt: new Date("2026-10-29"),
      allocations: [],
      creditNotesApplied: 0,
    },
  ],
  payments: [
    {
      id: "p1",
      amount: 200_000,
      paidAt: new Date("2026-10-10"),
      allocationsSum: 200_000,
    },
  ],
});

assert.equal(snap.totalInvoiced, 613_600);
assert.equal(snap.totalPaidAllocated, 200_000);
assert.equal(snap.openReceivable, 106_800 + 306_800);
assert.equal(snap.overdueAmount, 106_800);
assert.equal(snap.unpaidCount, 2);
assert.equal(snap.partialCount, 1);

console.log("client-financials.test.ts OK");
