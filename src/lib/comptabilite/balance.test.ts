import assert from "node:assert/strict";
import { checkEntryBalance } from "./balance";

const ok = checkEntryBalance([
  { accountId: "a", debit: 1000, credit: 0 },
  { accountId: "b", debit: 0, credit: 1000 },
]);
assert.equal(ok.ok, true);
assert.equal(ok.totalDebit, 1000);

const both = checkEntryBalance([
  { accountId: "a", debit: 500, credit: 500 },
  { accountId: "b", debit: 0, credit: 0 },
]);
assert.equal(both.ok, false);

const unbalanced = checkEntryBalance([
  { accountId: "a", debit: 1000, credit: 0 },
  { accountId: "b", debit: 0, credit: 900 },
]);
assert.equal(unbalanced.ok, false);
assert.match(unbalanced.error ?? "", /déséquilibr/i);

const single = checkEntryBalance([{ accountId: "a", debit: 100, credit: 0 }]);
assert.equal(single.ok, false);

console.log("✓ checkEntryBalance");
