import assert from "node:assert/strict";
import {
  extractVariableSlugs,
  MissingVariableError,
  resolveTemplateString,
} from "./variables";

function main() {
  // Extraction
  assert.deepEqual(
    extractVariableSlugs("Bonjour {{collaborateur.prenom}} {{collaborateur.nom}} !"),
    ["collaborateur.prenom", "collaborateur.nom"],
  );
  assert.deepEqual(extractVariableSlugs("Aucune variable ici."), []);
  assert.deepEqual(
    extractVariableSlugs("{{a}} {{a}} {{b}}"),
    ["a", "b"],
    "dédupliqué, ordre d’apparition",
  );

  // Résolution stricte — OK si tout présent
  const ok = resolveTemplateString(
    "Je soussigné {{collaborateur.prenom}} {{collaborateur.nom}}",
    { collaborateur: { prenom: "Awa", nom: "Traoré" } },
    { strict: true },
  );
  assert.equal(ok, "Je soussigné Awa Traoré");

  // Résolution stricte — erreur explicite si obligatoire manquant (règle absolue)
  assert.throws(
    () =>
      resolveTemplateString(
        "Bonjour {{collaborateur.prenom}}",
        {},
        { strict: true },
      ),
    MissingVariableError,
  );

  // Résolution non stricte (aperçu) — jamais de vide silencieux, repère visible
  const preview = resolveTemplateString(
    "Bonjour {{collaborateur.prenom}}",
    {},
    { strict: false },
  );
  assert.ok(
    preview.includes("manquant"),
    "aperçu doit afficher un repère visible, jamais une chaîne vide",
  );
  assert.ok(!preview.includes("{{"), "le slug brut ne doit pas fuiter en aperçu");

  // Variable inconnue déclarée dans context mais slug différent — toujours strict
  assert.throws(() =>
    resolveTemplateString("{{document.numero}}", { document: {} }, { strict: true }),
  );

  console.log("✓ studio/variables.test.ts — extraction + résolution stricte/aperçu OK");
}

main();
