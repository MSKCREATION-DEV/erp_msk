import assert from "node:assert/strict";
import {
  accrualForMonth,
  canEnjoyLeave,
  DEFAULT_LEAVE_POLICY,
  monthWorkedFraction,
  monthsOfService,
  seniorityBonusDays,
  sumMovements,
} from "./leave-policy";

const hire = new Date(Date.UTC(2026, 0, 16)); // 16 jan 2026

assert.equal(monthWorkedFraction(hire, 2025, 12), 0);
assert.ok(Math.abs(monthWorkedFraction(hire, 2026, 1) - 16 / 31) < 0.001);
assert.equal(monthWorkedFraction(hire, 2026, 2), 1);

assert.equal(accrualForMonth(hire, 2026, 1), Math.round(2.5 * (16 / 31) * 100) / 100);
assert.equal(accrualForMonth(hire, 2026, 2), 2.5);
assert.equal(accrualForMonth(hire, 2026, 2, DEFAULT_LEAVE_POLICY, false), 0);

assert.equal(monthsOfService(hire, new Date(Date.UTC(2027, 0, 16))), 12);
assert.equal(canEnjoyLeave(hire, new Date(Date.UTC(2026, 6, 1))), false);
assert.equal(canEnjoyLeave(hire, new Date(Date.UTC(2027, 0, 16))), true);

assert.equal(seniorityBonusDays(14 * 12), 0);
assert.equal(seniorityBonusDays(15 * 12), 2);
assert.equal(seniorityBonusDays(20 * 12), 4);
assert.equal(seniorityBonusDays(25 * 12), 6);

assert.equal(sumMovements([{ days: 2.5 }, { days: -1 }, { days: "0.5" }]), 2);

console.log("leave-policy.test.ts OK");
