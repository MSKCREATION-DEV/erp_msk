import { assertMoneyInt, roundMoney, type MoneyInt } from "./money";

/** Taux TVA en points entiers (18 = 18 %). Configurable — jamais hardcodé côté UI. */
export const DEFAULT_VAT_RATE_ML = 18;
export const DEFAULT_VAT_RATE_FR = 20;

export type VatInput = {
  ht: MoneyInt;
  /** false = exonération */
  vatEnabled: boolean;
  vatRate: number;
};

export type VatBreakdown = {
  ht: MoneyInt;
  vatRate: number;
  vatAmount: MoneyInt;
  ttc: MoneyInt;
};

export function computeVat(input: VatInput): VatBreakdown {
  const ht = assertMoneyInt(input.ht, "ht");
  const rate =
    input.vatEnabled && input.vatRate > 0
      ? Math.min(100, Math.max(0, Math.trunc(input.vatRate)))
      : 0;
  const vatAmount = rate > 0 ? roundMoney((ht * rate) / 100) : 0;
  return { ht, vatRate: rate, vatAmount, ttc: ht + vatAmount };
}
