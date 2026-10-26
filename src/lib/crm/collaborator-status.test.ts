import assert from "node:assert/strict";
import {
  canHaveOperationalGoals,
  canReceiveCrmAssignment,
  collaboratorStatusLabel,
  formatCollaboratorOptionLabel,
  isHistoricalCrmStatus,
  isOperationalCrmStatus,
} from "./collaborator-status";

assert.equal(isOperationalCrmStatus("ACTIVE"), true);
assert.equal(isOperationalCrmStatus("MUST_CHANGE_PASSWORD"), true);
assert.equal(isOperationalCrmStatus("SUSPENDED"), false);
assert.equal(isOperationalCrmStatus("ARCHIVED"), false);
assert.equal(isOperationalCrmStatus("INVITE_PENDING"), false);

assert.equal(canReceiveCrmAssignment("ACTIVE"), true);
assert.equal(canReceiveCrmAssignment("ARCHIVED"), false);
assert.equal(canHaveOperationalGoals("MUST_CHANGE_PASSWORD"), true);
assert.equal(canHaveOperationalGoals("SUSPENDED"), false);

assert.equal(isHistoricalCrmStatus("SUSPENDED"), true);
assert.equal(isHistoricalCrmStatus("ARCHIVED"), true);
assert.equal(isHistoricalCrmStatus("ACTIVE"), false);

assert.equal(collaboratorStatusLabel("ARCHIVED"), "Archivé");
assert.equal(
  formatCollaboratorOptionLabel("Madina", "Tall", "ARCHIVED"),
  "Madina Tall (Archivé)",
);
assert.equal(
  formatCollaboratorOptionLabel("Yaye", "Bah", "ACTIVE"),
  "Yaye Bah",
);

console.log("collaborator-status.test.ts: ok");
