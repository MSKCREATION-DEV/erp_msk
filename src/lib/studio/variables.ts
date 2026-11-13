/**
 * Studio documentaire — résolution des variables `{{slug}}`.
 *
 * Règle absolue : un slug déclaré obligatoire et absent du contexte lors
 * d’une génération **officielle** (strict = true) est une erreur métier
 * explicite — jamais un vide silencieux dans un document émis. En mode
 * aperçu (strict = false), le slug manquant est affiché de façon visible
 * (jamais vide non plus) pour ne pas tromper l’auteur du gabarit.
 */

const VARIABLE_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

export class MissingVariableError extends Error {
  readonly slugs: string[];
  constructor(slugs: string[]) {
    super(
      `Variable(s) obligatoire(s) manquante(s) : ${slugs
        .map((s) => `{{${s}}}`)
        .join(", ")}`,
    );
    this.name = "MissingVariableError";
    this.slugs = slugs;
  }
}

export class UnknownVariableError extends Error {
  readonly slugs: string[];
  constructor(slugs: string[]) {
    super(
      `Variable(s) inconnue(s) du catalogue : ${slugs
        .map((s) => `{{${s}}}`)
        .join(", ")}`,
    );
    this.name = "UnknownVariableError";
    this.slugs = slugs;
  }
}

/** Extrait tous les slugs `{{slug}}` d’un texte (dédupliqués, ordre d’apparition). */
export function extractVariableSlugs(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(VARIABLE_RE)) {
    const slug = m[1];
    if (!seen.has(slug)) {
      seen.add(slug);
      out.push(slug);
    }
  }
  return out;
}

/** Lecture d’un chemin pointé (`client.nom`) dans un objet de contexte. */
function readPath(context: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = context;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

/**
 * Remplace les `{{slug}}` d’un texte par leur valeur dans `context`.
 * - `strict: true` (génération officielle) → lève `MissingVariableError` si
 *   un slug est absent du contexte.
 * - `strict: false` (aperçu / playground) → affiche un repère visible
 *   `⟪slug manquant⟫` plutôt qu’une chaîne vide.
 */
export function resolveTemplateString(
  text: string,
  context: Record<string, unknown>,
  opts: { strict: boolean },
): string {
  const missing: string[] = [];
  const out = text.replace(VARIABLE_RE, (_match, slug: string) => {
    const value = readPath(context, slug);
    if (!isPresent(value)) {
      missing.push(slug);
      return opts.strict ? "" : `⟪${slug} manquant⟫`;
    }
    return String(value);
  });
  if (opts.strict && missing.length > 0) {
    throw new MissingVariableError([...new Set(missing)]);
  }
  return out;
}

/** Résout toutes les occurrences `{{slug}}` d’un tableau de textes (blocs). */
export function resolveAllOrThrow(
  texts: string[],
  context: Record<string, unknown>,
): string[] {
  return texts.map((t) => resolveTemplateString(t, context, { strict: true }));
}
