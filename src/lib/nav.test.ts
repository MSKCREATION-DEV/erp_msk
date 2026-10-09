import assert from "node:assert/strict";
import { flatNavItems, isNavActive } from "./nav";

const all = flatNavItems();
const live = all.filter((i) => !i.soon);

const accueil = live.find((i) => i.id === "accueil")!;
const users = live.find((i) => i.id === "utilisateurs")!;
const admin = live.find((i) => i.id === "administration")!;
const crm = all.find((i) => i.id === "crm")!;

assert.equal(isNavActive("/accueil", accueil, live), true);
assert.equal(isNavActive("/accueil", admin, live), false);
assert.equal(isNavActive("/accueil", users, live), false);

assert.equal(isNavActive("/administration/utilisateurs", users, live), true);
assert.equal(
  isNavActive("/administration/utilisateurs", admin, live),
  false,
  "même href → priorité Utilisateurs",
);
assert.equal(
  isNavActive("/administration/utilisateurs/uuid", users, live),
  true,
);

assert.equal(isNavActive("/accueil", crm, live), false);
assert.equal(isNavActive("/bientot/crm", crm, all), false);

console.log("nav.test.ts OK");
