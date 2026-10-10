import assert from "node:assert/strict";
import { flatNavItems, isNavActive, NAV_GROUPS } from "./nav";

const all = flatNavItems();
const live = all.filter((i) => !i.soon);

const accueil = live.find((i) => i.id === "accueil")!;
const users = live.find((i) => i.id === "utilisateurs")!;
const crm = live.find((i) => i.id === "crm")!;
const catalogue = live.find((i) => i.id === "catalogue")!;
const commercial = live.find((i) => i.id === "commercial")!;
const maSig = live.find((i) => i.id === "ma-signature")!;

assert.equal(isNavActive("/accueil", accueil, live), true);
assert.equal(isNavActive("/accueil", users, live), false);

assert.equal(isNavActive("/administration/utilisateurs", users, live), true);
assert.equal(
  isNavActive("/administration/utilisateurs/uuid", users, live),
  true,
);

assert.ok(crm, "CRM live (plus soon)");
assert.equal(isNavActive("/crm", crm, live), true);
assert.equal(isNavActive("/crm/prospects", crm, live), true);
assert.ok(catalogue, "Catalogue live");
assert.equal(isNavActive("/catalogue", catalogue, live), true);
assert.ok(commercial, "Commercial live (plus soon)");
assert.equal(isNavActive("/commercial", commercial, live), true);
assert.equal(isNavActive("/commercial/devis", commercial, live), true);
assert.equal(
  all.some((i) => i.id === "commercial" && i.soon),
  false,
  "Commercial plus dans À venir",
);

assert.equal(isNavActive("/profil/signature", maSig, live), true);

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
