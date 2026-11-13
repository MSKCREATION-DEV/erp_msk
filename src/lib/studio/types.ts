/**
 * Studio documentaire — types des blocs de contenu d’un gabarit `ENGINE_BLOCKS`.
 * Un bloc = une intention de mise en page (titre / paragraphe / mise en
 * évidence / espace / bloc signature). Le texte des blocs peut contenir des
 * variables `{{slug}}` (voir `src/lib/studio/variables.ts`).
 */
import { z } from "zod";

export const BlockSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("heading"), text: z.string().min(1) }),
  z.object({ kind: z.literal("paragraph"), text: z.string().min(1) }),
  z.object({ kind: z.literal("highlight"), text: z.string().min(1) }),
  z.object({ kind: z.literal("spacer") }),
  z.object({
    kind: z.literal("signature"),
    leftLabel: z.string().min(1),
    rightLabel: z.string().min(1),
  }),
]);

export type TemplateBlock = z.infer<typeof BlockSchema>;

export const BlocksSchema = z.array(BlockSchema);

/** Catalogue des slugs déclarés par une version de gabarit. */
export const DeclaredVariableSchema = z.object({
  slug: z.string().regex(/^[a-z0-9_.]+$/i, "slug invalide"),
  required: z.boolean().default(true),
});
export type DeclaredVariable = z.infer<typeof DeclaredVariableSchema>;
export const DeclaredVariablesSchema = z.array(DeclaredVariableSchema);

export function parseBlocks(raw: unknown): TemplateBlock[] {
  const parsed = BlocksSchema.safeParse(raw);
  return parsed.success ? parsed.data : [];
}

export function parseDeclaredVariables(raw: unknown): DeclaredVariable[] {
  const parsed = DeclaredVariablesSchema.safeParse(raw);
  return parsed.success ? parsed.data : [];
}
