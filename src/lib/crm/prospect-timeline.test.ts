import assert from "node:assert/strict";
import {
  buildProspectTimeline,
  timelineKindLabel,
} from "./prospect-timeline";

const deal = {
  id: "d1",
  createdAt: new Date("2026-01-01T10:00:00Z"),
  createdBy: { firstName: "Ada", lastName: "Lovelace" },
};

const entries = buildProspectTimeline({
  deal,
  activities: [
    {
      id: "a1",
      type: "APPEL",
      summary: "Appel découverte",
      body: null,
      occurredAt: new Date("2026-01-02T10:00:00Z"),
      actor: { firstName: "Ada", lastName: "Lovelace" },
    },
    {
      id: "a2",
      type: "NOTE",
      summary: "Relance annulée",
      body: "Erreur de saisie",
      occurredAt: new Date("2026-01-03T10:00:00Z"),
      actor: { firstName: "Ada", lastName: "Lovelace" },
    },
    {
      id: "a3",
      type: "RDV",
      summary: "RDV tenu",
      body: null,
      occurredAt: new Date("2026-01-04T10:00:00Z"),
      actor: { firstName: "Ada", lastName: "Lovelace" },
    },
  ],
});

assert.equal(entries.length, 4); // + synthetic création
assert.equal(entries[0]?.kind, "rdv");
assert.equal(entries[1]?.kind, "system");
assert.equal(entries[2]?.kind, "outreach");
assert.equal(entries[3]?.kind, "creation");
assert.equal(timelineKindLabel("system"), "Système");

const withCreate = buildProspectTimeline({
  deal,
  activities: [
    {
      id: "c1",
      type: "NOTE",
      summary: "Prospect créé",
      body: null,
      occurredAt: deal.createdAt,
      actor: deal.createdBy,
    },
  ],
});
assert.equal(withCreate.length, 1);

console.log("prospect-timeline.test.ts OK");
