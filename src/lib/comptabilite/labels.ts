import type { CptEntryStatus, CptPeriodStatus } from "@prisma/client";

export const ENTRY_STATUS_LABEL: Record<CptEntryStatus, string> = {
  DRAFT: "Brouillon",
  VALIDATED: "Validée",
};

export const PERIOD_STATUS_LABEL: Record<CptPeriodStatus, string> = {
  OPEN: "Ouverte",
  CLOSED: "Clôturée",
};

export const MONTH_LABELS = [
  "",
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const;

export function classLabel(classNum: number): string {
  const map: Record<number, string> = {
    1: "Ressources durables",
    2: "Actif immobilisé",
    3: "Stocks",
    4: "Tiers",
    5: "Trésorerie",
    6: "Charges",
    7: "Produits",
    8: "Autres charges / produits",
  };
  return map[classNum] ?? `Classe ${classNum}`;
}
