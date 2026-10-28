import assert from "node:assert/strict";
import {
  LOSS_LABELS,
  OPEN_PIPELINE_STAGES,
  SOURCE_LABELS,
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
assert.ok(!STAGE_HINTS.QUALIFICATION?.toLowerCase().includes("timing"));
assert.ok(!STAGE_ORDER.includes("NEGOCIATION"));
assert.equal(STAGE_ORDER.length, 7);
assert.ok(OPEN_PIPELINE_STAGES.includes("NEGOCIATION"));
assert.ok(!OPEN_PIPELINE_STAGES.includes("GAGNE"));
assert.ok(!OPEN_PIPELINE_STAGES.includes("PERDU"));

assert.equal(LOSS_LABELS.TIMING, "Pas le bon moment");
assert.equal(LOSS_LABELS.NO_SHOW, "Absent au rendez-vous");
assert.ok(!Object.values(LOSS_LABELS).some((l) => /timing|no-show/i.test(l)));
assert.equal(SOURCE_LABELS.EMAIL, "E-mail");

console.log("labels.test.ts OK");
