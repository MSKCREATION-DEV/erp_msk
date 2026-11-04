import assert from "node:assert/strict";
import { COM_DOCS_GATED, COM_DOCS_GATED_MESSAGE } from "./gates";
import { COMMERCIAL_MODULES } from "./modules";

assert.equal(COM_DOCS_GATED, false, "COM-FACTU : devis/factures rouverts");
assert.ok(COM_DOCS_GATED_MESSAGE.length > 10);

const devis = COMMERCIAL_MODULES.find((m) => m.href === "/commercial/devis");
const factures = COMMERCIAL_MODULES.find(
  (m) => m.href === "/commercial/factures",
);
assert.ok(devis);
assert.ok(factures);
assert.equal(devis!.gated, false);
assert.equal(factures!.gated, false);

console.log("gates.test.ts OK");
