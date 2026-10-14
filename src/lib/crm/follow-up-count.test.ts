import assert from "node:assert/strict";
import {
  formatRelanceCount,
  OUTREACH_ACTIVITY_TYPES,
  RELANCE_GUIDE_THRESHOLD,
} from "./follow-up-count";
import { MIN_ACTIVITIES_BEFORE_LOST } from "./guide-rules";

assert.equal(RELANCE_GUIDE_THRESHOLD, MIN_ACTIVITIES_BEFORE_LOST);
assert.equal(RELANCE_GUIDE_THRESHOLD, 3);
assert.ok(OUTREACH_ACTIVITY_TYPES.includes("APPEL"));
assert.ok(OUTREACH_ACTIVITY_TYPES.includes("WHATSAPP"));
assert.ok(!OUTREACH_ACTIVITY_TYPES.includes("NOTE"));
assert.equal(formatRelanceCount(0), "0×");
assert.equal(formatRelanceCount(3), "3×");

console.log("follow-up-count.test.ts OK");
