import assert from "node:assert/strict";
import { computeDocTotals } from "./totals";

assert.deepEqual(
  computeDocTotals({
    lines: [
      { qty: 2, unitPrice: 1000 },
      { qty: 1, unitPrice: 500, isTravel: true },
    ],
    vatEnabled: false,
    vatRate: 18,
    promoEnabled: false,
    includeTravel: false,
  }),
  { totalHt: 2000, totalVat: 0, totalTtc: 2000 },
);

assert.deepEqual(
  computeDocTotals({
    lines: [
      { qty: 2, unitPrice: 1000 },
      { qty: 1, unitPrice: 500, isTravel: true },
    ],
    vatEnabled: true,
    vatRate: 18,
    promoEnabled: false,
    includeTravel: true,
  }),
  { totalHt: 2500, totalVat: 450, totalTtc: 2950 },
);

assert.deepEqual(
  computeDocTotals({
    lines: [{ qty: 1, unitPrice: 10_000 }],
    vatEnabled: false,
    vatRate: 0,
    promoEnabled: true,
    promoPercent: 10,
    includeTravel: true,
  }),
  { totalHt: 9000, totalVat: 0, totalTtc: 9000 },
);

console.log("totals.test.ts OK");
