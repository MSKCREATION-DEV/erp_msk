import assert from "node:assert/strict";
import { isOperationalCrmStatus } from "./team";

assert.equal(isOperationalCrmStatus("ACTIVE"), true);
assert.equal(isOperationalCrmStatus("MUST_CHANGE_PASSWORD"), true);
assert.equal(isOperationalCrmStatus("SUSPENDED"), false);
assert.equal(isOperationalCrmStatus("ARCHIVED"), false);
assert.equal(isOperationalCrmStatus("INVITE_PENDING"), false);

console.log("team-status.test.ts: ok");
