import assert from "node:assert/strict";
import {
  buildEmployeeUpdateFromLines,
  parseProfileFieldValue,
  readEmployeeField,
} from "./profile-apply";

assert.equal(
  readEmployeeField({ city: "Bamako" }, "city"),
  "Bamako",
);
assert.equal(readEmployeeField({ city: null }, "city"), null);
assert.equal(readEmployeeField({ jobTitle: "X" }, "jobTitle"), null);

const d = parseProfileFieldValue("birthDate", "1990-05-01");
assert.equal(d.ok, true);
if (d.ok) assert.ok(d.value instanceof Date);

assert.equal(parseProfileFieldValue("birthDate", "01/05/1990").ok, false);
assert.equal(parseProfileFieldValue("jobTitle", "Dev").ok, false);
assert.equal(parseProfileFieldValue("personalEmail", "bad").ok, false);
assert.equal(parseProfileFieldValue("personalEmail", "a@b.co").ok, true);

const patch = buildEmployeeUpdateFromLines([
  { fieldKey: "city", newValue: "Bamako" },
  { fieldKey: "personalPhone", newValue: "+22370000000" },
]);
assert.equal(patch.ok, true);
if (patch.ok) {
  assert.equal(patch.data.city, "Bamako");
  assert.equal(patch.data.personalPhone, "+22370000000");
}

console.log("profile-apply.test.ts OK");
