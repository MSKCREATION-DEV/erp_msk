import assert from "node:assert/strict";
import { blocksToText, textToBlocks } from "./dsl";

function main() {
  const source = [
    "# Attestation de présence",
    "",
    "MSK CREATION atteste que {{collaborateur.prenom}} {{collaborateur.nom}} est présent(e).",
    "",
    "> Document à conserver sans altération.",
    "> Valable six mois à compter de la date d’émission.",
    "",
    "---",
    "",
    "[[SIGNATURE: Signature du collaborateur | Pour MSK CREATION]]",
  ].join("\n");

  const blocks = textToBlocks(source);

  assert.deepEqual(blocks[0], {
    kind: "heading",
    text: "Attestation de présence",
  });
  assert.equal(blocks[1].kind, "paragraph");
  assert.ok((blocks[1] as { text: string }).text.includes("{{collaborateur.prenom}}"));
  assert.equal(blocks[2].kind, "highlight");
  assert.ok(
    (blocks[2] as { text: string }).text.includes("Document à conserver"),
    "lignes `>` consécutives fusionnées en un seul bloc highlight",
  );
  assert.ok(
    (blocks[2] as { text: string }).text.includes("Valable six mois"),
  );
  assert.equal(blocks[3].kind, "spacer");
  assert.deepEqual(blocks[4], {
    kind: "signature",
    leftLabel: "Signature du collaborateur",
    rightLabel: "Pour MSK CREATION",
  });

  // Lignes vides / blocs vides ignorés
  assert.deepEqual(textToBlocks("\n\n   \n\n"), []);

  // Round-trip texte → blocs → texte → blocs (stable)
  const text2 = blocksToText(blocks);
  const blocks2 = textToBlocks(text2);
  assert.deepEqual(blocks2, blocks, "round-trip texte ↔ blocs stable");

  console.log("✓ studio/dsl.test.ts — parsing DSL + round-trip OK");
}

main();
