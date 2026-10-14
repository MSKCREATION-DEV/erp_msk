import assert from "node:assert/strict";
import {
  OPEN_PIPELINE_STAGES,
  STAGE_HINTS,
  STAGE_LABELS,
  STAGE_ORDER,
} from "./labels";

assert.equal(STAGE_LABELS.QUALIFICATION, "En discussion");
assert.equal(STAGE_LABELS.GAGNE, "Client");
assert.equal(STAGE_LABELS.NEGOCIATION, "Devis envoyé");
assert.equal(STAGE_LABELS.DEVIS_ENVOYE, "Devis envoyé");
assert.equal(STAGE_LABELS.NOUVEAU, "À contacter");

assert.ok(STAGE_HINTS.QUALIFICATION?.includes("Échange"));
assert.ok(!STAGE_ORDER.includes("NEGOCIATION"));
assert.equal(STAGE_ORDER.length, 7);
assert.ok(OPEN_PIPELINE_STAGES.includes("NEGOCIATION"));
assert.ok(!OPEN_PIPELINE_STAGES.includes("GAGNE"));
assert.ok(!OPEN_PIPELINE_STAGES.includes("PERDU"));

console.log("labels.test.ts OK");
