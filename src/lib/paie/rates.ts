/** Taux INPS / charges — seed provisoire (fiche Guiro), éditables en CFG. */
export type InpsRateLine = {
  code: string;
  label: string;
  /** Taux décimal (0.02 = 2 %). */
  rate: number;
  party: "EMPLOYER" | "EMPLOYEE";
};

export const DEFAULT_INPS_RATES: InpsRateLine[] = [
  { code: "AT", label: "Accident de Travail", rate: 0.02, party: "EMPLOYER" },
  {
    code: "PF",
    label: "Prestations Familiales",
    rate: 0.08,
    party: "EMPLOYER",
  },
  { code: "RET", label: "Retraite", rate: 0.07, party: "EMPLOYER" },
  { code: "INV", label: "Invalidite", rate: 0.02, party: "EMPLOYER" },
  { code: "ANPE", label: "ANPE", rate: 0.01, party: "EMPLOYER" },
  {
    code: "AMO_EMP",
    label: "AMO (employeur)",
    rate: 0.035,
    party: "EMPLOYER",
  },
  {
    code: "AMO_SAL",
    label: "AMO (employe)",
    rate: 0.0306,
    party: "EMPLOYEE",
  },
];

export const INPS_PROVISIONAL_NOTE =
  "Taux provisoires alignes fiche de paie MSK — a valider Direction/Compta avant declaration officielle.";
