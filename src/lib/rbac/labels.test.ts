import assert from "node:assert/strict";
import { roleChips } from "./labels";

const chips = roleChips({
  isSuperAdmin: false,
  groupCodes: ["collaborateur", "commerciaux"],
  packCodes: ["collaborateur", "commercial", "admin_crm"],
  directPackCodes: ["admin_crm"],
  groupPackCodes: ["collaborateur", "commercial"],
});

const labels = chips.map((c) => c.label);
assert.ok(labels.includes("Collaborateur"));
assert.ok(labels.includes("Commerciaux"));
assert.ok(labels.includes("Pack Admin CRM"));
assert.equal(
  labels.includes("Pack Commercial"),
  false,
  "pack hérité du groupe ne doit pas être re-affiché",
);

const clean = roleChips({
  isSuperAdmin: false,
  groupCodes: ["commerciaux", "collaborateur"],
  packCodes: ["commercial", "collaborateur"],
  directPackCodes: [],
  groupPackCodes: ["commercial", "collaborateur"],
});
assert.equal(
  clean.some((c) => c.label.startsWith("Pack ")),
  false,
  "sans pack direct → pas de chip Pack",
);

console.log("rbac/labels.test.ts OK");
