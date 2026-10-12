import assert from "node:assert/strict";
import { flatNavItems, isNavActive, NAV_GROUPS } from "./nav";

const all = flatNavItems();
const live = all.filter((i) => !i.soon);

const accueil = live.find((i) => i.id === "accueil")!;
const users = live.find((i) => i.id === "utilisateurs")!;
const commercial = live.find((i) => i.id === "commercial")!;
const maSig = live.find((i) => i.id === "ma-signature")!;

assert.equal(isNavActive("/accueil", accueil, live), true);
assert.equal(isNavActive("/accueil", users, live), false);

assert.equal(isNavActive("/administration/utilisateurs", users, live), true);
assert.equal(
  isNavActive("/administration/utilisateurs/uuid", users, live),
  true,
);

assert.ok(commercial, "Commercial live (entrée unique)");
assert.equal(isNavActive("/commercial", commercial, live), true);
assert.equal(isNavActive("/commercial/devis", commercial, live), true);
assert.equal(isNavActive("/crm", commercial, live), true);
assert.equal(isNavActive("/crm/prospects", commercial, live), true);
assert.equal(isNavActive("/catalogue", commercial, live), true);
assert.equal(
  all.some((i) => i.id === "crm"),
  false,
  "entrée CRM sidebar retirée (fusionnée Commercial)",
);
assert.equal(
  all.some((i) => i.id === "catalogue"),
  false,
  "entrée Catalogue sidebar retirée (fusionnée Commercial)",
);
assert.equal(
  all.some((i) => i.id === "commercial" && i.soon),
  false,
  "Commercial plus dans À venir",
);

const compta = live.find((i) => i.id === "comptabilite")!;
assert.ok(compta, "Comptabilité live (plus soon)");
assert.equal(isNavActive("/comptabilite", compta, live), true);
assert.equal(isNavActive("/comptabilite/ecritures", compta, live), true);
assert.equal(
  all.some((i) => i.id === "comptabilite" && i.soon),
  false,
  "Comptabilité plus dans À venir",
);

const rh = live.find((i) => i.id === "rh")!;
assert.ok(rh, "RH live");
assert.equal(isNavActive("/rh", rh, live), true);
assert.equal(isNavActive("/rh/collaborateurs", rh, live), true);

const monEspace = live.find((i) => i.id === "espace" || i.id === "mon-espace");
assert.ok(monEspace, "Mon espace live");

assert.equal(isNavActive("/profil/signature", maSig, live), true);

assert.equal(
  all.some((i) => i.id === "administration"),
  false,
  "item administration retiré (regroupé)",
);

const stocks = live.find((i) => i.id === "stocks")!;
assert.ok(stocks, "Stocks live");
const projets = live.find((i) => i.id === "projets")!;
assert.ok(projets, "Projets live (plus soon)");
assert.equal(isNavActive("/projets", projets, live), true);
assert.equal(
  all.some((i) => i.id === "projets" && i.soon),
  false,
  "Projets plus dans À venir",
);
assert.ok(live.find((i) => i.id === "patrimoine"), "Patrimoine live");
assert.ok(live.find((i) => i.id === "anomalies"), "Anomalies live");

const soonGroup = NAV_GROUPS.find((g) => g.id === "soon");
assert.ok(
  !soonGroup || soonGroup.collapsible,
  "groupe À venir absent ou collapsible",
);

console.log("nav.test.ts OK");
