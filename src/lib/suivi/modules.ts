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
    id: "mouvements",
    href: "/suivi/mouvements",
    title: "Mouvements",
    description: "Entrées / sorties et historique (trésorerie tampon).",
    tone: "ink",
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
  { href: "/suivi/clients", label: "Clients", permission: "sv.clients.view" },
  { href: "/suivi/factures", label: "Factures", permission: "sv.invoices.view" },
  {
    href: "/suivi/mouvements",
    label: "Mouvements",
    permission: "sv.movements.view",
  },
  { href: "/suivi/stocks", label: "Stocks", permission: "sv.stock.view" },
] as const;
