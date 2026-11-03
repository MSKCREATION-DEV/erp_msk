import assert from "node:assert/strict";
import {
  formatLeaveDays,
  formatSeniority,
  greetingFor,
  monthLabelFr,
} from "./overview";

assert.equal(greetingFor(new Date("2026-06-01T08:00:00")), "Bonjour");
assert.equal(greetingFor(new Date("2026-06-01T14:00:00")), "Bon après-midi");
assert.equal(greetingFor(new Date("2026-06-01T20:00:00")), "Bonsoir");

assert.equal(formatLeaveDays(10), "10 j");
assert.equal(formatLeaveDays(2.5), "2.5 j");
assert.equal(formatLeaveDays(7.25), "7.3 j");

const hire = new Date("2024-01-15");
const now = new Date("2026-03-20");
const seniority = formatSeniority(hire, now);
assert.ok(seniority);
assert.match(seniority!, /2 ans/);
assert.equal(formatSeniority(null, now), null);
assert.equal(formatSeniority(new Date("2027-01-01"), now), null);

assert.match(monthLabelFr(1, 2026), /janvier/i);
assert.match(monthLabelFr(10, 2026), /octobre/i);

console.log("espace/overview.test.ts OK");
