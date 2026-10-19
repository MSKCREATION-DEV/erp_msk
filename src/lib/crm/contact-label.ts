/** Jetons Excel / placeholders sans identité réelle. */
const JUNK_EXACT = new Set([
  "",
  "//",
  "-",
  "—",
  "–",
  ".",
  "/",
  "n/a",
  "na",
  "null",
  "none",
  "inconnu",
  "unknown",
]);

export function isJunkPersonToken(raw: string | null | undefined): boolean {
  if (raw == null) return true;
  const t = raw.trim();
  if (!t) return true;
  if (JUNK_EXACT.has(t.toLowerCase())) return true;
  // "// -", "— /", etc.
  if (/^[\s\-_/|.—–\\]+$/.test(t)) return true;
  if (t.startsWith("//")) return true;
  return false;
}

/**
 * Libellé contact affichable — `null` si aucune identité réelle
 * (à afficher comme « — » côté UI).
 */
export function formatContactLabel(
  firstName?: string | null,
  lastName?: string | null,
): string | null {
  const parts = [firstName, lastName]
    .map((p) => (p ?? "").trim())
    .filter((p) => !isJunkPersonToken(p));
  if (parts.length === 0) return null;
  return parts.join(" ");
}
