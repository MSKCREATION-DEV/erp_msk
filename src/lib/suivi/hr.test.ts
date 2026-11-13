import assert from "node:assert/strict";
import {
  absenceDaySpan,
  combineSvDateTime,
  computeMinutesLate,
  parseSvDateOnly,
  statusAfterJustification,
} from "@/lib/suivi/hr";

const d = parseSvDateOnly("2026-11-13");
assert.ok(d);
assert.equal(d.getUTCFullYear(), 2026);
assert.equal(d.getUTCMonth(), 10);
assert.equal(d.getUTCDate(), 13);
assert.equal(parseSvDateOnly("bad"), null);

const expected = combineSvDateTime("2026-11-13", "08:00");
const arrived = combineSvDateTime("2026-11-13", "08:25");
assert.ok(expected && arrived);
assert.equal(computeMinutesLate(expected, arrived), 25);
assert.equal(computeMinutesLate(null, arrived), null);

const a = parseSvDateOnly("2026-11-10")!;
const b = parseSvDateOnly("2026-11-12")!;
assert.equal(absenceDaySpan(a, b), 3);
assert.equal(absenceDaySpan(a, a), 1);

assert.equal(statusAfterJustification("ENREGISTREE", true), "JUSTIFIEE");
assert.equal(statusAfterJustification("NON_JUSTIFIEE", true), "JUSTIFIEE");
assert.equal(statusAfterJustification("ANNULEE", true), "ANNULEE");
assert.equal(statusAfterJustification("ENREGISTREE", false), "ENREGISTREE");

console.log("ok — suivi hr helpers");
