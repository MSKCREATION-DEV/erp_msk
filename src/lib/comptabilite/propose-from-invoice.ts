import { prisma } from "@/lib/prisma";
import { convertEurToXof, getEurXofRate } from "@/lib/comptabilite/fx";
import {
  buildInvoiceVeLines,
  type ProposedLine,
} from "@/lib/comptabilite/invoice-ve-lines";

export type { ProposedLine };

export type InvoiceProposal = {
  label: string;
  journalCode: "VE";
  currencyOriginal: string;
  fxRate: number | null;
  amountOriginal: number | null;
  totalXof: number;
  lines: ProposedLine[];
  alreadyLinked: boolean;
  existingEntryId?: string;
};

/**
 * Proposition d'écriture VE depuis facture émise/payée :
 * D 411 (TTC) / C 706 (HT) / C 4432 (TVA) — montants en FCFA.
 */
export async function proposeEntryFromInvoice(
  invoiceId: string,
): Promise<InvoiceProposal | { error: string }> {
  const invoice = await prisma.comInvoice.findUnique({
    where: { id: invoiceId },
    include: { client: { select: { name: true } } },
  });
  if (!invoice) return { error: "Facture introuvable" };
  if (
    invoice.status !== "EMISE" &&
    invoice.status !== "PARTIELLEMENT_PAYEE" &&
    invoice.status !== "PAYEE"
  ) {
    return { error: "La facture doit être émise (ou payée) pour proposer une écriture" };
  }

  const existing = await prisma.cptEntry.findFirst({
    where: { sourceType: "COM_INVOICE", sourceId: invoice.id },
    select: { id: true },
  });
  if (existing) {
    return {
      label: `Facture ${invoice.number}`,
      journalCode: "VE",
      currencyOriginal: invoice.currency,
      fxRate: null,
      amountOriginal: null,
      totalXof: 0,
      lines: [],
      alreadyLinked: true,
      existingEntryId: existing.id,
    };
  }

  let ht = invoice.totalHt;
  let vat = invoice.totalVat;
  let ttc = invoice.totalTtc;
  let fxRate: number | null = null;
  let amountOriginal: number | null = null;

  if (invoice.currency === "EUR") {
    fxRate = await getEurXofRate(invoice.issuedAt ?? new Date());
    amountOriginal = ttc;
    ht = convertEurToXof(ht, fxRate);
    vat = convertEurToXof(vat, fxRate);
    ttc = convertEurToXof(ttc, fxRate);
    // Ajuster écart d'arrondi sur TTC
    const sum = ht + vat;
    if (sum !== ttc) {
      vat += ttc - sum;
    }
  }

  const lines = buildInvoiceVeLines({
    clientName: invoice.client.name,
    regime: invoice.regime === "FR" ? "FR" : "ML",
    ht,
    vat,
    ttc,
  });

  return {
    label: `Facture ${invoice.number} — ${invoice.client.name}`,
    journalCode: "VE",
    currencyOriginal: invoice.currency,
    fxRate,
    amountOriginal,
    totalXof: ttc,
    lines,
    alreadyLinked: false,
  };
}
