import type { CatalogBilling, ComDocRegime } from "@/generated/prisma/client";

export type QuoteLineSnapshot = {
  id: string;
  label: string;
  description?: string | null;
  qty: number;
  unitPrice: number;
  catalogOfferId?: string | null;
  isTravel: boolean;
  sortOrder: number;
};

export type ContractFromQuoteInput = {
  quote: {
    id: string;
    clientId: string;
    regime: ComDocRegime;
    currency: string;
    vatEnabled: boolean;
    vatRate: number;
    object: string | null;
    lines: QuoteLineSnapshot[];
  };
  startDate?: Date | null;
  billingDay?: number;
};

export function buildContractLinesFromQuote(
  lines: QuoteLineSnapshot[],
  startDate: Date | null,
): Array<{
  sortOrder: number;
  label: string;
  description: string | null;
  qty: number;
  unitPrice: number;
  billing: CatalogBilling;
  catalogOfferId: string | null;
  nextBillAt: Date | null;
  startDate: Date | null;
  snapshotJson: object;
}> {
  return lines.map((l) => {
    const billing: CatalogBilling = l.isTravel ? "COMPLEMENTAIRE" : "MONTHLY";
    return {
      sortOrder: l.sortOrder,
      label: l.label,
      description: l.description ?? null,
      qty: l.qty,
      unitPrice: l.unitPrice,
      billing,
      catalogOfferId: l.catalogOfferId ?? null,
      startDate,
      nextBillAt: startDate,
      snapshotJson: {
        label: l.label,
        description: l.description ?? null,
        qty: l.qty,
        unitPrice: l.unitPrice,
        catalogOfferId: l.catalogOfferId ?? null,
        isTravel: l.isTravel,
        capturedAt: new Date().toISOString(),
        sourceQuoteLineId: l.id,
      },
    };
  });
}

export function nextContractReference(seq: number, at = new Date()): string {
  const y = at.getFullYear();
  const m = String(at.getMonth() + 1).padStart(2, "0");
  return `CTR-${y}${m}-${String(seq).padStart(4, "0")}`;
}
