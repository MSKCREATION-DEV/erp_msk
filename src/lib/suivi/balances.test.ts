import assert from "node:assert/strict";
import {
  clientBalance,
  deriveInvoiceStatus,
  invoiceReste,
} from "./balances";

const base = {
  dueAt: null as Date | null,
  issuedAt: null as Date | null,
};

assert.deepEqual(
  clientBalance([
    { ...base, totalTtc: 1000, amountPaid: 400, status: "PARTIELLE" },
    { ...base, totalTtc: 500, amountPaid: 500, status: "PAYEE" },
    { ...base, totalTtc: 200, amountPaid: 0, status: "ANNULEE" },
  ]),
  { totale: 1500, paye: 900, restant: 600, aVenir: 0 },
);

assert.equal(invoiceReste({ totalTtc: 100, amountPaid: 40 }), 60);
assert.equal(deriveInvoiceStatus(100, 0, "EMISE"), "EMISE");
assert.equal(deriveInvoiceStatus(100, 40, "EMISE"), "PARTIELLE");
assert.equal(deriveInvoiceStatus(100, 100, "EMISE"), "PAYEE");
assert.equal(deriveInvoiceStatus(100, 50, "ANNULEE"), "ANNULEE");

console.log("ok suivi balances");
