/** Format montants FCFA (entiers). */
export function formatXof(amount: number): string {
  const n = Math.round(amount);
  return `${n.toLocaleString("fr-FR")} F CFA`;
}

export function parseAmountInput(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}
