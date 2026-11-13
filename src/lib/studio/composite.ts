/**
 * Blocs composites Studio — sections dont le rendu fidèle reste porté par
 * les générateurs historiques (tableaux Devis/Facture, contrat commercial
 * multipages, bulletin de paie). Le DSL contient le texte éditable + un
 * marqueur `[[COMPOSITE:…]]` traçable ; pas d’invention de clauses.
 */
import type { TemplateBlock } from "@/lib/studio/types";

export const COMPOSITE_RENDERERS = [
  "commercial_devis",
  "commercial_facture",
  "commercial_contract",
  "rh_contract_travail",
  "rh_contract_stage",
  "rh_contract_presta",
  "rh_payslip",
] as const;

export type CompositeRenderer = (typeof COMPOSITE_RENDERERS)[number];

export function isCompositeRenderer(value: string): value is CompositeRenderer {
  return (COMPOSITE_RENDERERS as readonly string[]).includes(value);
}

export function findCompositeRenderer(
  blocks: TemplateBlock[],
): CompositeRenderer | null {
  for (const block of blocks) {
    if (block.kind === "composite" && isCompositeRenderer(block.renderer)) {
      return block.renderer;
    }
  }
  return null;
}
