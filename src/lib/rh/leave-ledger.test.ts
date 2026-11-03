import assert from "node:assert/strict";
import {
  accrualSourceId,
  LEAVE_MOVEMENT_LABEL,
  previousUtcMonth,
} from "./leave-ledger";

assert.equal(accrualSourceId("emp1", 2026, 3), "emp1:2026-03");
assert.equal(accrualSourceId("emp1", 2026, 11), "emp1:2026-11");

assert.deepEqual(previousUtcMonth(new Date(Date.UTC(2026, 0, 15))), {
  year: 2025,
  month: 12,
});
assert.deepEqual(previousUtcMonth(new Date(Date.UTC(2026, 10, 3))), {
  year: 2026,
  month: 10,
});

assert.equal(LEAVE_MOVEMENT_LABEL.ACCRUAL, "Acquisition mensuelle");
assert.equal(LEAVE_MOVEMENT_LABEL.CONSUMPTION, "Congé consommé");

console.log("leave-ledger.test.ts OK");
