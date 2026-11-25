import assert from "node:assert/strict";
import { isRemoveChildDomError } from "./dom-safe";

assert.equal(
  isRemoveChildDomError(
    new DOMException(
      "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.",
      "NotFoundError",
    ),
  ),
  true,
);

assert.equal(
  isRemoveChildDomError(
    new Error("Failed to execute 'removeChild' on 'Node'"),
  ),
  true,
);

assert.equal(isRemoveChildDomError(new Error("Validation failed")), false);
assert.equal(isRemoveChildDomError(null), false);

console.log("dom-safe.test.ts OK");
