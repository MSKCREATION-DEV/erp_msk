import { prisma } from "@/lib/prisma";
import { scoreOrgNames } from "@/lib/crm/duplicates";
import { normalizeClientName } from "@/lib/commercial/labels";

/** Seuil minimal de caractères utiles pour lancer la recherche (aligné CRM). */
const MIN_CLIENT_SEARCH_CHARS = 3;
/** Scan borné — volumétrie ComClient modeste (PME), coût JS négligeable. */
const CLIENT_CANDIDATE_POOL = 500;

export type ClientDuplicateCandidate = {
  id: string;
  name: string;
  kind: "exact" | "fuzzy";
};

/**
 * P1.3 — anti-doublon création client direct (`/commercial/clients/nouveau`).
 * Politique alignée CRM prospects : toute correspondance (identique ou très
 * proche) bloque la création — pas de soumission silencieuse d’un doublon.
 */
export async function findClientDuplicateCandidates(
  name: string,
): Promise<ClientDuplicateCandidate[]> {
  const normalized = normalizeClientName(name);
  const compact = normalized.replace(/\s+/g, "");
  if (compact.length < MIN_CLIENT_SEARCH_CHARS) return [];

  const prefix = compact.slice(0, Math.min(compact.length, 6));
  let pool = await prisma.comClient.findMany({
    where: { normalizedName: { contains: prefix } },
    select: { id: true, name: true, normalizedName: true },
    take: CLIENT_CANDIDATE_POOL,
  });
  if (pool.length === 0) {
    // Nom très différent des préfixes existants : scan borné pour la fuzzy.
    pool = await prisma.comClient.findMany({
      select: { id: true, name: true, normalizedName: true },
      take: CLIENT_CANDIDATE_POOL,
      orderBy: { createdAt: "desc" },
    });
  }

  const out: ClientDuplicateCandidate[] = [];
  for (const c of pool) {
    const { kind } = scoreOrgNames(name, c.name);
    if (!kind) continue;
    if (kind === "exact") {
      out.unshift({ id: c.id, name: c.name, kind: "exact" });
      continue;
    }
    out.push({ id: c.id, name: c.name, kind: "fuzzy" });
  }
  return out.slice(0, 5);
}

export function hasBlockingClientMatch(
  candidates: ClientDuplicateCandidate[],
): boolean {
  return candidates.length > 0;
}
