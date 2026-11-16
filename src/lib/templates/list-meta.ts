import { parseBlocks, parseDeclaredVariables } from "@/lib/studio/types";
import { templateSlots } from "@/lib/templates/labels";

export type TemplateListMeta = {
  /** Variables `{{slug}}` ou slots legacy. */
  fieldsCount: number;
  /** Blocs de contenu (ENGINE_BLOCKS) — 0 si legacy slots-only. */
  blocksCount: number;
  /** Toujours PDF pour l’ERP MSK (pas de DOCX upload). */
  format: "PDF";
  fieldsLabel: "Variables" | "Slots";
};

/**
 * Métadonnées scannables pour le listing Studio (inspiration Documentero
 * FIELDS / SECTIONS — adapté MSK : variables/slots + blocs).
 */
export function computeTemplateListMeta(input: {
  generatorKind: "LEGACY_CODE" | "ENGINE_BLOCKS";
  structureJson: unknown;
  publishedVersion?: {
    bodyJson: unknown;
    variablesJson: unknown;
  } | null;
}): TemplateListMeta {
  if (input.generatorKind === "ENGINE_BLOCKS" && input.publishedVersion) {
    const fields = parseDeclaredVariables(input.publishedVersion.variablesJson);
    const blocks = parseBlocks(input.publishedVersion.bodyJson);
    return {
      fieldsCount: fields.length,
      blocksCount: blocks.length,
      format: "PDF",
      fieldsLabel: "Variables",
    };
  }

  const slots = templateSlots(input.structureJson);
  return {
    fieldsCount: slots.length,
    blocksCount: 0,
    format: "PDF",
    fieldsLabel: "Slots",
  };
}
