/**
 * Modules du hub Commercial — entrée par cartes (FLOW-COMMERCIAL-E2E).
 */
export type CommercialModule = {
  id: string;
  href: string;
  title: string;
  description: string;
  /** Dégradé bandeau (charte MSK — fonds clairs). */
  band: string;
  permission?: string;
  match?: string[];
};

export const COMMERCIAL_MODULES: CommercialModule[] = [
  {
    id: "tableau",
    href: "/crm",
    title: "Tableau de bord",
    description: "Indicateurs live, statuts, urgences et graphiques.",
    band: "from-[#2A3D8E] to-[#00ACEE]",
    permission: "crm.access",
    match: ["/crm"],
  },
  {
    id: "prospects",
    href: "/crm/prospects",
    title: "Prospects",
    description: "Portefeuille, statuts, relances et fiches détaillées.",
    band: "from-[#1D73BC] to-[#2A3D8E]",
    permission: "crm.access",
  },
  {
    id: "relances",
    href: "/crm/relances",
    title: "Relances",
    description: "À faire aujourd’hui, en retard, cette semaine.",
    band: "from-[#1384CB] to-[#1D73BC]",
    permission: "crm.access",
  },
  {
    id: "scripts",
    href: "/crm/scripts",
    title: "Scripts",
    description: "Messages IG, LinkedIn, WhatsApp et relances à copier.",
    band: "from-[#00ACEE] to-[#1D73BC]",
    permission: "crm.scripts.view",
  },
  {
    id: "equipe",
    href: "/crm/equipe",
    title: "Vue Équipe",
    description: "Volumes et retards par collab (visibilité équipe).",
    band: "from-[#1D73BC] to-[#284393]",
    /** Filtré côté hub via visibilité CRM (pas own). */
    permission: "crm.access",
  },
  {
    id: "rapport",
    href: "/crm/rapport-semaine",
    title: "Rapport",
    description: "Chiffres auto + synthèse avant vendredi 17h.",
    band: "from-[#1384CB] to-[#00ACEE]",
    permission: "crm.access",
  },
  {
    id: "clients",
    href: "/commercial/clients",
    title: "Clients",
    description: "Clients signés et conversion depuis un prospect.",
    band: "from-[#284393] to-[#1D73BC]",
    permission: "com.access",
  },
  {
    id: "devis",
    href: "/commercial/devis",
    title: "Devis",
    description: "Propositions, envoi PDF et suivi d’acceptation.",
    band: "from-[#2A3D8E] to-[#1384CB]",
    permission: "com.access",
  },
  {
    id: "factures",
    href: "/commercial/factures",
    title: "Factures",
    description: "Émission, paiements et solde à encaisser.",
    band: "from-[#1D73BC] to-[#00ACEE]",
    permission: "com.access",
  },
  {
    id: "offres",
    href: "/catalogue",
    title: "Offres",
    description: "Catalogue MSK, tarifs et planchers.",
    band: "from-[#0D1330] to-[#1D73BC]",
    permission: "com.catalogue.view",
  },
];
