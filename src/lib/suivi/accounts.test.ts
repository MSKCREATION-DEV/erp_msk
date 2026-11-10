import assert from "node:assert/strict";
import {
  accountBalanceFromMoves,
  inferAccountKindFromPaymentMethod,
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

assert.equal(inferAccountKindFromPaymentMethod("Espèces"), "PHYSICAL");
assert.equal(inferAccountKindFromPaymentMethod(null), "PHYSICAL");
assert.equal(inferAccountKindFromPaymentMethod("Virement"), "BANK");
assert.equal(inferAccountKindFromPaymentMethod("Chèque 117"), "BANK");

console.log("ok suivi accounts");
