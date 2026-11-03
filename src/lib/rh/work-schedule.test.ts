import assert from "node:assert/strict";
import {
  compareWeekHours,
  dailyTheoreticalMinutes,
  FALLBACK_WORK_SCHEDULE,
  isoWeekdayUtc,
  parseTimeToMinutes,
  sumTheoreticalWeek,
  theoreticalMinutesForDate,
} from "./work-schedule";

assert.equal(parseTimeToMinutes("08:00"), 480);
assert.equal(parseTimeToMinutes("17:00"), 1020);
assert.equal(dailyTheoreticalMinutes(FALLBACK_WORK_SCHEDULE), 480); // 40h / 5

const mon = new Date(Date.UTC(2026, 10, 2)); // lundi 2 nov 2026
assert.equal(isoWeekdayUtc(mon), 1);
assert.equal(theoreticalMinutesForDate(mon, FALLBACK_WORK_SCHEDULE), 480);

const sun = new Date(Date.UTC(2026, 10, 8));
assert.equal(theoreticalMinutesForDate(sun, FALLBACK_WORK_SCHEDULE), 0);

const holiday = new Set(["2026-11-02"]);
assert.equal(
  theoreticalMinutesForDate(mon, FALLBACK_WORK_SCHEDULE, holiday),
  0,
);

assert.equal(sumTheoreticalWeek(mon, FALLBACK_WORK_SCHEDULE), 2400); // 5×480

const declared = new Map([["2026-11-02", 420]]);
const cmp = compareWeekHours(
  [mon],
  FALLBACK_WORK_SCHEDULE,
  declared,
);
assert.equal(cmp[0]?.declaredMinutes, 420);
assert.equal(cmp[0]?.deltaMinutes, -60);

console.log("work-schedule.test.ts OK");
