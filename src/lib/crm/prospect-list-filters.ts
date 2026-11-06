import type { CrmSource } from "@/generated/prisma/client";
import { SOURCE_LABELS } from "@/lib/crm/labels";

const KNOWN_SOURCES = new Set<string>(Object.keys(SOURCE_LABELS));

/**
 * Liste d’origines depuis l’URL : `sources` (CSV) + `source` (mono, rétrocompat / focus).
 * Dédupliqué, ordre stable (CSV d’abord, puis mono si absent).
 */
export function parseProspectFilterSources(
  sp: Record<string, string | undefined>,
): CrmSource[] {
  const fromCsv =
    sp.sources
      ?.split(",")
      .map((s) => s.trim())
      .filter((s): s is CrmSource => Boolean(s) && KNOWN_SOURCES.has(s)) ?? [];
  const mono = sp.source?.trim();
  const monoOk =
    mono && KNOWN_SOURCES.has(mono) ? (mono as CrmSource) : null;
  const out: CrmSource[] = [];
  const seen = new Set<string>();
  for (const s of fromCsv) {
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  if (monoOk && !seen.has(monoOk)) {
    out.push(monoOk);
  }
  return out;
}

/**
 * `owner` (focus) prioritaire sur `owners` (CSV).
 * Retourne `undefined` si aucun filtre propriétaire (hors scope).
 */
export function parseProspectFilterOwnerIds(
  sp: Record<string, string | undefined>,
): string[] | undefined {
  const focus = sp.owner?.trim();
  if (focus) return [focus];
  const raw =
    sp.owners
      ?.split(",")
      .map((o) => o.trim())
      .filter(Boolean) ?? [];
  if (!raw.length) return undefined;
  return [...new Set(raw)];
}
