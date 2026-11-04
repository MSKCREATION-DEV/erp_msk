import assert from "node:assert/strict";
import {
  buildContractLinesFromQuote,
  nextContractReference,
} from "./contract-from-quote";

const start = new Date("2026-11-01T00:00:00Z");
const lines = buildContractLinesFromQuote(
  [
    {
      id: "ql1",
      label: "RS Premium",
      qty: 1,
      unitPrice: 200_000,
      catalogOfferId: "off1",
      isTravel: false,
      sortOrder: 0,
    },
    {
      id: "ql2",
      label: "Déplacement",
      qty: 1,
      unitPrice: 60_000,
      isTravel: true,
      sortOrder: 1,
    },
  ],
  start,
);

assert.equal(lines.length, 2);
assert.equal(lines[0]!.billing, "MONTHLY");
assert.equal(lines[1]!.billing, "COMPLEMENTAIRE");
assert.equal(lines[0]!.unitPrice, 200_000);
assert.equal((lines[0]!.snapshotJson as { unitPrice: number }).unitPrice, 200_000);
assert.equal(lines[0]!.nextBillAt?.toISOString(), start.toISOString());

assert.equal(nextContractReference(1, new Date(2026, 10, 4)), "CTR-202611-0001");

console.log("contract-from-quote.test.ts OK");
