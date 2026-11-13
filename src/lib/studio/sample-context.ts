/**
 * Studio documentaire — contexte de données d’exemple pour l’aperçu réel
 * (bouton « Générer un aperçu » / démo). Jamais une image statique : on
 * appelle le même moteur de rendu que la génération officielle, avec
 * `strictVariables: false` et des valeurs d’exemple crédibles.
 */
import "server-only";

import { prisma } from "@/lib/prisma";

function setPath(target: Record<string, unknown>, path: string, value: string) {
  const parts = path.split(".");
  let cur: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (typeof cur[key] !== "object" || cur[key] === null) {
      cur[key] = {};
    }
    cur = cur[key] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

/**
 * Construit un contexte `{{slug}}` → valeur d’exemple à partir du catalogue
 * central `TemplateVariableDef` (sampleValue déclaré par l’admin). Les slugs
 * sans sample connu ne sont pas injectés — le moteur affichera le repère
 * visible `⟪slug manquant⟫` (pas de vide silencieux, même en aperçu).
 */
export async function buildSampleContextForSlugs(
  slugs: string[],
): Promise<Record<string, unknown>> {
  if (slugs.length === 0) return {};
  const defs = await prisma.templateVariableDef.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, sampleValue: true },
  });
  const context: Record<string, unknown> = {};
  for (const d of defs) {
    if (d.sampleValue) setPath(context, d.slug, d.sampleValue);
  }
  return context;
}
