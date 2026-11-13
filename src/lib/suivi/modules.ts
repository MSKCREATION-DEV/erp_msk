/**
 * Modules du hub Suivi (tampon) — pattern Commercial (sections + KPI par carte).
 */

export type SuiviHubSection =
  | "pilotage"
  | "clients"
  | "tresorerie"
  | "rh"
  | "stocks";

export type SuiviHubTone = "blue" | "coral" | "cyan" | "ink";

export type SuiviModule = {
  id: string;
  href: string;
  title: string;
  description: string;
  section: SuiviHubSection;
  tone: SuiviHubTone;
  permission: string;
};

/** Ordre d’affichage — comme Commercial : Pilotage d’abord. */
export const SUIVI_HUB_SECTIONS: {
  id: SuiviHubSection;
  title: string;
  subtitle: string;
}[] = [
  {
    id: "pilotage",
    title: "Pilotage",
    subtitle: "Mesurer trésorerie et alertes",
  },
  {
    id: "clients",
    title: "Clients et encaissements",
    subtitle: "Dettes clients — à encaisser",
  },
  {
    id: "tresorerie",
    title: "Charges et trésorerie",
    subtitle: "Fournisseurs, comptes, mouvements",
  },
  {
    id: "rh",
    title: "Absences et retards",
    subtitle: "Tampon RH — collaborateurs",
  },
  {
    id: "stocks",
    title: "Stocks",
    subtitle: "Articles et quantités",
  },
];

export const SUIVI_MODULES: SuiviModule[] = [
  {
    id: "dashboard",
    href: "/suivi/tableau-de-bord",
    title: "Tableau de bord",
    description: "Soldes, flux, factures clients, charges — sections séparées.",
    section: "pilotage",
    tone: "blue",
    permission: "sv.access",
  },
  {
    id: "clients",
    href: "/suivi/clients",
    title: "Clients",
    description: "Fiches, soldes, restants et à venir.",
    section: "clients",
    tone: "blue",
    permission: "sv.clients.view",
  },
  {
    id: "factures",
    href: "/suivi/factures",
    title: "Factures clients",
    description: "Encaissements clients — payé / reste.",
    section: "clients",
    tone: "cyan",
    permission: "sv.invoices.view",
  },
  {
    id: "charges",
    href: "/suivi/charges",
    title: "Charges",
    description: "Factures fournisseurs — Orange, EDM, loyer…",
    section: "tresorerie",
    tone: "coral",
    permission: "sv.expenses.view",
  },
  {
    id: "comptes",
    href: "/suivi/comptes",
    title: "Comptes",
    description: "Caisse physique et banque — soldes et historique.",
    section: "tresorerie",
    tone: "ink",
    permission: "sv.accounts.view",
  },
  {
    id: "mouvements",
    href: "/suivi/mouvements",
    title: "Mouvements",
    description: "Registre transversal entrées / sorties.",
    section: "tresorerie",
    tone: "cyan",
    permission: "sv.movements.view",
  },
  {
    id: "absences",
    href: "/suivi/absences",
    title: "Absences",
    description: "Maladie, autorisées — justificatif GED optionnel.",
    section: "rh",
    tone: "coral",
    permission: "sv.hr.view",
  },
  {
    id: "retards",
    href: "/suivi/retards",
    title: "Retards",
    description: "Arrivées tardives — date et heure.",
    section: "rh",
    tone: "blue",
    permission: "sv.hr.view",
  },
  {
    id: "stocks",
    href: "/suivi/stocks",
    title: "Stocks",
    description: "Articles, quantités et emplacements.",
    section: "stocks",
    tone: "coral",
    permission: "sv.stock.view",
  },
];

export const SUIVI_SUBNAV = [
  { href: "/suivi", label: "Menu", exact: true },
  {
    href: "/suivi/tableau-de-bord",
    label: "Tableau de bord",
    permission: "sv.access",
  },
  { href: "/suivi/clients", label: "Clients", permission: "sv.clients.view" },
  {
    href: "/suivi/factures",
    label: "Factures clients",
    permission: "sv.invoices.view",
  },
  {
    href: "/suivi/charges",
    label: "Charges",
    permission: "sv.expenses.view",
  },
  {
    href: "/suivi/comptes",
    label: "Comptes",
    permission: "sv.accounts.view",
  },
  {
    href: "/suivi/mouvements",
    label: "Mouvements",
    permission: "sv.movements.view",
  },
  {
    href: "/suivi/absences",
    label: "Absences",
    permission: "sv.hr.view",
  },
  {
    href: "/suivi/retards",
    label: "Retards",
    permission: "sv.hr.view",
  },
  { href: "/suivi/stocks", label: "Stocks", permission: "sv.stock.view" },
] as const;
