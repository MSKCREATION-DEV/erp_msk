import assert from "node:assert/strict";
import {
  accountBalanceFromMoves,
  countsTowardBalanceForDate,
  formatSvBaselineDateFr,
  inferAccountKindFromPaymentMethod,
  SV_ACCOUNT_BASELINE_AT,
  SV_ACCOUNT_BASELINE_BALANCES,
  svBaselineReference,
} from "./accounts";

assert.equal(
  accountBalanceFromMoves([
    { direction: "IN", amount: 100_000 },
    { direction: "OUT", amount: 30_000 },
    { direction: "OUT", amount: 10_000 },
  ]),
  60_000,
);

assert.equal(
  accountBalanceFromMoves([{ direction: "OUT", amount: 473_000 }]),
  -473_000,
);

// Archive pre-bascule exclue du solde
assert.equal(
  accountBalanceFromMoves([
    { direction: "OUT", amount: 473_000, countsTowardBalance: false },
    { direction: "IN", amount: 145_000, countsTowardBalance: true },
    { direction: "OUT", amount: 5_000, countsTowardBalance: true },
  ]),
  140_000,
);

assert.equal(
  accountBalanceFromMoves([
    {
      direction: "IN",
      amount: SV_ACCOUNT_BASELINE_BALANCES.PHYSICAL,
      countsTowardBalance: true,
    },
  ]),
  145_000,
);

assert.equal(
  accountBalanceFromMoves([
    {
      direction: "IN",
      amount: SV_ACCOUNT_BASELINE_BALANCES.BANK,
      countsTowardBalance: true,
    },
  ]),
  204_815,
);

assert.equal(formatSvBaselineDateFr(SV_ACCOUNT_BASELINE_AT), "12/11/2026");
assert.equal(svBaselineReference("PHYSICAL"), "sv-baseline:PHYSICAL:2026-11-12");
assert.equal(svBaselineReference("BANK"), "sv-baseline:BANK:2026-11-12");
assert.equal(countsTowardBalanceForDate(SV_ACCOUNT_BASELINE_AT), true);
assert.equal(
  countsTowardBalanceForDate(new Date("2026-11-11T23:59:59.999Z")),
  false,
);
assert.equal(
  countsTowardBalanceForDate(new Date("2026-11-12T08:00:00.000Z")),
  true,
);

assert.equal(inferAccountKindFromPaymentMethod("Espèces"), "PHYSICAL");
assert.equal(inferAccountKindFromPaymentMethod(null), "PHYSICAL");
assert.equal(inferAccountKindFromPaymentMethod("Virement"), "BANK");
assert.equal(inferAccountKindFromPaymentMethod("Chèque 117"), "BANK");

console.log("ok suivi accounts");
