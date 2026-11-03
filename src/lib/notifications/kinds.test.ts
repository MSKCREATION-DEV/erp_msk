import assert from "node:assert/strict";
import {
  isActionableNotificationKind,
  shouldEmailNotificationKind,
} from "./kinds";

assert.equal(isActionableNotificationKind("crm.assignment_request"), true);
assert.equal(isActionableNotificationKind("crm.followup_overdue"), false);
assert.equal(isActionableNotificationKind("rh.profile_change.request"), true);
assert.equal(isActionableNotificationKind("rh.leave.request"), true);
assert.equal(isActionableNotificationKind("rh.leave.approved"), false);
assert.equal(shouldEmailNotificationKind("crm.assigned"), true);
assert.equal(shouldEmailNotificationKind("iam.user_created"), false);
assert.equal(shouldEmailNotificationKind("rh.profile_change.approved"), true);
assert.equal(shouldEmailNotificationKind("rh.leave.rejected"), true);
assert.equal(shouldEmailNotificationKind("rh.timesheet.reviewed"), true);

console.log("kinds.test.ts OK");
