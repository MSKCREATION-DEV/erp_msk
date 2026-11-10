import assert from "node:assert/strict";
import {
  clientBalance,
  deriveInvoiceStatus,
  invoiceReste,
} from "./balances";
import {
  SV_SEED_EXPECTED_CLIENT_REMAINING,
  SV_SEED_INVOICES,
} from "./seed-data";

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

// Décision G — cohérence seed paiements / soldes clients
for (const inv of SV_SEED_INVOICES) {
  const sum = inv.payments.reduce((s, p) => s + p.amount, 0);
  assert.equal(
    sum,
    inv.amountPaid,
    `${inv.number}: Σ payments ${sum} ≠ amountPaid ${inv.amountPaid}`,
  );
  assert.equal(
    deriveInvoiceStatus(inv.totalTtc, inv.amountPaid, inv.status),
    inv.status === "ANNULEE" || inv.status === "BROUILLON"
      ? inv.status
      : deriveInvoiceStatus(inv.totalTtc, inv.amountPaid, "EMISE"),
    `${inv.number}: status seed incohérent vs amountPaid`,
  );
}

for (const [clientKey, expected] of Object.entries(
  SV_SEED_EXPECTED_CLIENT_REMAINING,
)) {
  const invoices = SV_SEED_INVOICES.filter((i) => i.clientKey === clientKey).map(
    (i) => ({
      ...base,
      totalTtc: i.totalTtc,
      amountPaid: i.amountPaid,
      status: i.status,
    }),
  );
  const bal = clientBalance(invoices);
  assert.equal(
    bal.restant,
    expected,
    `${clientKey}: restant seed ${bal.restant} ≠ attendu ${expected}`,
  );
}

// Ecosol — raisonnement 155 + 22910263
const ecosol155 = SV_SEED_INVOICES.find((i) => i.number === "FAC-155")!;
const ecosolOct = SV_SEED_INVOICES.find((i) => i.number === "22910263")!;
assert.equal(ecosol155.amountPaid, 306800);
assert.equal(invoiceReste(ecosol155), 0);
assert.equal(ecosolOct.totalTtc, 413600);
assert.equal(ecosolOct.amountPaid, 260000);
assert.equal(invoiceReste(ecosolOct), 153600);
assert.ok(
  ecosol155.payments.some(
    (p) => p.amount === 200000 && p.paidAt === "2026-10-02",
  ),
);
assert.ok(
  ecosol155.payments.some(
    (p) => p.amount === 106800 && p.method === "Report facture",
  ),
);
assert.ok(
  ecosolOct.payments.some(
    (p) => p.amount === 260000 && p.paidAt === "2026-11-04",
  ),
);

console.log("ok suivi balances");
