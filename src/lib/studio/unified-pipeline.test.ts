/**
 * Gate pipeline unifié : PDF officiel = DSL + régions (pas de court-circuit).
 * npx tsx src/lib/studio/unified-pipeline.test.ts
 */
import assert from "node:assert/strict";
import { textToBlocks } from "./dsl";
import { renderBlocksToPdf } from "./render-blocks";
import { renderBlocksToHtml } from "./render-blocks-html";
import { sampleOfficialPayloadForTemplate } from "./sample-official-payload";
import { contextFromOfficialPayload } from "./payload-context";
import { dslBodyForLegacyCode } from "./template-dsl-bodies";
import type { DocumentTemplate } from "@/generated/prisma/client";

function fakeTemplate(
  type: DocumentTemplate["type"],
  code: string,
): DocumentTemplate {
  return {
    id: "t",
    code,
    name: code,
    type,
    generatorKind: "ENGINE_BLOCKS",
    active: true,
    signatureEnabled: false,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedVersionId: null,
    draftVersionId: null,
  } as DocumentTemplate;
}

const PRIORITY: Array<{
  code: string;
  type: DocumentTemplate["type"];
  mustInclude: string[];
  compositeHint: string;
}> = [
  {
    code: "devis_standard",
    type: "DEVIS",
    mustInclude: ["Émetteur", "Client", "Prestations", "Conditions"],
    compositeHint: "commercial_devis",
  },
  {
    code: "facture_standard",
    type: "FACTURE",
    mustInclude: ["Émetteur", "Client", "Lignes", "Modalités"],
    compositeHint: "commercial_facture",
  },
  {
    code: "contrat_commercial_msk",
    type: "CONTRAT_COMMERCIAL",
    mustInclude: ["Article 1", "Article 13", "Entre les soussignés"],
    compositeHint: "commercial_contract",
  },
  {
    code: "contrat_presta_msk",
    type: "CONTRAT_PRESTA",
    mustInclude: ["Article 1", "Article 10", "Prestataire"],
    compositeHint: "rh_contract_presta",
  },
  {
    code: "fiche_paie_msk",
    type: "FICHE_PAIE",
    mustInclude: ["Identification", "Rémunération", "Cotisations"],
    compositeHint: "rh_payslip",
  },
];

const DSL_ONLY = [
  "contrat_travail_msk",
  "contrat_stage_msk",
  "attestation_stage_msk",
  "reglement_interieur_msk",
  "solde_tout_compte_msk",
];

async function main() {
  for (const spec of PRIORITY) {
    const body = dslBodyForLegacyCode(spec.code);
    assert.ok(body, `DSL manquant : ${spec.code}`);
    for (const needle of spec.mustInclude) {
      assert.ok(
        body!.includes(needle),
        `${spec.code} DSL sans « ${needle} »`,
      );
    }
    assert.ok(
      body!.includes(`[[COMPOSITE: ${spec.compositeHint}]]`),
      `${spec.code} sans marqueur ${spec.compositeHint}`,
    );

    const blocks = textToBlocks(body!);
    const payload = sampleOfficialPayloadForTemplate(
      fakeTemplate(spec.type, spec.code),
    );
    const context = contextFromOfficialPayload(payload);

    const pdf = await renderBlocksToPdf(blocks, {
      title: spec.code,
      context,
      strictVariables: false,
      signatureEnabled: false,
      compositePayload: payload,
    });
    assert.ok(pdf.byteLength > 800, `${spec.code} PDF trop petit`);
    // PDF header
    assert.equal(
      String.fromCharCode(...pdf.slice(0, 4)),
      "%PDF",
      `${spec.code} pas un PDF`,
    );

    const html = renderBlocksToHtml(blocks, {
      title: spec.code,
      context,
      signatureEnabled: false,
      compositePayload: payload,
    });
    assert.match(html, /msk-composite/);
    assert.match(html, new RegExp(spec.compositeHint));
    // Région peuplée (pas seulement le placeholder générique)
    assert.ok(
      html.includes("msk-sample-table") &&
        !html.includes("Ligne d'exemple 1"),
      `${spec.code} HTML région non peuplée`,
    );

    console.log("OK ", spec.code, `pdf=${pdf.byteLength}b html=${html.length}c`);
  }

  for (const code of DSL_ONLY) {
    const body = dslBodyForLegacyCode(code);
    assert.ok(body, code);
    assert.ok(!/\[\[COMPOSITE:/.test(body!), `${code} ne doit pas être composite`);
    const blocks = textToBlocks(body!);
    const pdf = await renderBlocksToPdf(blocks, {
      title: code,
      context: { document: { date: "17/11/2026" }, entreprise: { nom: "MSK" } },
      strictVariables: false,
      signatureEnabled: false,
    });
    assert.ok(pdf.byteLength > 500, code);
    console.log("OK ", code, "(dsl-only)", `pdf=${pdf.byteLength}b`);
  }

  console.log("✓ studio/unified-pipeline.test.ts — pipeline unifié OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
