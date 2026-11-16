import assert from "node:assert/strict";
import {
  isSvPaymentModeOther,
  resolveSvPaymentMethod,
  SV_PAYMENT_MODES,
} from "./payment-modes";
import {
  formatSvCashMovementReference,
  nextSvCashMovementReferenceFromExisting,
  svCashMovementReferencePrefix,
} from "./cash-reference";

assert.ok(SV_PAYMENT_MODES.includes("Autre"));
assert.equal(isSvPaymentModeOther("Autre"), true);
assert.equal(isSvPaymentModeOther("Espèces"), false);
assert.equal(resolveSvPaymentMethod("Wave"), "Wave");
assert.equal(resolveSvPaymentMethod("Autre", " Western Union "), "Western Union");
assert.equal(resolveSvPaymentMethod("Autre", "  "), "");

const day = new Date("2026-11-16T10:00:00.000Z");
assert.equal(svCashMovementReferencePrefix(day), "MV-20261116-");
assert.equal(formatSvCashMovementReference(day, 7), "MV-20261116-007");
assert.equal(
  nextSvCashMovementReferenceFromExisting(
    ["MV-20261116-001", "MV-20261115-099", "MV-20261116-012"],
    day,
  ),
  "MV-20261116-013",
);
assert.equal(nextSvCashMovementReferenceFromExisting([], day), "MV-20261116-001");

console.log("✓ payment-modes.test.ts");
