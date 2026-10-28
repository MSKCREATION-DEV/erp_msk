import assert from "node:assert/strict";
import {
  countLinkedEntities,
  linkedEntitiesLabels,
  type ProspectLinkedSummary,
} from "./prospect-linked-entities";

const empty: ProspectLinkedSummary = {
  openTasks: 0,
  scheduledAppointments: 0,
  pendingAssignments: 0,
  quotes: 0,
  invoices: 0,
  offers: 0,
};

assert.equal(countLinkedEntities(empty), 0);
assert.deepEqual(linkedEntitiesLabels(empty), []);

const full: ProspectLinkedSummary = {
  openTasks: 2,
  scheduledAppointments: 1,
  pendingAssignments: 1,
  quotes: 1,
  invoices: 0,
  offers: 3,
};

assert.equal(countLinkedEntities(full), 8);
const labels = linkedEntitiesLabels(full);
assert.ok(labels.some((l) => l.includes("2 relances")));
assert.ok(labels.some((l) => l.includes("RDV")));
assert.ok(labels.some((l) => l.includes("affectation")));
assert.ok(labels.some((l) => l.includes("devis")));
assert.ok(labels.some((l) => l.includes("3 offres")));

console.log("prospect-linked-entities.test.ts OK");
