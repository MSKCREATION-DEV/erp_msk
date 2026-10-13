/** Normalise un searchParam Next (string | string[]). */
export function firstParam(
  v: string | string[] | undefined,
): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
