export type EntryLineInput = {
  accountId: string;
  debit: number;
  credit: number;
  label?: string | null;
};

export type BalanceCheck = {
  ok: boolean;
  totalDebit: number;
  totalCredit: number;
  error?: string;
};

/** Double-entry : chaque ligne débit XOR crédit ; totaux égaux ; ≥ 2 lignes. */
export function checkEntryBalance(lines: EntryLineInput[]): BalanceCheck {
  const usable = lines.filter((l) => l.accountId && (l.debit > 0 || l.credit > 0));
  if (usable.length < 2) {
    return {
      ok: false,
      totalDebit: 0,
      totalCredit: 0,
      error: "Au moins deux lignes avec montant sont requises",
    };
  }

  let totalDebit = 0;
  let totalCredit = 0;
  for (const [i, line] of usable.entries()) {
    if (line.debit < 0 || line.credit < 0) {
      return {
        ok: false,
        totalDebit,
        totalCredit,
        error: `Ligne ${i + 1} : montants négatifs interdits`,
      };
    }
    if (line.debit > 0 && line.credit > 0) {
      return {
        ok: false,
        totalDebit,
        totalCredit,
        error: `Ligne ${i + 1} : débit et crédit exclusifs`,
      };
    }
    if (line.debit === 0 && line.credit === 0) {
      return {
        ok: false,
        totalDebit,
        totalCredit,
        error: `Ligne ${i + 1} : montant manquant`,
      };
    }
    totalDebit += line.debit;
    totalCredit += line.credit;
  }

  if (totalDebit !== totalCredit) {
    return {
      ok: false,
      totalDebit,
      totalCredit,
      error: `Écriture déséquilibrée (D ${totalDebit} ≠ C ${totalCredit})`,
    };
  }

  return { ok: true, totalDebit, totalCredit };
}
