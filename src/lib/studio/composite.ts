/**
 * Blocs composites Studio — **régions** (tableaux / grilles) rendues dans
 * le flux DSL via `drawCompositeRegion` (Option A, ADR pipeline unifié).
 * Le marqueur `[[COMPOSITE:…]]` n’est plus un court-circuit document.
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
