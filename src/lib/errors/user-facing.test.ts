import assert from "node:assert/strict";
import {
  isTechnicalErrorMessage,
  toUserFacingError,
} from "./user-facing";

const pool = toUserFacingError(
  new Error(
    "Invalid `prisma.user.count()` invocation:\nError in connector: FATAL: (EMAXCONNSESSION) max clients reached",
  ),
);
assert.equal(pool.kind, "transient");
assert.equal(/prisma/i.test(pool.description), false);
assert.equal(/EMAXCONN/i.test(pool.description), false);

const métier = toUserFacingError(
  new Error("Ce dossier système ne peut pas être supprimé"),
);
assert.equal(
  métier.description,
  "Ce dossier système ne peut pas être supprimé",
);

assert.equal(isTechnicalErrorMessage("Invalid `prisma.user.count()`"), true);
assert.equal(isTechnicalErrorMessage("Dossier créé"), false);

const removeChild = toUserFacingError(
  new Error(
    "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.",
  ),
);
assert.equal(removeChild.kind, "transient");
assert.equal(/removeChild/i.test(removeChild.description), false);

console.log("user-facing.test.ts OK");
