import assert from "node:assert/strict";
import { usersWithPermissionWhere } from "./notify";

const where = usersWithPermissionWhere("perm_cuid_crm_reassign");

assert.equal(where.archivedAt, null);
assert.deepEqual(where.status, {
  in: ["ACTIVE", "MUST_CHANGE_PASSWORD", "INVITE_PENDING"],
});

const not = where.NOT as { overrides: { some: { permissionId: string; effect: string } } };
assert.equal(not.overrides.some.permissionId, "perm_cuid_crm_reassign");
assert.equal(not.overrides.some.effect, "DENY");

const or = where.OR as Array<Record<string, unknown>>;
assert.ok(or.some((c) => c.isSuperAdmin === true), "inclut Super Admin");

const viaDirectPack = or.find((c) => "userPacks" in c);
assert.ok(viaDirectPack, "inclut packs directs");
assert.deepEqual(viaDirectPack, {
  userPacks: {
    some: {
      pack: {
        permissions: { some: { permissionId: "perm_cuid_crm_reassign" } },
      },
    },
  },
});

const viaGroup = or.find((c) => "groupMembers" in c);
assert.ok(viaGroup, "inclut packs défaut de groupe (Direction)");
assert.deepEqual(viaGroup, {
  groupMembers: {
    some: {
      group: {
        defaultPack: {
          permissions: { some: { permissionId: "perm_cuid_crm_reassign" } },
        },
      },
    },
  },
});

const viaGrant = or.find((c) => "overrides" in c);
assert.ok(viaGrant, "inclut GRANT override");
assert.deepEqual(viaGrant, {
  overrides: {
    some: { permissionId: "perm_cuid_crm_reassign", effect: "GRANT" },
  },
});

// Régression : ne jamais matcher sur le code métier « crm.reassign »
// (permissionId est un cuid, pas le code).
const packFilter = (
  viaDirectPack as {
    userPacks: { some: { pack: { permissions: { some: { permissionId: string } } } } };
  }
).userPacks.some.pack.permissions.some.permissionId;
assert.notEqual(packFilter, "crm.reassign");
assert.equal(packFilter, "perm_cuid_crm_reassign");

console.log("notify.test.ts OK");
