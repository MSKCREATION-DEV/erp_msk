import { assertMoneyInt, type MoneyInt } from "./money";
import { computeVat, type VatBreakdown } from "./tax";

export type BillableLine = {
  qty: number;
  unitPrice: MoneyInt;
  /** Ligne frais déplacement — exclue si includeTravel=false */
  isTravel?: boolean;
};

export type LineTotalsInput = {
  lines: BillableLine[];
  vatEnabled: boolean;
  vatRate: number;
  promoEnabled?: boolean;
  promoPercent?: number | null;
  includeTravel?: boolean;
};

export type LineTotalsResult = VatBreakdown & {
  /** HT avant promo */
  grossHt: MoneyInt;
  promoAmount: MoneyInt;
};

export function computeLineTotals(input: LineTotalsInput): LineTotalsResult {
  const includeTravel = input.includeTravel ?? true;
  const eligible = input.lines.filter((l) => includeTravel || !l.isTravel);

  let grossHt = 0;
  for (const l of eligible) {
    const qty = Math.max(0, Math.trunc(l.qty));
    const unit = assertMoneyInt(Math.trunc(l.unitPrice), "unitPrice");
    grossHt += qty * unit;
  }

  let ht = grossHt;
  let promoAmount = 0;
  if (input.promoEnabled && input.promoPercent && input.promoPercent > 0) {
    const pct = Math.min(100, Math.max(0, Math.trunc(input.promoPercent)));
    const after = Math.round((grossHt * (100 - pct)) / 100);
    promoAmount = grossHt - after;
    ht = after;
  }

  const vat = computeVat({
    ht,
    vatEnabled: input.vatEnabled,
    vatRate: input.vatRate,
  });

  return { ...vat, grossHt, promoAmount };
}
