import assert from "node:assert/strict";
import {
  hardDeleteInventoryLines,
  hardDeleteInventoryTotal,
  type HardDeleteInventory,
} from "./hard-delete-meta";

const empty: HardDeleteInventory = {
  label: "Test",
  willDeleteOrganization: false,
  counts: {
    activities: 0,
    tasks: 0,
    appointments: 0,
    offers: 0,
    assignmentRequests: 0,
    contacts: 0,
    quotes: 0,
    invoices: 0,
    payments: 0,
    contracts: 0,
    creditNotes: 0,
    clientEvents: 0,
    gedDocuments: 0,
    sourceOpportunity: 0,
  },
};

assert.equal(hardDeleteInventoryTotal(empty), 0);
assert.deepEqual(hardDeleteInventoryLines(empty), []);

const full: HardDeleteInventory = {
  ...empty,
  willDeleteOrganization: true,
  counts: {
    ...empty.counts,
    activities: 2,
    quotes: 1,
    gedDocuments: 3,
    sourceOpportunity: 1,
  },
};

assert.equal(hardDeleteInventoryTotal(full), 2 + 1 + 3 + 1 + 1);
const lines = hardDeleteInventoryLines(full);
assert.ok(lines.some((l) => l.includes("activités")));
assert.ok(lines.some((l) => l.includes("devis")));
assert.ok(lines.some((l) => l.includes("GED")));
assert.ok(lines.some((l) => l.includes("opportunité")));
assert.ok(lines.some((l) => l.includes("entreprise")));

console.log("hard-delete-meta.test.ts OK");
