/**
 * Parse une valeur `datetime-local` (`YYYY-MM-DDTHH:mm` ou avec secondes)
 * en Date locale — évite l’ambiguïté UTC de `new Date(isoSansZ)`.
 */
export function parseDatetimeLocal(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (!m) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    m[6] ? Number(m[6]) : 0,
    0,
  );
  return Number.isNaN(d.getTime()) ? null : d;
}
