import assert from "node:assert/strict";
import {
  CONTACT_COMMENT_MIN_LEN,
  CONTACT_STAGE_CHANNELS,
  isEnteringContacte,
} from "./guide-rules";

assert.equal(isEnteringContacte("NOUVEAU", "CONTACTE"), true);
assert.equal(isEnteringContacte("CONTACTE", "CONTACTE"), false);
assert.equal(isEnteringContacte("CONTACTE", "QUALIFICATION"), false);
assert.equal(isEnteringContacte("NEGOCIATION", "CONTACTE"), true);
assert.ok(CONTACT_COMMENT_MIN_LEN >= 10);
assert.ok(CONTACT_STAGE_CHANNELS.includes("APPEL"));
assert.ok(CONTACT_STAGE_CHANNELS.includes("WHATSAPP"));

console.log("guide-rules.test.ts OK");
