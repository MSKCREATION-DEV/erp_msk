import assert from "node:assert/strict";
import {
  channelMatchKeys,
  contactSeverityForType,
  diceCoefficient,
  FUZZY_THRESHOLD,
  hasBlockingOrgMatch,
  hasIdentityContactMatch,
  MIN_LIVE_SEARCH_CHARS,
  orgLiveSearchReady,
  orgSearchTokens,
  scoreOrgNames,
  usableOrgSearchLength,
  type ContactDuplicateCandidate,
  type OrgDuplicateCandidate,
} from "./duplicates";
import { normalizeOrgName } from "./labels";
import { normalizeChannelValue, phoneDigits } from "./channels";

assert.equal(diceCoefficient("msk", "msk"), 1);
assert.ok(
  diceCoefficient("boulangerie diallo", "boulangerie dialo") >= FUZZY_THRESHOLD,
);
assert.ok(diceCoefficient("msk creation", "xyz trading") < FUZZY_THRESHOLD);

assert.equal(scoreOrgNames("MSK Creation", "MSK Création").kind, "exact");
assert.equal(
  scoreOrgNames("Boulangerie Diallo", "Boulangerie Dialo").kind,
  "fuzzy",
);
assert.equal(scoreOrgNames("Alpha", "Omega").kind, null);
// Préfixe live ≥ 3 car.
assert.equal(scoreOrgNames("smdf", "SMDF sa").kind, "fuzzy");
assert.equal(scoreOrgNames("mar", "Marinas").kind, "fuzzy");
assert.equal(scoreOrgNames("marin", "Marinas").kind, "fuzzy");
assert.equal(scoreOrgNames("marinas", "Marinas").kind, "exact");

// Pool SQL : le norm lui-même doit rester un token « contains » (pas skip égalité seule)
{
  const tokens = orgSearchTokens("marin");
  assert.ok(tokens.includes("marin"));
  // Simulation du préfiltre corrigé : contains(norm) toujours actif
  assert.ok("marinas".includes(normalizeOrgName("marin")));
}

assert.equal(normalizeChannelValue("EMAIL", " A@B.COM "), "a@b.com");
assert.equal(phoneDigits("+221 77 000 00 00"), "221770000000");
assert.equal(normalizeChannelValue("PHONE", "+221 77 000"), "+22177000");

// Live search : 3 caractères exploitables (hors accents / ponctuation)
assert.equal(usableOrgSearchLength("Ab"), 2);
assert.equal(usableOrgSearchLength("  Aï "), 2);
assert.equal(usableOrgSearchLength("MSK"), 3);
assert.equal(orgLiveSearchReady("MS"), false);
assert.equal(orgLiveSearchReady("MSK"), true);
assert.equal(orgLiveSearchReady("Bou"), true);
assert.ok(MIN_LIVE_SEARCH_CHARS === 3);

const tokens = orgSearchTokens("Boulangerie Diallo SARL");
assert.ok(tokens.includes("boulangerie diallo sarl"));
assert.ok(tokens.some((t) => t.includes("boulangerie")));

assert.deepEqual(channelMatchKeys("EMAIL", "  X@Y.COM "), ["x@y.com"]);
assert.deepEqual(channelMatchKeys("PHONE", "12345"), []); // < 6 digits
assert.ok(channelMatchKeys("PHONE", "+221 77 000 00").includes("2217700000"));

assert.equal(contactSeverityForType("PHONE"), "identity");
assert.equal(contactSeverityForType("EMAIL"), "identity");
assert.equal(contactSeverityForType("WHATSAPP"), "identity");
assert.equal(contactSeverityForType("INSTAGRAM"), "channel");

const exactOrg: OrgDuplicateCandidate = {
  kind: "exact",
  entity: "prospect",
  score: 1,
  href: "/crm/prospects/1",
  id: "1",
  opportunityId: "1",
  name: "MSK",
  city: null,
  sector: null,
  stageLabel: null,
  primaryContact: null,
  createdBy: "A",
  owner: "B",
};
assert.equal(hasBlockingOrgMatch([exactOrg]), true);
assert.equal(
  hasBlockingOrgMatch([{ ...exactOrg, kind: "fuzzy", score: 0.7 }]),
  true,
);
assert.equal(hasBlockingOrgMatch([]), false);

const identityHit: ContactDuplicateCandidate = {
  kind: "exact",
  severity: "identity",
  entity: "prospect",
  href: "/x",
  id: "1",
  opportunityId: null,
  orgName: "A",
  contactName: "B",
  matchedVia: "Téléphone · 770000000",
  city: null,
  createdBy: "C",
  owner: "D",
};
assert.equal(hasIdentityContactMatch([identityHit]), true);
assert.equal(
  hasIdentityContactMatch([{ ...identityHit, severity: "channel" }]),
  false,
);

console.log("duplicates.test.ts OK");
