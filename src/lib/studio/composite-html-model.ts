/**
 * Modèle tabulaire pour preview HTML des régions `[[COMPOSITE]]`.
 * Module **pur** (pas de pdf-lib / rh / prisma) — safe côté client Playground.
 */
import { company } from "@/lib/company";
import { formatMoneyFr } from "@/lib/pdf/winansi";
import type { CompositeRenderer } from "@/lib/studio/composite";
import type { OfficialPdfPayload } from "@/lib/studio/official-payload";

/** Taux cotisations Mali (indicatif) — alignés fiche Guiro / `rh.ts`. */
export const SOCIAL_CONTRIBUTIONS: Array<{ label: string; rate: number }> = [
  { label: "Accident de Travail", rate: 0.02 },
  { label: "Prestations Familiales", rate: 0.08 },
  { label: "Retraite", rate: 0.07 },
  { label: "Invalidite", rate: 0.02 },
  { label: "ANPE", rate: 0.01 },
  { label: "AMO (employeur)", rate: 0.035 },
  { label: "AMO (employe)", rate: 0.0306 },
];

const TOTAL_CONTRIBUTION_RATE = SOCIAL_CONTRIBUTIONS.reduce(
  (sum, c) => sum + c.rate,
  0,
);

/** Données tabulaires pour preview HTML (même source que régions PDF). */
export type CompositeHtmlModel =
  | {
      kind: "lines";
      headers: string[];
      rows: string[][];
      footer?: string;
    }
  | {
      kind: "kv";
      sections: Array<{ title: string; rows: Array<[string, string]> }>;
    }
  | {
      kind: "cotisations";
      rows: Array<{ label: string; rate: string; amount: string }>;
      brut: string;
      totalCotis: string;
      net: string;
    };

export function compositeHtmlModel(
  renderer: CompositeRenderer,
  payload: OfficialPdfPayload | undefined,
): CompositeHtmlModel | null {
  if (!payload) return null;

  if (
    (renderer === "commercial_devis" || renderer === "commercial_facture") &&
    payload.kind === "commercial"
  ) {
    const currency = payload.input.currency ?? company.currency;
    const vatRate = payload.input.vatRate ?? 18;
    const isFacture = renderer === "commercial_facture";
    const headers = isFacture
      ? ["Description", "Date", "Qté", "PU", "TVA", "Montant"]
      : ["Prestations", "Qté", "PU", "Montant"];
    let ht = 0;
    const rows = payload.input.lines.map((l) => {
      const total = l.qty * l.unitPrice;
      ht += total;
      if (isFacture) {
        return [
          l.label,
          l.date ?? payload.input.issueDate ?? "",
          String(l.qty),
          formatMoneyFr(l.unitPrice),
          `${l.vatRate ?? vatRate}%`,
          `${formatMoneyFr(total)} ${currency}`,
        ];
      }
      return [
        l.label,
        String(l.qty),
        formatMoneyFr(l.unitPrice),
        `${formatMoneyFr(total)} ${currency}`,
      ];
    });
    const vat = Math.round(ht * (vatRate / 100));
    return {
      kind: "lines",
      headers,
      rows,
      footer: `HT ${formatMoneyFr(ht)} ${currency} · TVA ${vatRate}% ${formatMoneyFr(vat)} ${currency} · TTC ${formatMoneyFr(ht + vat)} ${currency}`,
    };
  }

  if (renderer === "commercial_contract" && payload.kind === "commercial_contract") {
    const currency = payload.input.currency ?? company.currency;
    let ht = 0;
    const rows = payload.input.lines.map((l) => {
      const total = l.qty * l.unitPrice;
      ht += total;
      return [l.label, String(l.qty), `${formatMoneyFr(total)} ${currency}`];
    });
    return {
      kind: "lines",
      headers: ["Désignation", "Qté", "Montant"],
      rows,
      footer: `Total HT ${formatMoneyFr(ht)} ${currency}`,
    };
  }

  if (
    renderer === "rh_contract_presta" &&
    payload.kind === "rh_contract" &&
    payload.variant === "PRESTA"
  ) {
    const e = payload.input.employee;
    return {
      kind: "kv",
      sections: [
        {
          title: "Informations clés",
          rows: [
            ["Date d'effet", payload.input.startDate],
            ["Fin", payload.input.endDate ?? "Indéterminée"],
          ],
        },
        {
          title: "Prestataire",
          rows: [
            ["Nom", `${e.firstName} ${e.lastName}`],
            ["Fonction", e.jobTitle ?? ""],
          ],
        },
      ],
    };
  }

  if (renderer === "rh_payslip" && payload.kind === "rh_payslip") {
    const net = payload.input.netSalaryXof ?? payload.input.baseSalaryXof;
    const base = Math.round(net / (1 - TOTAL_CONTRIBUTION_RATE));
    let totalCotis = 0;
    const rows = SOCIAL_CONTRIBUTIONS.map((c) => {
      const amt = Math.round(base * c.rate);
      totalCotis += amt;
      return {
        label: c.label,
        rate: `${(c.rate * 100).toFixed(2)} %`,
        amount: `${formatMoneyFr(amt)} ${company.currency}`,
      };
    });
    return {
      kind: "cotisations",
      rows,
      brut: `${formatMoneyFr(base)} ${company.currency}`,
      totalCotis: `${formatMoneyFr(totalCotis)} ${company.currency}`,
      net: `${formatMoneyFr(net)} ${company.currency}`,
    };
  }

  return null;
}
