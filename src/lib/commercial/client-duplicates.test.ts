import assert from "node:assert/strict";
import { diceCoefficient, FUZZY_THRESHOLD } from "@/lib/crm/duplicates";
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
assert.ok(
  diceCoefficient(
    normalizeClientName("Marinas SARL"),
    normalizeClientName("MARINAS sarl"),
  ) === 1,
);

// Fuzzy : faute de frappe proche doit dépasser le seuil.
assert.ok(
  diceCoefficient(
    normalizeClientName("Boulangerie Diallo"),
    normalizeClientName("Boulangerie Dialo"),
  ) >= FUZZY_THRESHOLD,
);

// Noms réellement différents : pas de match.
assert.ok(
  diceCoefficient(
    normalizeClientName("Marinas SARL"),
    normalizeClientName("Koundji Services"),
  ) < FUZZY_THRESHOLD,
);

console.log("client-duplicates.test.ts OK");
