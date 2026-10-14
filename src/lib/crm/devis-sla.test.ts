import assert from "node:assert/strict";
import { interestedSince, isDevisSlaBreached } from "./devis-sla";

const base = new Date("2026-10-10T12:00:00.000Z");
const now = base.getTime() + 25 * 60 * 60 * 1000;

assert.equal(
  isDevisSlaBreached(
    {
      stage: "INTERESSE",
      interestedAt: base,
      updatedAt: base,
      quoteCount: 0,
    },
    now,
  ),
  true,
);

assert.equal(
  isDevisSlaBreached(
    {
      stage: "INTERESSE",
      interestedAt: base,
      updatedAt: base,
      quoteCount: 1,
    },
    now,
  ),
  false,
);

assert.equal(
  isDevisSlaBreached(
    {
      stage: "CONTACTE",
      interestedAt: base,
      updatedAt: base,
      quoteCount: 0,
    },
    now,
  ),
  false,
);

assert.equal(
  isDevisSlaBreached(
    {
      stage: "INTERESSE",
      interestedAt: base,
      updatedAt: base,
      quoteCount: 0,
    },
    base.getTime() + 12 * 60 * 60 * 1000,
  ),
  false,
);

const fallbackUpdated = new Date("2026-10-01T00:00:00.000Z");
assert.equal(
  interestedSince({ interestedAt: null, updatedAt: fallbackUpdated }).getTime(),
  fallbackUpdated.getTime(),
);

console.log("devis-sla.test.ts OK");
