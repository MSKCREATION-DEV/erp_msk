import assert from "node:assert/strict";
import {
  parseWeekParam,
  weekEndFriday,
  weekStartIso,
  weekStartMonday,
} from "./week";

const wednesday = new Date(Date.UTC(2026, 9, 14)); // mer. 14 oct 2026
const monday = weekStartMonday(wednesday);
assert.equal(monday.getUTCDay(), 1);
assert.equal(weekStartIso(monday), "2026-10-12");

const friday = weekEndFriday(monday);
assert.equal(friday.getUTCDay(), 5);

assert.equal(weekStartIso(parseWeekParam("2026-10-12")), "2026-10-12");
assert.equal(weekStartIso(parseWeekParam("not-a-date")), weekStartIso(weekStartMonday()));
assert.equal(weekStartIso(parseWeekParam("2026-10-14")), "2026-10-12");

console.log("week.test.ts OK");
