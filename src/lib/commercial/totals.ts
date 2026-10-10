export type LineInput = {
  qty: number;
  unitPrice: number;
  isTravel?: boolean;
};

export type TotalsInput = {
  lines: LineInput[];
  vatEnabled: boolean;
  vatRate: number;
  promoEnabled: boolean;
  promoPercent?: number | null;
  includeTravel: boolean;
};

export type TotalsResult = {
  totalHt: number;
  totalVat: number;
  totalTtc: number;
};

/** Totaux entiers (XOF ou EUR unités) — arrondi standard. */
export function computeDocTotals(input: TotalsInput): TotalsResult {
  const eligible = input.lines.filter(
    (l) => input.includeTravel || !l.isTravel,
  );
  let totalHt = 0;
  for (const l of eligible) {
    const qty = Math.max(0, Math.trunc(l.qty));
    const unit = Math.trunc(l.unitPrice);
    totalHt += qty * unit;
  }

  if (input.promoEnabled && input.promoPercent && input.promoPercent > 0) {
    const pct = Math.min(100, Math.max(0, Math.trunc(input.promoPercent)));
    totalHt = Math.round((totalHt * (100 - pct)) / 100);
  }

  const rate =
    input.vatEnabled && input.vatRate > 0
      ? Math.min(100, Math.max(0, Math.trunc(input.vatRate)))
      : 0;
  const totalVat = rate > 0 ? Math.round((totalHt * rate) / 100) : 0;
  return { totalHt, totalVat, totalTtc: totalHt + totalVat };
}
