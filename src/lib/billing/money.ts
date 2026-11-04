/** Montants monétaires ERP MSK — entiers (XOF ou unités EUR). */

export type MoneyInt = number;

export function assertMoneyInt(value: number, label = "amount"): MoneyInt {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(`${label} must be a finite integer (got ${value})`);
  }
  return value;
}

export function moneySum(values: readonly MoneyInt[]): MoneyInt {
  let total = 0;
  for (const v of values) {
    total += assertMoneyInt(v);
  }
  return total;
}

/** Arrondi standard (half-up) vers entier monétaire. */
export function roundMoney(value: number): MoneyInt {
  if (!Number.isFinite(value)) {
    throw new Error(`roundMoney: non-finite ${value}`);
  }
  return Math.round(value);
}
