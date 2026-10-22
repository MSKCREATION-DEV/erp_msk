import assert from "node:assert/strict";
import {
  ALL_GUIDES,
  assertGuideCatalogIntegrity,
  filterGuides,
  normalizeSearch,
} from "./index";

assertGuideCatalogIntegrity();

assert.ok(ALL_GUIDES.length >= 8, "catalogue initial non vide");

const byId = filterGuides(ALL_GUIDES, { q: "prospect" });
assert.ok(
  byId.some((g) => g.id === "crm-creer-prospect"),
  "recherche prospect trouve création",
);

const accent = normalizeSearch("Dépanner");
assert.equal(accent, "depanner");

const filteredModule = filterGuides(ALL_GUIDES, { moduleId: "commercial" });
assert.ok(filteredModule.every((g) => g.moduleId === "commercial"));
assert.ok(filteredModule.length >= 3);

const faq = filterGuides(ALL_GUIDES, { taskId: "depanner" });
assert.ok(faq.some((g) => g.id === "faq-acces-refuse"));

console.log(`guides.test.ts OK (${ALL_GUIDES.length} guides)`);
