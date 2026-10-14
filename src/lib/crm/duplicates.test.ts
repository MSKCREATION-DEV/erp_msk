import assert from "node:assert/strict";
import {
  diceCoefficient,
  scoreOrgNames,
  FUZZY_THRESHOLD,
} from "./duplicates";
import { normalizeChannelValue, phoneDigits } from "./channels";

assert.equal(diceCoefficient("msk", "msk"), 1);
assert.ok(diceCoefficient("boulangerie diallo", "boulangerie dialo") >= FUZZY_THRESHOLD);
assert.ok(diceCoefficient("msk creation", "xyz trading") < FUZZY_THRESHOLD);

assert.equal(scoreOrgNames("MSK Creation", "MSK Création").kind, "exact");
assert.equal(scoreOrgNames("Boulangerie Diallo", "Boulangerie Dialo").kind, "fuzzy");
assert.equal(scoreOrgNames("Alpha", "Omega").kind, null);

assert.equal(normalizeChannelValue("EMAIL", " A@B.COM "), "a@b.com");
assert.equal(phoneDigits("+221 77 000 00 00"), "221770000000");
assert.equal(normalizeChannelValue("PHONE", "+221 77 000"), "+22177000");

console.log("duplicates.test.ts OK");
