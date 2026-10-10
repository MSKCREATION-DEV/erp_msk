import assert from "node:assert/strict";
import { calculatePayslip } from "./calc";
import { DEFAULT_INPS_RATES } from "./rates";

const r = calculatePayslip({
  baseSalaryXof: 165_000,
  primesXof: 0,
  rates: DEFAULT_INPS_RATES,
});

assert.equal(r.brutXof, 165_000);
assert.ok(r.employeeDeductXof > 0);
assert.ok(r.employerChargesXof > 0);
assert.equal(r.netXof, r.brutXof - r.employeeDeductXof);
assert.ok(r.lines.some((l) => l.code === "AMO_SAL" && l.kind === "RETENUE"));
assert.ok(r.lines.some((l) => l.code === "AT" && l.kind === "CHARGE"));

// Écriture PA équilibrée : brut = net + retenues sal.
assert.equal(r.brutXof, r.netXof + r.employeeDeductXof);

console.log("✓ paie/calc.test.ts", {
  brut: r.brutXof,
  net: r.netXof,
  emp: r.employeeDeductXof,
  patron: r.employerChargesXof,
});
