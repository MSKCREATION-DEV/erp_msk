import assert from "node:assert/strict";
import {
  canMutateCrmDeal,
  canReassignCrmDeal,
  crmProspectListScopeWhere,
  crmVisibility,
  dealOwnerScopeWhere,
} from "./scope";
import type { SessionUser } from "@/lib/rbac/resolve";

function fakeUser(opts: {
  id: string;
  permissions: string[];
  isSuperAdmin?: boolean;
}): SessionUser {
  return {
    id: opts.id,
    email: "t@test.msk.local",
    firstName: "Test",
    lastName: "User",
    status: "ACTIVE",
    isSuperAdmin: opts.isSuperAdmin ?? false,
    mustChangePassword: false,
    permissions: new Set(opts.permissions),
    groupCodes: [],
    packCodes: [],
    directPackCodes: [],
    groupPackCodes: [],
  };
}

const commercial = fakeUser({
  id: "yaye",
  permissions: ["crm.access", "crm.prospect.edit_own", "crm.activity.log"],
});
const other = "madina";
const lead = fakeUser({
  id: "lead",
  permissions: [
    "crm.access",
    "crm.view_team",
    "crm.reassign",
    "crm.prospect.edit_own",
  ],
});
const direction = fakeUser({
  id: "dir",
  permissions: ["crm.access", "crm.reports.global", "crm.reassign"],
});

assert.deepEqual(crmProspectListScopeWhere(commercial), {});
assert.equal(crmVisibility(commercial), "own");
/**
 * Yaye / commercial terrain :
 * - liste Prospects = lecture partagée (`{}`)
 * - hub / KPI perso / dashboard = portefeuille `ownerId` seul
 * Un compteur hub à 0 avec une liste non vide n’est PAS une erreur de requête
 * si aucun dossier n’est affecté à l’utilisateur.
 */
assert.deepEqual(dealOwnerScopeWhere(commercial, ["madina", "mathieu"]), {
  ownerId: "yaye",
});
assert.deepEqual(dealOwnerScopeWhere(direction, ["madina"]), {});
assert.deepEqual(dealOwnerScopeWhere(lead, ["madina"]), {
  ownerId: { in: ["lead", "madina"] },
});
assert.equal(canMutateCrmDeal(commercial, "yaye"), true);
assert.equal(canMutateCrmDeal(commercial, other), false);
assert.equal(canMutateCrmDeal(lead, other), true);
assert.equal(canMutateCrmDeal(direction, other), true);
const viewTeamOnly = fakeUser({
  id: "viewer",
  permissions: ["crm.access", "crm.view_team", "crm.prospect.edit_own"],
});
assert.equal(canMutateCrmDeal(viewTeamOnly, other), false);
assert.equal(canReassignCrmDeal(commercial), false);
assert.equal(canReassignCrmDeal(lead), true);
assert.equal(canReassignCrmDeal(direction), true);

console.log("scope.test.ts OK");
