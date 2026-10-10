import assert from "node:assert/strict";
import {
  filterVisibleFolders,
  hasFullGedBrowse,
  ownCollabPathPrefix,
} from "./scope";
import type { SessionUser } from "@/lib/rbac/resolve";

function user(
  partial: Partial<SessionUser> & { permissions: string[] },
): SessionUser {
  return {
    id: partial.id ?? "00000000-0000-4000-8000-000000000001",
    email: partial.email ?? "t@mskcreation.net",
    firstName: partial.firstName ?? "Yaye",
    lastName: partial.lastName ?? "Bah",
    status: partial.status ?? ("ACTIVE" as SessionUser["status"]),
    isSuperAdmin: partial.isSuperAdmin ?? false,
    mustChangePassword: false,
    permissions: new Set(partial.permissions),
    groupCodes: partial.groupCodes ?? [],
    packCodes: partial.packCodes ?? [],
    directPackCodes: partial.directPackCodes ?? [],
    groupPackCodes: partial.groupPackCodes ?? [],
  };
}

async function main() {
  const commercial = user({
    permissions: ["ged.view_scoped", "ged.upload", "com.access"],
  });
  const admin = user({
    isSuperAdmin: true,
    permissions: [],
  });
  const browse = user({
    permissions: ["ged.browse", "ged.view_scoped"],
  });

  assert.equal(hasFullGedBrowse(commercial), false);
  assert.equal(hasFullGedBrowse(admin), true);
  assert.equal(hasFullGedBrowse(browse), true);

  assert.equal(
    ownCollabPathPrefix(commercial, 2026),
    "/2026/05_COLLABORATEURS/BAH_YAYE",
  );

  const yearKids = [
    {
      code: "01_COMPTABILITE_ANNUELLE",
      path: "/2026/01_COMPTABILITE_ANNUELLE",
    },
    { code: "03_CLIENTS", path: "/2026/03_CLIENTS" },
    { code: "04_MODELES", path: "/2026/04_MODELES" },
    { code: "05_COLLABORATEURS", path: "/2026/05_COLLABORATEURS" },
  ];

  const scopedYear = await filterVisibleFolders(commercial, "/2026", yearKids);
  assert.deepEqual(
    scopedYear.map((f) => f.code).sort(),
    ["03_CLIENTS", "05_COLLABORATEURS"],
  );

  const fullYear = await filterVisibleFolders(admin, "/2026", yearKids);
  assert.equal(fullYear.length, 4);

  const collabKids = [
    { code: "BAH_YAYE", path: "/2026/05_COLLABORATEURS/BAH_YAYE" },
    { code: "GUIRO_AMADOU", path: "/2026/05_COLLABORATEURS/GUIRO_AMADOU" },
  ];
  const scopedCollab = await filterVisibleFolders(
    commercial,
    "/2026/05_COLLABORATEURS",
    collabKids,
  );
  assert.deepEqual(
    scopedCollab.map((f) => f.code),
    ["BAH_YAYE"],
  );

  console.log("ged/scope.test.ts OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
