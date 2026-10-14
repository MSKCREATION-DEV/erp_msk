import {
  COM_DOCS_GATED,
  COM_DOCS_GATED_MESSAGE,
} from "@/lib/commercial/gates";

/**
 * Modules du hub Commercial — sections métier (proposition v2 + charte MSK).
 */
export type CommercialHubSection = "pilotage" | "prospection" | "vente";

export type CommercialModule = {
  id: string;
  href: string;
  title: string;
  description: string;
  section: CommercialHubSection;
  /** Accent MSK (pas de violet). */
  tone: "blue" | "coral" | "cyan" | "ink";
  permission?: string;
  /** Visible grisé, non navigable (ex. devis/facture Direction 13/10). */
  gated?: boolean;
  gatedHint?: string;
};

/** Ordre d’affichage : Pilotage d’abord. */
export const HUB_SECTIONS: {
  id: CommercialHubSection;
  title: string;
  subtitle: string;
}[] = [
  {
    id: "pilotage",
    title: "Pilotage",
    subtitle: "Mesurer et rendre compte",
  },
  {
    id: "prospection",
    title: "Prospection",
    subtitle: "Trouver, contacter, relancer",
  },
  {
    id: "vente",
    title: "Vente et facturation",
    subtitle: "Proposer, signer, encaisser",
  },
];

export const COMMERCIAL_MODULES: CommercialModule[] = [
  {
    id: "tableau",
    href: "/crm",
    title: "Tableau de bord",
    description: "Indicateurs live, statuts, urgences et graphiques.",
    section: "pilotage",
    tone: "ink",
    permission: "crm.access",
  },
  {
    id: "equipe",
    href: "/crm/equipe",
    title: "Vue Équipe",
    description: "Prospects, retards et objectifs par collab.",
    section: "pilotage",
    tone: "ink",
    permission: "crm.access",
  },
  {
    id: "rapport",
    href: "/crm/rapport-semaine",
    title: "Rapport",
    description: "Chiffres auto + objectifs de la semaine.",
    section: "pilotage",
    tone: "ink",
    permission: "crm.access",
  },
  {
    id: "objectifs",
    href: "/crm/objectifs",
    title: "Objectifs",
    description: "Assignation globale ou par collaborateur.",
    section: "pilotage",
    tone: "ink",
    permission: "crm.access",
  },
  {
    id: "prospects",
    href: "/crm/prospects",
    title: "Prospects",
    description: "Prospects, statuts, relances et fiches détaillées.",
    section: "prospection",
    tone: "blue",
    permission: "crm.access",
  },
  {
    id: "relances",
    href: "/crm/relances",
    title: "Relances",
    description: "À faire aujourd’hui, en retard, cette semaine.",
    section: "prospection",
    tone: "coral",
    permission: "crm.access",
  },
  {
    id: "scripts",
    href: "/crm/scripts",
    title: "Scripts",
    description: "Messages IG, LinkedIn, WhatsApp et relances à copier.",
    section: "prospection",
    tone: "blue",
    permission: "crm.scripts.view",
  },
  {
    id: "offres",
    href: "/catalogue",
    title: "Offres",
    description: "Catalogue MSK, tarifs et planchers.",
    section: "vente",
    tone: "cyan",
    permission: "com.catalogue.view",
  },
  {
    id: "devis",
    href: "/commercial/devis",
    title: "Devis",
    description: "Propositions, envoi PDF et suivi d’acceptation.",
    section: "vente",
    tone: "cyan",
    permission: "com.access",
    gated: COM_DOCS_GATED,
    gatedHint: COM_DOCS_GATED_MESSAGE,
  },
  {
    id: "factures",
    href: "/commercial/factures",
    title: "Factures",
    description: "Émission, paiements et solde à encaisser.",
    section: "vente",
    tone: "cyan",
    permission: "com.access",
    gated: COM_DOCS_GATED,
    gatedHint: COM_DOCS_GATED_MESSAGE,
  },
  {
    id: "clients",
    href: "/commercial/clients",
    title: "Clients",
    description: "Clients signés et conversion depuis un prospect.",
    section: "vente",
    tone: "cyan",
    permission: "com.access",
  },
];
