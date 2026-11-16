import assert from "node:assert/strict";
import {
  normalizeSocialUrl,
  sanitizeUrl,
  SOCIAL_NETWORKS,
} from "./social";

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

// Handles → URLs
assert.deepEqual(normalizeSocialUrl("instagram", "@resto"), {
  ok: true,
  url: "https://instagram.com/resto",
});
assert.deepEqual(normalizeSocialUrl("instagram", "resto"), {
  ok: true,
  url: "https://instagram.com/resto",
});
assert.deepEqual(normalizeSocialUrl("tiktok", "msk_crea"), {
  ok: true,
  url: "https://tiktok.com/@msk_crea",
});
assert.deepEqual(normalizeSocialUrl("linkedin", "msk-creation"), {
  ok: true,
  url: "https://linkedin.com/company/msk-creation",
});
assert.deepEqual(normalizeSocialUrl("linkedin", "in/amadou"), {
  ok: true,
  url: "https://linkedin.com/in/amadou",
});
assert.deepEqual(normalizeSocialUrl("facebook", "RestoLaTerrasse"), {
  ok: true,
  url: "https://facebook.com/RestoLaTerrasse",
});
assert.deepEqual(normalizeSocialUrl("whatsapp", "+221 70 12 34 56"), {
  ok: true,
  url: "https://wa.me/22170123456",
});

// URLs valides
assert.equal(
  normalizeSocialUrl("instagram", "https://www.instagram.com/resto/").ok,
  true,
);
assert.equal(
  normalizeSocialUrl("whatsapp", "https://wa.me/22170123456").ok,
  true,
);

// Domaine incorrect
assert.equal(
  normalizeSocialUrl("instagram", "https://facebook.com/resto").ok,
  false,
);
assert.equal(
  normalizeSocialUrl("linkedin", "https://twitter.com/msk").ok,
  false,
);

// Vide
assert.deepEqual(normalizeSocialUrl("instagram", "  "), {
  ok: true,
  url: null,
});

console.log("social.test.ts OK");
