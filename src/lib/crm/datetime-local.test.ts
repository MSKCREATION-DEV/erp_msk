import assert from "node:assert/strict";
import { parseDatetimeLocal } from "./datetime-local";

const d = parseDatetimeLocal("2026-10-27T14:30");
assert.ok(d);
assert.equal(d!.getFullYear(), 2026);
assert.equal(d!.getMonth(), 9);
assert.equal(d!.getDate(), 27);
assert.equal(d!.getHours(), 14);
assert.equal(d!.getMinutes(), 30);

const withSec = parseDatetimeLocal("2026-01-02T09:05:07");
assert.ok(withSec);
assert.equal(withSec!.getSeconds(), 7);

assert.equal(parseDatetimeLocal(""), null);
assert.equal(parseDatetimeLocal("pas-une-date"), null);

console.log("datetime-local: ok");
