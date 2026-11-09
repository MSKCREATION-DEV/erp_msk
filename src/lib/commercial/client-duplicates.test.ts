import assert from "node:assert/strict";
import { scoreOrgNames } from "@/lib/crm/duplicates";
import { normalizeClientName } from "@/lib/commercial/labels";

/**
 * P1.3 — anti-doublon création client direct.
 * `findClientDuplicateCandidates` fait un accès Prisma ; on teste ici la
 * logique pure de normalisation + scoring qu’elle réutilise (alignée CRM).
 */

// Exact après normalisation (accents / casse / espaces).
assert.equal(
  normalizeClientName("Marinas SARL"),
  normalizeClientName("  MARINAS   sarl "),
);
assert.equal(scoreOrgNames("Marinas SARL", "MARINAS sarl").kind, "exact");

// Fuzzy : faute de frappe proche doit matcher.
assert.equal(
  scoreOrgNames("Boulangerie Diallo", "Boulangerie Dialo").kind,
  "fuzzy",
);

// Noms réellement différents : pas de match.
assert.equal(scoreOrgNames("Marinas SARL", "Koundji Services").kind, null);

// Forme juridique seule ≠ doublon (Alpha SARL / Beta SARL).
assert.equal(scoreOrgNames("Alpha SARL", "Beta SARL").kind, null);

console.log("client-duplicates.test.ts OK");
