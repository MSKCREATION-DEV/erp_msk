import assert from "node:assert/strict";
import { buildInvoiceVeLines } from "./invoice-ve-lines";

const ml = buildInvoiceVeLines({
  clientName: "Acme",
  regime: "ML",
  ht: 100_000,
  vat: 18_000,
  ttc: 118_000,
});
assert.equal(ml[0]?.accountCode, "4111");
assert.equal(ml[0]?.debit, 118_000);
assert.equal(ml[1]?.accountCode, "706");
assert.equal(ml[1]?.credit, 100_000);
assert.equal(ml[2]?.accountCode, "4432");
assert.equal(ml[2]?.credit, 18_000);

const fr = buildInvoiceVeLines({
  clientName: "SARL FR",
  regime: "FR",
  ht: 1000,
  vat: 200,
  ttc: 1200,
});
assert.equal(fr[0]?.accountCode, "4112");

const noVat = buildInvoiceVeLines({
  clientName: "Exonéré",
  regime: "ML",
  ht: 50_000,
  vat: 0,
  ttc: 50_000,
});
assert.equal(noVat.length, 2);

console.log("invoice-ve-lines.test OK");
