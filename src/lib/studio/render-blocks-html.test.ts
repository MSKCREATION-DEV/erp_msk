import assert from "node:assert/strict";
import { textToBlocks } from "./dsl";
import { renderBlocksToHtml } from "./render-blocks-html";

function main() {
  const body = [
    "# Attestation",
    "",
    "Bonjour {{collaborateur.prenom}} {{collaborateur.nom}}.",
    "",
    "> Encadré test",
    "",
    "[[COMPOSITE: commercial_devis]]",
    "",
    "[[SIGNATURE: Gauche | Droite]]",
  ].join("\n");

  const html = renderBlocksToHtml(textToBlocks(body), {
    title: "Titre test",
    context: {
      collaborateur: { prenom: "Awa", nom: "Traoré" },
    },
    signatureEnabled: true,
    logoAlign: "left",
  });

  assert.match(html, /msk-doc-sheet/);
  assert.match(html, /Titre test/);
  assert.match(html, /Awa Traoré/);
  assert.match(html, /Encadré test/);
  assert.match(html, /commercial_devis/);
  assert.match(html, /msk-sample-table/);
  assert.match(html, /Gauche/);
  assert.match(html, /NIF/);

  const noSig = renderBlocksToHtml(textToBlocks("[[SIGNATURE: A | B]]"), {
    title: "X",
    context: {},
    signatureEnabled: false,
  });
  assert.match(noSig, /Signature désactivée/);

  console.log("✓ studio/render-blocks-html.test.ts — preview HTML OK");
}

main();
