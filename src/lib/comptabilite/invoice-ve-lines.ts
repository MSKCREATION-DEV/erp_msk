export type ProposedLine = {
  accountCode: string;
  debit: number;
  credit: number;
  label: string;
};

/** Lignes VE SYSCOHADA depuis montants déjà en XOF. */
export function buildInvoiceVeLines(opts: {
  clientName: string;
  regime: "ML" | "FR";
  ht: number;
  vat: number;
  ttc: number;
}): ProposedLine[] {
  const clientAccount = opts.regime === "FR" ? "4112" : "4111";
  const lines: ProposedLine[] = [
    {
      accountCode: clientAccount,
      debit: opts.ttc,
      credit: 0,
      label: `Client ${opts.clientName}`,
    },
    {
      accountCode: "706",
      debit: 0,
      credit: opts.ht,
      label: "Services vendus",
    },
  ];
  if (opts.vat > 0) {
    lines.push({
      accountCode: "4432",
      debit: 0,
      credit: opts.vat,
      label: "TVA collectée",
    });
  }
  return lines;
}
