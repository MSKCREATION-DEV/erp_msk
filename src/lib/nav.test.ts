import assert from "node:assert/strict";
import { flatNavItems, isNavActive, NAV_GROUPS } from "./nav";

const all = flatNavItems();
const live = all.filter((i) => !i.soon);

const accueil = live.find((i) => i.id === "accueil")!;
const users = live.find((i) => i.id === "utilisateurs")!;
const crm = all.find((i) => i.id === "crm")!;
const maSig = live.find((i) => i.id === "ma-signature")!;

assert.equal(isNavActive("/accueil", accueil, live), true);
assert.equal(isNavActive("/accueil", users, live), false);

assert.equal(isNavActive("/administration/utilisateurs", users, live), true);
assert.equal(
  isNavActive("/administration/utilisateurs/uuid", users, live),
  true,
);

assert.equal(isNavActive("/accueil", crm, live), false);
assert.equal(isNavActive("/bientot/crm", crm, all), false);

assert.equal(isNavActive("/profil/signature", maSig, live), true);

// Pas de doublon Administration / Utilisateurs
assert.equal(
  all.some((i) => i.id === "administration"),
  false,
  "item administration retiré (regroupé)",
);

assert.ok(
  NAV_GROUPS.some((g) => g.id === "soon" && g.collapsible),
  "groupe À venir collapsible",
);

console.log("nav.test.ts OK");
