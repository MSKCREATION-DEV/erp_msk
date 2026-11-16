import assert from "node:assert/strict";
import { MSK_TEAM, ORG_LEVEL_KEYS, mskEmail } from "@/lib/org/team";
import { coalescePhotoSrc } from "@/lib/rh/avatar-display";

function byKey(key: string) {
  const m = MSK_TEAM.find((x) => x.key === key);
  assert.ok(m, `membre ${key}`);
  return m!;
}

console.log("→ org/team hierarchy");

assert.equal(MSK_TEAM.length, 10);
assert.ok(!MSK_TEAM.some((m) => m.key === "issiaka" || m.key === "madina"));
assert.ok(MSK_TEAM.some((m) => m.key === "eric"));

assert.deepEqual(
  ORG_LEVEL_KEYS.map((row) => [...row]),
  [
    ["mathieu", "isdalinia"],
    ["andile", "ismael"],
    ["guiro"],
    ["espoir"],
    ["yaye", "fatimatou", "djoulede", "eric"],
  ],
);

assert.equal(byKey("espoir").parentKey, "guiro");
assert.equal(byKey("espoir").level, 3);
for (const key of ["yaye", "fatimatou", "djoulede", "eric"] as const) {
  assert.equal(byKey(key).parentKey, "espoir");
  assert.equal(byKey(key).level, 4);
}

assert.equal(byKey("eric").email, "e.golo@mskcreation.net");
assert.equal(byKey("eric").photoPath, "/team/eric-wilfried-golo.jpg");
assert.equal(mskEmail("Eric Wilfried Golo"), "e.golo@mskcreation.net");
assert.equal(mskEmail("Espoir Lidaou Awesso"), "e.awesso@mskcreation.net");

const keys = new Set(MSK_TEAM.map((m) => m.key));
for (const row of ORG_LEVEL_KEYS) {
  for (const k of row) assert.ok(keys.has(k), `ORG_LEVEL_KEYS → ${k}`);
}
for (const m of MSK_TEAM) {
  if (m.parentKey) assert.ok(keys.has(m.parentKey), `parent ${m.parentKey}`);
}

console.log("→ rh/avatar-display coalesce");
assert.equal(
  coalescePhotoSrc("https://signed/x", "/team/a.jpg"),
  "https://signed/x",
);
assert.equal(coalescePhotoSrc(null, "/team/a.jpg"), "/team/a.jpg");
assert.equal(coalescePhotoSrc(undefined, null), null);

console.log("✓ org/team + avatar-display");
