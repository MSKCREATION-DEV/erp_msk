import assert from "node:assert/strict";
import { UserStatus } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/rbac/session-user";
import {
  canSvCountry,
  listSvCountriesForUser,
  parseSvCountryParam,
  SV_COUNTRY_DEFAULT,
  SV_COUNTRY_FROM_URL,
  SV_COUNTRY_ISO,
  SV_COUNTRY_LABEL_FR,
  SV_COUNTRY_PERMISSION,
  SV_COUNTRY_TO_URL,
  svCountryDisplayLabel,
  svCountryPermission,
  withSvCountryQuery,
} from "./country";
import { SV_PERMISSIONS, SV_TOGO_OPS_PERMISSIONS } from "@/lib/rbac/catalog";

function user(perms: string[], isSuperAdmin = false): SessionUser {
  return {
    id: "u1",
    email: "t@test.local",
    firstName: "T",
    lastName: "Est",
    status: UserStatus.ACTIVE,
    isSuperAdmin,
    mustChangePassword: false,
    permissions: new Set(perms),
    groupCodes: [],
    packCodes: [],
    directPackCodes: [],
    groupPackCodes: [],
  };
}

assert.equal(parseSvCountryParam(undefined), null);
assert.equal(parseSvCountryParam(null), null);
assert.equal(parseSvCountryParam(""), null);
assert.equal(parseSvCountryParam("xx"), null);
assert.equal(parseSvCountryParam("ml"), "MALI");
assert.equal(parseSvCountryParam("tg"), "TOGO");
assert.equal(parseSvCountryParam("ML"), "MALI");
assert.equal(parseSvCountryParam("TG"), "TOGO");
assert.equal(parseSvCountryParam("mali"), "MALI");
assert.equal(parseSvCountryParam("togo"), "TOGO");
assert.equal(parseSvCountryParam("MALI"), "MALI");
assert.equal(parseSvCountryParam("TOGO"), "TOGO");
assert.equal(parseSvCountryParam(["tg", "ml"]), "TOGO");

assert.equal(SV_COUNTRY_FROM_URL.ml, "MALI");
assert.equal(SV_COUNTRY_FROM_URL.tg, "TOGO");
assert.equal(SV_COUNTRY_TO_URL.MALI, "ml");
assert.equal(SV_COUNTRY_TO_URL.TOGO, "tg");
assert.equal(SV_COUNTRY_LABEL_FR.MALI, "Mali");
assert.equal(SV_COUNTRY_LABEL_FR.TOGO, "Togo");
assert.equal(SV_COUNTRY_ISO.MALI, "ML");
assert.equal(SV_COUNTRY_ISO.TOGO, "TG");
assert.equal(SV_COUNTRY_DEFAULT, "MALI");
assert.equal(svCountryPermission("MALI"), "sv.country.mali");
assert.equal(svCountryPermission("TOGO"), "sv.country.togo");
assert.equal(SV_COUNTRY_PERMISSION.MALI, "sv.country.mali");
assert.equal(svCountryDisplayLabel("MALI"), "Mali (ML)");
assert.equal(svCountryDisplayLabel("TOGO"), "Togo (TG)");
assert.equal(withSvCountryQuery("/suivi/comptes", "MALI"), "/suivi/comptes?pays=ml");
assert.equal(withSvCountryQuery("/suivi/stocks", "TOGO"), "/suivi/stocks?pays=tg");
assert.equal(
  withSvCountryQuery("/suivi/mouvements", "TOGO", { q: "x", page: "2" }),
  "/suivi/mouvements?pays=tg&q=x&page=2",
);
assert.equal(
  withSvCountryQuery("/suivi/stocks?itemId=abc", "MALI"),
  "/suivi/stocks?itemId=abc&pays=ml",
);

const none = user([]);
assert.equal(canSvCountry(none, "MALI"), false);
assert.equal(canSvCountry(none, "TOGO"), false);
assert.deepEqual(listSvCountriesForUser(none), []);

const maliOnly = user(["sv.country.mali"]);
assert.equal(canSvCountry(maliOnly, "MALI"), true);
assert.equal(canSvCountry(maliOnly, "TOGO"), false);
assert.deepEqual(listSvCountriesForUser(maliOnly), ["MALI"]);

const togoOnly = user(["sv.country.togo"]);
assert.equal(canSvCountry(togoOnly, "MALI"), false);
assert.equal(canSvCountry(togoOnly, "TOGO"), true);
assert.deepEqual(listSvCountriesForUser(togoOnly), ["TOGO"]);

const both = user(["sv.country.mali", "sv.country.togo"]);
assert.deepEqual(listSvCountriesForUser(both), ["MALI", "TOGO"]);

const superAdmin = user([], true);
assert.equal(canSvCountry(superAdmin, "MALI"), true);
assert.equal(canSvCountry(superAdmin, "TOGO"), true);
assert.deepEqual(listSvCountriesForUser(superAdmin), ["MALI", "TOGO"]);

// Packs Direction / admin : les deux pays dans SV_PERMISSIONS
assert.ok(SV_PERMISSIONS.includes("sv.country.mali"));
assert.ok(SV_PERMISSIONS.includes("sv.country.togo"));

// Espoir ops : Togo only, pas Mali, pas clients/HR
assert.ok(SV_TOGO_OPS_PERMISSIONS.includes("sv.country.togo"));
assert.ok(!SV_TOGO_OPS_PERMISSIONS.includes("sv.country.mali" as never));
assert.ok(!SV_TOGO_OPS_PERMISSIONS.includes("sv.clients.view" as never));
assert.ok(!SV_TOGO_OPS_PERMISSIONS.includes("sv.hr.view" as never));
assert.ok(SV_TOGO_OPS_PERMISSIONS.includes("sv.access"));
assert.ok(SV_TOGO_OPS_PERMISSIONS.includes("sv.accounts.manage"));

console.log("ok suivi country");
