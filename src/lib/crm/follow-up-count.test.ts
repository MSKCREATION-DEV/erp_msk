import assert from "node:assert/strict";
import {
  formatRelanceCount,
  idsMeetingMinOutreach,
  isOutreachActivityType,
  OUTREACH_ACTIVITY_TYPES,
  RELANCE_GUIDE_THRESHOLD,
  sumOutreachCounts,
} from "./follow-up-count";
import { MIN_ACTIVITIES_BEFORE_LOST } from "./guide-rules";

assert.equal(RELANCE_GUIDE_THRESHOLD, MIN_ACTIVITIES_BEFORE_LOST);
assert.equal(RELANCE_GUIDE_THRESHOLD, 3);

assert.ok(OUTREACH_ACTIVITY_TYPES.includes("APPEL"));
assert.ok(OUTREACH_ACTIVITY_TYPES.includes("WHATSAPP"));
assert.ok(OUTREACH_ACTIVITY_TYPES.includes("RDV"));
assert.ok(!OUTREACH_ACTIVITY_TYPES.includes("NOTE"));
assert.equal(isOutreachActivityType("APPEL"), true);
assert.equal(isOutreachActivityType("NOTE"), false);

assert.equal(formatRelanceCount(0), "0×");
assert.equal(formatRelanceCount(3), "3×");
assert.equal(formatRelanceCount(-1), "0×");

const counts = new Map([
  ["a", 0],
  ["b", 2],
  ["c", 3],
  ["d", 5],
]);
assert.deepEqual(idsMeetingMinOutreach(counts, 3).sort(), ["c", "d"]);
assert.deepEqual(idsMeetingMinOutreach(counts, 0).sort(), ["a", "b", "c", "d"]);
assert.deepEqual(idsMeetingMinOutreach(new Map(), 3), []);
assert.equal(sumOutreachCounts(counts), 10);

console.log("follow-up-count.test.ts OK");
