import assert from "node:assert/strict";
import {
  isActionableNotificationKind,
  shouldEmailNotificationKind,
} from "./kinds";

assert.equal(isActionableNotificationKind("crm.assignment_request"), true);
assert.equal(isActionableNotificationKind("crm.followup_overdue"), false);
assert.equal(shouldEmailNotificationKind("crm.assigned"), true);
assert.equal(shouldEmailNotificationKind("iam.user_created"), false);

console.log("kinds.test.ts OK");
