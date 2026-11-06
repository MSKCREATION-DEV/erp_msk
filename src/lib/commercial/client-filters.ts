import { firstSearchParam, isUuid } from "@/lib/crm/scope-period";

const OWNERS_CSV_MAX = 50;

/**
 * `owners` = UUIDs CSV (Phase 2 plan). Allow-list vs roster CRM autorisé.
 * Priorité **Focus** `owner=` sur la page liste (exclusif) — géré dans la page.
 */
export function parseComClientOwnersCsv(
  sp: Record<string, string | string[] | undefined>,
  allowedOwnerIds: ReadonlySet<string>,
): { ownerIds: string[]; hadInvalidToken: boolean } {
  const raw = firstSearchParam(sp.owners)?.trim();
  if (!raw) return { ownerIds: [], hadInvalidToken: false };

  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, OWNERS_CSV_MAX);

  const out: string[] = [];
  let hadInvalidToken = false;
  for (const p of parts) {
    if (!isUuid(p) || !allowedOwnerIds.has(p)) {
      hadInvalidToken = true;
      continue;
    }
    out.push(p);
  }
  return { ownerIds: [...new Set(out)], hadInvalidToken };
}
