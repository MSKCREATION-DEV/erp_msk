/**
 * Modules du hub Suivi (tampon) — pattern Commercial.
 */

export type SuiviHubTone = "blue" | "coral" | "cyan" | "ink";

export type SuiviModule = {
  id: string;
  href: string;
  title: string;
  description: string;
  tone: SuiviHubTone;
  permission: string;
};

export const SUIVI_MODULES: SuiviModule[] = [
  {
    id: "dashboard",
    href: "/suivi/tableau-de-bord",
    title: "Tableau de bord",
    description: "Soldes, conso, catégories, dettes — pilotage budgets.",
    tone: "blue",
    permission: "sv.access",
  },
  {
    id: "clients",
    href: "/suivi/clients",
    title: "Clients",
    description: "Fiches, soldes, restants et à venir.",
    tone: "blue",
    permission: "sv.clients.view",
  },
  {
    id: "factures",
    href: "/suivi/factures",
    title: "Factures",
    description: "Payé / reste, remix depuis l’historique.",
    tone: "cyan",
    permission: "sv.invoices.view",
  },
  {
    id: "comptes",
    href: "/suivi/comptes",
    title: "Comptes",
    description: "Caisse physique et banque — soldes et historique.",
    tone: "ink",
    permission: "sv.accounts.view",
  },
  {
    id: "mouvements",
    href: "/suivi/mouvements",
    title: "Mouvements",
    description: "Registre transversal entrées / sorties.",
    tone: "cyan",
    permission: "sv.movements.view",
  },
  {
    id: "stocks",
    href: "/suivi/stocks",
    title: "Stocks",
    description: "Articles, quantités et emplacements.",
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
  { href: "/suivi/factures", label: "Factures", permission: "sv.invoices.view" },
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
  { href: "/suivi/stocks", label: "Stocks", permission: "sv.stock.view" },
] as const;
