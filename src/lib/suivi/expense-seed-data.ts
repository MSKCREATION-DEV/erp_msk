/**
 * Seed charges entreprise — OCR inventaire docs/ (décision J).
 * Aucune data inventée : montants / dates issus des PDF.
 */
import type {
  SvExpenseCategory,
  SvInvoiceStatus,
} from "@/generated/prisma/client";

export type SvExpenseSeedPayment = {
  amount: number;
  paidAt: string;
  method?: string;
  reference?: string;
  note?: string;
};

export type SvExpenseSeedRow = {
  sourceDocument: string;
  category: SvExpenseCategory;
  status: SvInvoiceStatus;
  vendorName: string;
  vendorRef?: string;
  number: string;
  issuedAt: string;
  dueAt?: string;
  periodStart?: string;
  periodEnd?: string;
  periodLabel?: string;
  totalHt: number;
  totalVat: number;
  totalTtc: number;
  amountPaid: number;
  object: string;
  notes?: string;
  payments: SvExpenseSeedPayment[];
};

/**
 * Synthèse OCR 2026-11-12 + confirmation Direction (statuts paiement) :
 * - Non payées (3) : Orange oct. CB503620261001 · EDM oct. · loyer nov.
 * - Payées (3) : Orange août/sept. (passé Direction) · loyer oct. (OCR Pour acquit).
 * - Orange : pdftotext · EDM / Loyer : scans photo.
 * Date de paiement exacte inconnue → paidAt = échéance (ou émission) + note Direction.
 */
export const SV_SEED_EXPENSE_INVOICES: SvExpenseSeedRow[] = [
  {
    sourceDocument: "docs/facture_CB503620261001.pdf",
    category: "ORANGE_INTERNET",
    status: "EMISE",
    vendorName: "Orange Mali",
    vendorRef: "CB5036 / A00367302863",
    number: "CB503620261001",
    issuedAt: "2026-11-12",
    dueAt: "2026-12-14",
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
    periodLabel: "Octobre 2026",
    totalHt: 65600,
    totalVat: 11808,
    totalTtc: 85149,
    amountPaid: 0,
    object: "Orange Internet FO B2B — octobre 2026",
    notes:
      "OCR pdftotext. HT 65 600 · TVA 11 808 · Montant facture 77 408 · FDS 10% 7 741 · Total dû 85 149. Statut : non payée (confirmation Direction).",
    payments: [],
  },
  {
    sourceDocument: "docs/Fac-edm-octobre.pdf",
    category: "EDM_ELECTRICITE",
    status: "EMISE",
    vendorName: "Énergie du Mali (EDM-S.A.)",
    vendorRef: "012 30000034012 01",
    number: "455053",
    issuedAt: "2026-10-28",
    dueAt: "2026-11-13",
    periodStart: "2026-09-26",
    periodEnd: "2026-10-27",
    periodLabel: "10/2026",
    totalHt: 40812,
    totalVat: 6803,
    totalTtc: 47615,
    amountPaid: 0,
    object: "EDM électricité — octobre 2026",
    notes:
      "OCR scan. Centre LAFIABOUGOU · conso 311 kWh. TTC retenu = montant chèque 47 615 (espèces 47 855 = +timbre 240). Mention manuscrite « Facture déposée Le 30-10 ». Non payée (confirmation Direction).",
    payments: [],
  },
  {
    sourceDocument: "docs/Fac-location-novembre.pdf",
    category: "LOYER",
    status: "EMISE",
    vendorName: "Modibo Hamaye GAMBY",
    vendorRef: "NIF 082243553N · GAMBYLA1/ACI1/ACI1/B4",
    number: "2026/01597",
    issuedAt: "2026-11-02",
    dueAt: "2026-11-07",
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
    periodLabel: "Novembre 2026",
    totalHt: 400000,
    totalVat: 0,
    totalTtc: 400000,
    amountPaid: 0,
    object: "Loyer appartement — novembre 2026",
    notes:
      "OCR scan. 400 000 F · « 5 jours après réception ». Zone « Pour acquit » pré-imprimée — ne vaut pas preuve de paiement. Non payée (confirmation Direction).",
    payments: [],
  },
  {
    sourceDocument: "docs/facture_CB503620260901.pdf",
    category: "ORANGE_INTERNET",
    status: "PAYEE",
    vendorName: "Orange Mali",
    vendorRef: "CB5036 / A00367302863",
    number: "CB503620260901",
    issuedAt: "2026-10-12",
    dueAt: "2026-11-13",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    periodLabel: "Septembre 2026",
    totalHt: 55000,
    totalVat: 9900,
    totalTtc: 71390,
    amountPaid: 71390,
    object: "Orange Internet FO B2B — septembre 2026",
    notes:
      "OCR pdftotext. HT 55 000 · TVA 9 900 · Facture 64 900 · FDS 6 490 · Total 71 390. PAYEE — soldé selon confirmation Direction (passé). Date exacte inconnue → paidAt = échéance. Pas de mouvement caisse inventé.",
    payments: [
      {
        amount: 71390,
        paidAt: "2026-11-13",
        method: "Non précisé",
        note: "soldé selon confirmation Direction (passé)",
      },
    ],
  },
  {
    sourceDocument: "docs/facture_CB503620260801.pdf",
    category: "ORANGE_INTERNET",
    status: "PAYEE",
    vendorName: "Orange Mali",
    vendorRef: "CB5036 / A00367302863",
    number: "CB503620260801",
    issuedAt: "2026-09-10",
    dueAt: "2026-10-12",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    periodLabel: "Août 2026",
    totalHt: 60950,
    totalVat: 10971,
    totalTtc: 79113,
    amountPaid: 79113,
    object: "Orange Internet FO B2B — août 2026",
    notes:
      "OCR pdftotext. HT 60 950 · TVA 10 971 · Facture 71 921 · FDS 7 192 · Total 79 113. PAYEE — soldé selon confirmation Direction (passé). Date exacte inconnue → paidAt = échéance. Pas de mouvement caisse inventé.",
    payments: [
      {
        amount: 79113,
        paidAt: "2026-10-12",
        method: "Non précisé",
        note: "soldé selon confirmation Direction (passé)",
      },
    ],
  },
  {
    sourceDocument: "docs/FACTURE_LOYER_OCT_2026-10-08.pdf",
    category: "LOYER",
    status: "PAYEE",
    vendorName: "Modibo Hamaye GAMBY",
    vendorRef: "NIF 082243553N · GAMBYLA1/ACI1/ACI1/B4",
    number: "2026/01435",
    issuedAt: "2026-10-01",
    dueAt: "2026-10-06",
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
    periodLabel: "Octobre 2026",
    totalHt: 400000,
    totalVat: 0,
    totalTtc: 400000,
    amountPaid: 400000,
    object: "Loyer appartement — octobre 2026",
    notes:
      "OCR scan. 400 000 F. Signature + cachet sur « Pour acquit » → preuve de paiement retenue (décision J). Confirmé PAYEE Direction. Pas de mouvement caisse inventé (compte/mode non documentés).",
    payments: [
      {
        amount: 400000,
        paidAt: "2026-10-08",
        method: "Non précisé",
        note: "OCR : Pour acquit signé / cacheté (fichier FACTURE_LOYER_OCT_2026-10-08)",
      },
    ],
  },
];
