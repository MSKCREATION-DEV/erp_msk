import assert from "node:assert/strict";
import {
  mirrorPhoneEmail,
  normalizeChannelValue,
  parseChannelsJson,
  phoneDigits,
  validateChannels,
} from "./channels";

assert.equal(normalizeChannelValue("EMAIL", " A@B.COM "), "a@b.com");
assert.equal(phoneDigits("+221 77 000 00 00"), "221770000000");
assert.equal(normalizeChannelValue("PHONE", "+221 77 000"), "+22177000");

assert.equal(
  validateChannels([]),
  "Au moins un moyen de contact est obligatoire.",
);
assert.equal(
  validateChannels([
    { type: "PHONE", value: "770000000", isPrimary: false },
    { type: "EMAIL", value: "a@b.com", isPrimary: false },
  ]),
  "Indiquez exactement un moyen de contact principal.",
);
assert.equal(
  validateChannels([
    { type: "EMAIL", value: "pas-un-mail", isPrimary: true },
  ]),
  "Adresse e-mail invalide.",
);
assert.equal(
  validateChannels([{ type: "PHONE", value: "12", isPrimary: true }]),
  "Numéro trop court.",
);
assert.equal(
  validateChannels([
    { type: "PHONE", value: "770000000", isPrimary: true },
    { type: "EMAIL", value: "a@b.com", isPrimary: false },
  ]),
  null,
);

const mirrored = mirrorPhoneEmail([
  { type: "EMAIL", value: "a@b.com", isPrimary: false },
  { type: "PHONE", value: "770000000", isPrimary: true },
]);
assert.equal(mirrored.phone, "770000000");
assert.equal(mirrored.email, "a@b.com");

assert.equal(parseChannelsJson(""), null);
assert.equal(parseChannelsJson("not-json"), null);
const parsed = parseChannelsJson(
  JSON.stringify([
    { type: "PHONE", value: "770000000", isPrimary: true },
    { type: "EMAIL", value: " ", isPrimary: false },
  ]),
);
assert.equal(parsed?.length, 1);
assert.equal(parsed?.[0]?.type, "PHONE");

console.log("channels.test.ts OK");
