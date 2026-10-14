import assert from "node:assert/strict";
import { sanitizeUrl, SOCIAL_NETWORKS } from "./social";

assert.equal(SOCIAL_NETWORKS.length, 5);
assert.ok(SOCIAL_NETWORKS.some((n) => n.key === "instagram"));
assert.ok(SOCIAL_NETWORKS.some((n) => n.field === "whatsappUrl"));

assert.equal(sanitizeUrl(""), null);
assert.equal(sanitizeUrl("   "), null);
assert.equal(sanitizeUrl("instagram.com/msk"), "https://instagram.com/msk");
assert.equal(
  sanitizeUrl("https://linkedin.com/company/msk"),
  "https://linkedin.com/company/msk",
);
assert.equal(
  sanitizeUrl("HTTP://facebook.com/msk"),
  "HTTP://facebook.com/msk",
);

console.log("social.test.ts OK");
