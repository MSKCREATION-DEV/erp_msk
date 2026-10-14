import assert from "node:assert/strict";
import { COM_DOCS_GATED, COM_DOCS_GATED_MESSAGE } from "./gates";
import { COMMERCIAL_MODULES } from "./modules";

assert.equal(COM_DOCS_GATED, true, "LOT-A : devis/factures gelés");
assert.ok(COM_DOCS_GATED_MESSAGE.length > 10);

const devis = COMMERCIAL_MODULES.find((m) => m.id === "devis");
const factures = COMMERCIAL_MODULES.find((m) => m.id === "factures");
const clients = COMMERCIAL_MODULES.find((m) => m.id === "clients");

assert.ok(devis?.gated, "module devis gated");
assert.ok(factures?.gated, "module factures gated");
assert.equal(clients?.gated, undefined, "clients reste navigable");

console.log("gates.test.ts OK");
