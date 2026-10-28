import assert from "node:assert/strict";
import {
  CONTACT_COMMENT_MIN_LEN,
  CONTACT_STAGE_CHANNELS,
  followUpRequiredForStage,
  isEnteringContacte,
  LOSS_NOTE_MIN_LEN,
  MIN_ACTIVITIES_BEFORE_LOST,
  normalizeUiStage,
} from "./guide-rules";

assert.equal(isEnteringContacte("NOUVEAU", "CONTACTE"), true);
assert.equal(isEnteringContacte("CONTACTE", "CONTACTE"), false);
assert.equal(isEnteringContacte("CONTACTE", "QUALIFICATION"), false);
assert.equal(isEnteringContacte("NEGOCIATION", "CONTACTE"), true);

assert.ok(CONTACT_COMMENT_MIN_LEN >= 10);
assert.ok(CONTACT_STAGE_CHANNELS.includes("APPEL"));
assert.ok(CONTACT_STAGE_CHANNELS.includes("WHATSAPP"));
assert.ok(!(CONTACT_STAGE_CHANNELS as readonly string[]).includes("RDV"));

assert.equal(MIN_ACTIVITIES_BEFORE_LOST, 3);
assert.ok(LOSS_NOTE_MIN_LEN >= 10);
assert.equal(normalizeUiStage("NEGOCIATION"), "DEVIS_ENVOYE");
assert.equal(normalizeUiStage("INTERESSE"), "INTERESSE");

assert.equal(followUpRequiredForStage("CONTACTE"), true);
assert.equal(followUpRequiredForStage("QUALIFICATION"), true);
assert.equal(followUpRequiredForStage("NOUVEAU"), false);
assert.equal(followUpRequiredForStage("GAGNE"), false);
assert.equal(followUpRequiredForStage("PERDU"), false);

console.log("guide-rules.test.ts OK");
