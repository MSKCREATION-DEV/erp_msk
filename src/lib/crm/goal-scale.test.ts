import assert from "node:assert/strict";
import {
  periodModeToGrain,
  periodStartForGrain,
  scaleGoalTarget,
  toPeriodStartDate,
} from "./goal-scale";

assert.equal(scaleGoalTarget(22, "MONTH", "DAY"), 1);
assert.equal(scaleGoalTarget(22, "MONTH", "WEEK"), 5);
assert.equal(scaleGoalTarget(5, "WEEK", "DAY"), 1);
assert.equal(scaleGoalTarget(5, "WEEK", "MONTH"), 22);
assert.equal(scaleGoalTarget(1, "DAY", "WEEK"), 5);
assert.equal(scaleGoalTarget(1, "DAY", "MONTH"), 22);
assert.equal(scaleGoalTarget(10, "WEEK", "WEEK"), 10);
assert.equal(scaleGoalTarget(-3, "WEEK", "DAY"), 0);

assert.equal(periodModeToGrain("jour"), "DAY");
assert.equal(periodModeToGrain("semaine"), "WEEK");
assert.equal(periodModeToGrain("mois"), "MONTH");
assert.equal(periodModeToGrain("plage"), null);

{
  const period = {
    mode: "mois",
    from: new Date(Date.UTC(2026, 9, 1)),
    semaine: "2026-09-28",
    mois: "2026-10",
    on: "2026-10-01",
  };
  assert.equal(
    periodStartForGrain("MONTH", period).toISOString().slice(0, 10),
    "2026-10-01",
  );
  assert.equal(
    periodStartForGrain("WEEK", period).toISOString().slice(0, 10),
    "2026-09-28",
  );
  assert.equal(
    periodStartForGrain("DAY", { ...period, on: "2026-10-15" })
      .toISOString()
      .slice(0, 10),
    "2026-10-15",
  );
}

assert.equal(
  toPeriodStartDate("MONTH", "2026-10").toISOString().slice(0, 10),
  "2026-10-01",
);
assert.equal(
  toPeriodStartDate("WEEK", "2026-10-15").toISOString().slice(0, 10),
  "2026-10-12",
);

console.log("goal-scale.test.ts OK");
