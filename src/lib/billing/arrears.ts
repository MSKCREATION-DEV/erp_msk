import { assertMoneyInt, type MoneyInt } from "./money";

/**
 * Référence d’arriéré présentée sur une facture (relevé).
 * Ce n’est PAS une nouvelle créance — la dette reste sur `sourceInvoiceId`.
 */
export type ArrearsPresentationRef = {
  sourceInvoiceId: string;
  sourceInvoiceNumber: string;
  /** Solde ouvert de la facture source au moment de la présentation */
  presentedAmount: MoneyInt;
  label?: string;
};

export type NetPayableInput = {
  /** TTC des prestations de la période courante */
  periodTtc: MoneyInt;
  /** Références d’arriérés (soldes ouverts d’autres factures) */
  arrearsRefs: ArrearsPresentationRef[];
  /** Acomptes / paiements déjà imputés sur CETTE facture (période) */
  allocatedOnThisInvoice?: MoneyInt;
};

export type NetPayableBreakdown = {
  periodTtc: MoneyInt;
  arrearsPresented: MoneyInt;
  allocatedOnThisInvoice: MoneyInt;
  /** periodTtc + arrearsPresented - allocatedOnThisInvoice */
  netPayable: MoneyInt;
  /**
   * Créance « réelle » créée par cette facture (période seule).
   * Les arriérés ne sont PAS ajoutés ici (anti double-comptage).
   */
  receivableCreated: MoneyInt;
  arrearsRefs: ArrearsPresentationRef[];
};

/**
 * Calcule le net à payer d’un relevé (ex. ECOSOL octobre)
 * sans créer une double créance pour les arriérés.
 */
export function computeNetPayable(input: NetPayableInput): NetPayableBreakdown {
  const periodTtc = assertMoneyInt(input.periodTtc, "periodTtc");
  const allocatedOnThisInvoice = assertMoneyInt(
    input.allocatedOnThisInvoice ?? 0,
    "allocatedOnThisInvoice",
  );
  let arrearsPresented = 0;
  for (const ref of input.arrearsRefs) {
    const amt = assertMoneyInt(ref.presentedAmount, "presentedAmount");
    if (amt < 0) throw new Error("presentedAmount must be >= 0");
    arrearsPresented += amt;
  }
  const netPayable = Math.max(
    0,
    periodTtc + arrearsPresented - allocatedOnThisInvoice,
  );
  return {
    periodTtc,
    arrearsPresented,
    allocatedOnThisInvoice,
    netPayable,
    receivableCreated: periodTtc,
    arrearsRefs: input.arrearsRefs,
  };
}

/**
 * Solde client global : somme des soldes ouverts des factures
 * (les arriérés présentés n’ajoutent rien).
 */
export function computeClientOpenReceivable(
  invoiceOpenBalances: MoneyInt[],
): MoneyInt {
  let total = 0;
  for (const b of invoiceOpenBalances) {
    total += Math.max(0, assertMoneyInt(b, "openBalance"));
  }
  return total;
}
