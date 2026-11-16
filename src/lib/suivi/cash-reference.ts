/**
 * Références mouvements de trésorerie Suivi — générées serveur (pas de saisie libre).
 * Format clair FR : `MV-AAAAMMJJ-NNN` (ex. MV-20261116-007).
 */

export function formatSvCashMovementReference(
  day: Date,
  seq: number,
): string {
  const y = day.getUTCFullYear();
  const m = String(day.getUTCMonth() + 1).padStart(2, "0");
  const d = String(day.getUTCDate()).padStart(2, "0");
  return `MV-${y}${m}${d}-${String(seq).padStart(3, "0")}`;
}

export function svCashMovementReferencePrefix(day: Date): string {
  const y = day.getUTCFullYear();
  const m = String(day.getUTCMonth() + 1).padStart(2, "0");
  const d = String(day.getUTCDate()).padStart(2, "0");
  return `MV-${y}${m}${d}-`;
}

/** Prochain n° à partir des références du jour (même préfixe). */
export function nextSvCashMovementReferenceFromExisting(
  existingRefs: (string | null | undefined)[],
  day: Date,
): string {
  const prefix = svCashMovementReferencePrefix(day);
  let max = 0;
  for (const r of existingRefs) {
    if (!r?.startsWith(prefix)) continue;
    const tail = r.slice(prefix.length);
    const n = Number(tail);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return formatSvCashMovementReference(day, max + 1);
}
