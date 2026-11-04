import assert from "node:assert/strict";
import { allocatePaymentFifo, computeInvoiceBalance } from "./allocations";
import {
  detectExcelVsDocument,
  detectLinesVsDeclaredTotal,
} from "./anomaly";
import { computeAging } from "./ar-aging";
import {
  computeClientOpenReceivable,
  computeNetPayable,
} from "./arrears";
import {
  buildPeriodInvoice,
  periodAlreadyInvoiced,
} from "./invoice-engine";
import { computeLineTotals } from "./line-totals";
import { computeVat } from "./tax";

// ─── TVA / lignes ───────────────────────────────────────────

assert.deepEqual(computeVat({ ht: 260_000, vatEnabled: true, vatRate: 18 }), {
  ht: 260_000,
  vatRate: 18,
  vatAmount: 46_800,
  ttc: 306_800,
});

assert.deepEqual(
  computeLineTotals({
    lines: [
      { qty: 1, unitPrice: 200_000 },
      { qty: 1, unitPrice: 60_000 },
    ],
    vatEnabled: true,
    vatRate: 18,
  }),
  {
    ht: 260_000,
    vatRate: 18,
    vatAmount: 46_800,
    ttc: 306_800,
    grossHt: 260_000,
    promoAmount: 0,
  },
);

// ─── Cas ECOSOL ─────────────────────────────────────────────

const septTtc = 306_800;
const septPayment = 200_000;
const septBalance = computeInvoiceBalance({
  invoiceId: "inv-sept",
  totalTtc: septTtc,
  allocations: [
    { paymentId: "pay-1", invoiceId: "inv-sept", amount: septPayment },
  ],
});
assert.equal(septBalance.openBalance, 106_800);

const ecosolOct = buildPeriodInvoice({
  lines: [
    {
      id: "l1",
      label: "Gestion RS Premium",
      qty: 1,
      unitPrice: 200_000,
      dueForPeriod: true,
    },
    {
      id: "l2",
      label: "Déplacement",
      qty: 1,
      unitPrice: 60_000,
      dueForPeriod: true,
    },
  ],
  vatEnabled: true,
  vatRate: 18,
  priorOpenInvoices: [
    {
      invoiceId: "inv-sept",
      number: "FAC-SEPT",
      totalTtc: septTtc,
      allocations: [
        { paymentId: "pay-1", invoiceId: "inv-sept", amount: septPayment },
      ],
    },
  ],
});

assert.equal(ecosolOct.periodHt, 260_000);
assert.equal(ecosolOct.periodVat, 46_800);
assert.equal(ecosolOct.periodTtc, 306_800);
assert.equal(ecosolOct.net.arrearsPresented, 106_800);
assert.equal(ecosolOct.net.netPayable, 413_600);
// Anti double-comptage : créance créée = période seule
assert.equal(ecosolOct.net.receivableCreated, 306_800);
// Solde client global = sept ouvert + oct TTC (oct pas encore payée)
assert.equal(
  computeClientOpenReceivable([
    septBalance.openBalance,
    ecosolOct.periodTtc,
  ]),
  106_800 + 306_800,
);

// Présentation net payable explicite
const net = computeNetPayable({
  periodTtc: 306_800,
  arrearsRefs: [
    {
      sourceInvoiceId: "inv-sept",
      sourceInvoiceNumber: "FAC-SEPT",
      presentedAmount: 106_800,
    },
  ],
});
assert.equal(net.netPayable, 413_600);

// ─── Cas Prosperity — anomalie 63 000 ───────────────────────

const prosperityLines = 424_000 + 100_000 + 150_000 + 100_000; // 774_000
const prosperityDeclared = 837_000;
const anomaly = detectLinesVsDeclaredTotal({
  linesSum: prosperityLines,
  declaredTotal: prosperityDeclared,
});
assert.ok(anomaly);
assert.equal(anomaly!.delta, 63_000);
assert.equal(anomaly!.code, "LINES_VS_DECLARED_TOTAL");

const acomptes = 300_000 + 150_000;
assert.equal(acomptes, 450_000);
assert.equal(prosperityDeclared - acomptes, 387_000);

// Excel vs DOCX ECOSOL
const ecosolExcelAnomaly = detectExcelVsDocument({
  excelAmount: 306_000,
  documentAmount: 306_800,
  label: "ECOSOL sept TTC",
});
assert.ok(ecosolExcelAnomaly);
assert.equal(ecosolExcelAnomaly!.delta, 800);

// ─── Allocations multi-factures ─────────────────────────────

const fifo = allocatePaymentFifo({
  paymentId: "pay-multi",
  paymentAmount: 250_000,
  openInvoices: [
    { invoiceId: "a", openBalance: 100_000 },
    { invoiceId: "b", openBalance: 200_000 },
  ],
});
assert.deepEqual(fifo.allocations, [
  { paymentId: "pay-multi", invoiceId: "a", amount: 100_000 },
  { paymentId: "pay-multi", invoiceId: "b", amount: 150_000 },
]);
assert.equal(fifo.unallocated, 0);

const deposit = allocatePaymentFifo({
  paymentId: "pay-dep",
  paymentAmount: 50_000,
  openInvoices: [],
});
assert.equal(deposit.unallocated, 50_000);

// ─── Aging ──────────────────────────────────────────────────

const asOf = new Date("2026-11-04T12:00:00Z");
const aging = computeAging(
  [
    {
      invoiceId: "i1",
      openBalance: 100_000,
      dueDate: new Date("2026-10-20T00:00:00Z"),
    },
    {
      invoiceId: "i2",
      openBalance: 50_000,
      dueDate: new Date("2026-08-01T00:00:00Z"),
    },
  ],
  asOf,
);
assert.equal(aging.totalOpen, 150_000);
assert.equal(aging.byBucket["0_30"], 100_000);
assert.equal(aging.byBucket["90_PLUS"], 50_000);

// ─── Période déjà facturée ──────────────────────────────────

assert.equal(
  periodAlreadyInvoiced({
    periodStart: new Date("2026-10-01"),
    periodEnd: new Date("2026-11-01"),
    existingPeriods: [
      { periodStart: new Date("2026-10-01"), periodEnd: new Date("2026-11-01") },
    ],
  }),
  true,
);
assert.equal(
  periodAlreadyInvoiced({
    periodStart: new Date("2026-11-01"),
    periodEnd: new Date("2026-12-01"),
    existingPeriods: [
      { periodStart: new Date("2026-10-01"), periodEnd: new Date("2026-11-01") },
    ],
  }),
  false,
);

console.log("billing.test.ts OK");
