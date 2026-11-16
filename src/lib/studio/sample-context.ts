/**
 * Studio documentaire — contexte de données d’exemple pour l’aperçu réel
 * (bouton « Générer un aperçu » / démo). Jamais une image statique : on
 * appelle le même moteur de rendu que la génération officielle, avec
 * `strictVariables: false` et des valeurs d’exemple crédibles.
 */
import "server-only";

import { prisma } from "@/lib/prisma";
import { applyVariableOverrides } from "@/lib/studio/variables";

/**
 * Construit un contexte `{{slug}}` → valeur d’exemple à partir du catalogue
 * central `TemplateVariableDef` (sampleValue déclaré par l’admin). Les slugs
 * sans sample connu ne sont pas injectés — le moteur affichera le repère
 * visible `⟪slug manquant⟫` (pas de vide silencieux, même en aperçu).
 *
 * `overrides` (Playground) : map slug → valeur saisie ; écrase le sample
 * catalogue (y compris chaîne vide explicite).
 */
export async function buildSampleContextForSlugs(
  slugs: string[],
  overrides?: Record<string, string>,
): Promise<Record<string, unknown>> {
  if (slugs.length === 0 && (!overrides || Object.keys(overrides).length === 0)) {
    return {};
  }
  const uniqueSlugs = [...new Set([...slugs, ...Object.keys(overrides ?? {})])];
  const defs = await prisma.templateVariableDef.findMany({
    where: { slug: { in: uniqueSlugs } },
    select: { slug: true, sampleValue: true },
  });
  let context: Record<string, unknown> = {};
  const samples: Record<string, string> = {};
  for (const d of defs) {
    if (d.sampleValue) samples[d.slug] = d.sampleValue;
  }
  context = applyVariableOverrides(context, samples);
  if (overrides) {
    context = applyVariableOverrides(context, overrides);
  }
  return context;
}
