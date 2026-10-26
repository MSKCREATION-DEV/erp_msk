import type { GuideInput } from "../types";
import { GUIDE_SHOTS } from "../shots";

export const commercialGuides: GuideInput[] = [
  {
    id: "com-hub-naviguer",
    title: "Naviguer dans le hub Commercial",
    summary:
      "Une seule entrée sidebar couvre CRM, ventes et catalogue — le hub oriente vers les sous-modules.",
    moduleId: "commercial",
    categories: ["prise-en-main"],
    taskIds: ["naviguer", "consulter"],
    roleIds: ["commercial", "admin_crm", "direction"],
    keywords: ["commercial", "hub", "crm", "menu", "cartes"],
    prerequisites: [
      "Permission `com.access` et/ou `crm.access`.",
    ],
    relatedGuideIds: [
      "crm-creer-prospect",
      "crm-suivre-relancer",
      "crm-transformer-client",
    ],
    status: "validated",
    updatedAt: "2026-10-22",
    difficulty: "debutant",
    viewPermission: "com.access",
    objective:
      "Retrouver rapidement Prospects, Relances, Clients et le tableau de bord sans chercher une entrée CRM séparée.",
    heroVisualId: "hub-hero",
    visuals: [
      {
        id: "hub-hero",
        kind: "screenshot",
        src: GUIDE_SHOTS.commercialHub,
        alt: "Hub Commercial — cartes modules",
        caption: "Hub Commercial : entrée unique pour CRM, clients et offres.",
        chromeTitle: "Commercial",
        highlightNav: "Commercial",
        callouts: [
          { n: 1, label: "Entrée Commercial (sidebar)", zone: "sidebar" },
          { n: 2, label: "Cartes modules", zone: "main" },
        ],
      },
      {
        id: "hub-open",
        kind: "schematic",
        alt: "Repérer Commercial dans la sidebar",
        chromeTitle: "ERP MSK",
        highlightNav: "Commercial",
        callouts: [
          { n: 1, label: "Cliquer Commercial", zone: "sidebar" },
        ],
      },
      {
        id: "hub-cards",
        kind: "screenshot",
        src: GUIDE_SHOTS.commercialHub,
        alt: "Cartes du hub Commercial",
        chromeTitle: "Commercial",
        highlightNav: "Commercial",
        callouts: [
          { n: 1, label: "Choisir une carte", zone: "main" },
        ],
      },
      {
        id: "hub-crm",
        kind: "screenshot",
        src: GUIDE_SHOTS.crmDashboard,
        alt: "Tableau de bord CRM",
        chromeTitle: "CRM — Tableau de bord",
        highlightNav: "Commercial",
        callouts: [
          { n: 1, label: "Indicateurs", zone: "main" },
        ],
      },
    ],
    steps: [
      {
        title: "Ouvrir Commercial",
        instruction:
          "Sidebar → Commercial (il n’y a plus d’entrée CRM ni Catalogue séparées).",
        navPath: "Sidebar → Commercial",
        href: "/commercial",
        expected: "Hub avec cartes modules et indicateurs.",
        visualId: "hub-open",
      },
      {
        title: "Choisir un sous-module",
        instruction:
          "Cliquez une carte (Prospects, Relances, Tableau de bord `/crm`, Clients, etc.). Les cartes absentes correspondent à un droit manquant (ex. Vue Équipe).",
        caution:
          "Les devis/factures peuvent être gated selon décision Direction — une carte absente ou verrouillée n’est pas forcément un bug.",
        visualId: "hub-cards",
      },
      {
        title: "Tableau de bord CRM",
        instruction:
          "Pour les indicateurs (ouverts, relances, conversion…), ouvrez `/crm` depuis le hub.",
        href: "/crm",
        visualId: "hub-crm",
      },
    ],
    expectedResult:
      "Vous savez que CRM et catalogue vivent sous Commercial et comment y accéder.",
    sources: [
      "docs/manuels/05-crm.md",
      "src/lib/nav.ts",
      "src/app/(app)/commercial/page.tsx",
    ],
  },
  {
    id: "crm-creer-prospect",
    title: "Créer un prospect",
    summary:
      "Ouvrir le wizard de création, contrôler les doublons et enregistrer la fiche.",
    moduleId: "commercial",
    categories: ["procedure"],
    taskIds: ["creer"],
    roleIds: ["commercial", "admin_crm", "direction"],
    keywords: ["prospect", "nouveau", "doublon", "opportunité", "CRM"],
    prerequisites: [
      "Permission `crm.prospect.create`.",
      "Accès hub Commercial / CRM.",
    ],
    relatedGuideIds: ["crm-suivre-relancer", "com-hub-naviguer"],
    status: "to_validate",
    updatedAt: "2026-10-25",
    difficulty: "debutant",
    viewPermission: "crm.prospect.create",
    objective:
      "Créer une opportunité sans doublon destructeur et avec les contacts nécessaires.",
    heroVisualId: "prospect-list",
    visuals: [
      {
        id: "prospect-list",
        kind: "screenshot",
        src: GUIDE_SHOTS.crmProspects,
        alt: "Liste des prospects",
        chromeTitle: "Prospects",
        highlightNav: "Commercial",
        callouts: [
          { n: 1, label: "Liste prospects", zone: "table" },
          { n: 2, label: "Nouveau", zone: "cta" },
        ],
      },
      {
        id: "prospect-nouveau",
        kind: "screenshot",
        src: GUIDE_SHOTS.crmProspectsNouveau,
        alt: "Wizard nouveau prospect",
        chromeTitle: "Nouveau prospect",
        highlightNav: "Commercial",
        callouts: [
          { n: 1, label: "Formulaire / wizard", zone: "form" },
        ],
      },
    ],
    steps: [
      {
        title: "Aller sur Prospects",
        instruction: "Commercial → Prospects (liste).",
        navPath: "Commercial → Prospects",
        href: "/crm/prospects",
        visualId: "prospect-list",
      },
      {
        title: "Lancer la création",
        instruction: "Ouvrez la page dédiée Nouveau prospect (pas de formulaire inline sur la liste).",
        href: "/crm/prospects/nouveau",
        uiTarget: "Nouveau",
        expected: "Wizard de création.",
        visualId: "prospect-nouveau",
      },
      {
        title: "Renseigner et contrôler les doublons",
        instruction:
          "Saisissez le nom d’entreprise : dès 3 caractères, une vérification automatique propose les fiches correspondantes. Toute correspondance (nom identique ou très proche) → Continuer bloqué — ouvrez la fiche ou modifiez le nom. À l’étape Contact, téléphone / e-mail déjà connus → cards + « Continuer quand même » obligatoire. Multi-moyens de contact et réseaux sociaux entreprise optionnels.",
        caution:
          "Les Clients n’apparaissent jamais dans le listing Prospects. La création est refusée côté serveur si une entreprise correspondante existe (identique ou proche), ou si un tél/e-mail connu est soumis sans confirmation.",
        visualId: "prospect-nouveau",
      },
      {
        title: "Enregistrer",
        instruction:
          "Validez le formulaire. Vous êtes redirigé vers la fiche prospect.",
        expected: "Fiche créée, visible en liste selon le scope.",
      },
    ],
    expectedResult:
      "Fiche prospect accessible ; journal / contacts prêts pour le suivi.",
    bestPractices: [
      "Vérifier le doublon avant de forcer une création.",
      "Renseigner au moins un canal de contact exploitable pour la relance.",
    ],
    sources: ["docs/manuels/05-crm.md"],
  },
  {
    id: "crm-suivre-relancer",
    title: "Suivre et relancer un prospect",
    summary:
      "Journaliser le suivi, passer en Contacté correctement, utiliser Relances et le compteur Relancé N×.",
    moduleId: "commercial",
    categories: ["procedure"],
    taskIds: ["suivre", "modifier"],
    roleIds: ["commercial", "admin_crm"],
    keywords: [
      "relance",
      "contacté",
      "journal",
      "retard",
      "Relancé",
      "recherche",
    ],
    prerequisites: [
      "Être le suivi du prospect (ou droit lead / réassignation).",
      "Permission d’activité CRM (`crm.activity.log` / édition own).",
    ],
    relatedGuideIds: ["crm-creer-prospect", "crm-transformer-client"],
    status: "to_validate",
    updatedAt: "2026-10-26",
    difficulty: "intermediaire",
    viewPermission: "crm.access",
    objective:
      "Tenir un historique de relances exploitable (appel, WhatsApp, e-mail, RDV…) et respecter les règles de statut.",
    heroVisualId: "relances-hero",
    visuals: [
      {
        id: "relances-hero",
        kind: "screenshot",
        src: GUIDE_SHOTS.crmRelances,
        alt: "Page Relances CRM",
        chromeTitle: "Relances",
        highlightNav: "Commercial",
        callouts: [
          { n: 1, label: "Recherche + vues échéance", zone: "toolbar" },
          { n: 2, label: "Liste à traiter", zone: "table" },
        ],
      },
      {
        id: "relances-list",
        kind: "screenshot",
        src: GUIDE_SHOTS.crmProspects,
        alt: "Prospects avec badge Relancé",
        chromeTitle: "Prospects",
        highlightNav: "Commercial",
        callouts: [{ n: 1, label: "Ouvrir une fiche", zone: "table" }],
      },
    ],
    steps: [
      {
        title: "Ouvrir la fiche",
        instruction: "Prospects → clic sur la ligne → fiche `/crm/prospects/[id]`.",
        href: "/crm/prospects",
        visualId: "relances-list",
      },
      {
        title: "Passer en Contacté (si besoin)",
        instruction:
          "Le passage en Contacté exige canal + commentaire (ce qui a été dit, ou « pas de réponse ») — une ligne est créée dans le journal.",
        caution: "Sans canal/commentaire, le changement de statut est refusé.",
      },
      {
        title: "Planifier / traiter les relances",
        instruction:
          "Consultez Relances (`/crm/relances`) : recherche (entreprise, contact, tél., e-mail, commercial, action) + vues aujourd’hui / retard / semaine. La recherche se combine avec les vues et le filtre collaborateur. Le badge Relancé N× compte les actions de suivi (pas les notes libres).",
        href: "/crm/relances",
        visualId: "relances-hero",
      },
      {
        title: "Utiliser un script (optionnel)",
        instruction:
          "Scripts CRM (`/crm/scripts`) pour copier un message type — lecture selon `crm.scripts.view`.",
        href: "/crm/scripts",
      },
    ],
    expectedResult:
      "Activités journalisées ; compteur Relancé cohérent ; relances à jour.",
    workflow: {
      title: "Suivi courant",
      nodes: [
        { id: "s", label: "Prospect ouvert", kind: "start" },
        { id: "a", label: "Contact / relance", kind: "action" },
        { id: "b", label: "Journal + N×", kind: "action" },
        { id: "d", label: "Intéressé ?", kind: "decision" },
        { id: "e1", label: "Continuer suivi", kind: "end" },
        { id: "e2", label: "Vers client", kind: "end" },
      ],
      edges: [
        { from: "s", to: "a" },
        { from: "a", to: "b" },
        { from: "b", to: "d" },
        { from: "d", to: "e1", label: "Non" },
        { from: "d", to: "e2", label: "Oui" },
      ],
    },
    bestPractices: [
      "Perdu exige au moins 3 relances de suivi (hors notes).",
      "Lecture partagée : tous les commerciaux voient les prospects ; écriture = suivi.",
    ],
    troubleshooting: [
      {
        problem: "Je ne peux pas éditer / journaliser",
        cause: "Prospect non affecté à vous (lecture seule).",
        check: "Champ « Suivi par » sur la fiche.",
        solution:
          "Demander le suivi, ou faire affecter par Direction / Admin CRM.",
        escalate: "Admin CRM — page Affectations.",
      },
    ],
    sources: ["docs/manuels/05-crm.md"],
  },
  {
    id: "crm-transformer-client",
    title: "Transformer un prospect en client",
    summary:
      "Dès le statut Intéressé : créer le client commercial et passer le CRM en Client.",
    moduleId: "commercial",
    categories: ["procedure"],
    taskIds: ["transformer", "creer"],
    roleIds: ["commercial", "admin_crm", "direction"],
    keywords: ["intéressé", "client", "transformer", "COM"],
    prerequisites: [
      "Prospect au statut Intéressé (ou éligible selon règles UI).",
      "Droits CRM + commercial pour créer le client.",
    ],
    relatedGuideIds: [
      "crm-suivre-relancer",
      "ged-comprendre-acces",
      "com-hub-naviguer",
    ],
    status: "validated",
    updatedAt: "2026-10-22",
    difficulty: "intermediaire",
    viewPermission: "crm.access",
    objective:
      "Convertir correctement le dossier : client COM créé, statut CRM Client, lien fiche client.",
    steps: [
      {
        title: "Vérifier le statut",
        instruction:
          "Sur la fiche prospect, le statut doit permettre « Transformer en client » (dès Intéressé selon manuel).",
        href: "/crm/prospects",
      },
      {
        title: "Lancer la transformation",
        instruction:
          "Utilisez l’action Transformer en client et confirmez. Le système crée le client commercial et passe le statut CRM à Client.",
        expected:
          "Bandeau / lien vers la fiche client ; le dossier disparaît du listing Prospects (clients exclus).",
      },
      {
        title: "Poursuivre côté Commercial",
        instruction:
          "Ouvrez Clients (`/commercial/clients`) pour la fiche. Devis : vérifier l’état du gate Direction avant d’annoncer un parcours devis ouvert.",
        href: "/commercial/clients",
        caution:
          "Devis gelés temporairement (Direction 13/10) — ne pas documenter l’envoi devis comme disponible tant que le gate n’est pas levé.",
      },
    ],
    expectedResult:
      "Client COM existant, statut CRM Client, dossiers GED client créés si le flux l’automatise.",
    workflow: {
      title: "Conversion",
      nodes: [
        { id: "s", label: "Intéressé", kind: "start" },
        { id: "a", label: "Transformer", kind: "action" },
        { id: "b", label: "Client COM + CRM Client", kind: "action" },
        { id: "e", label: "Fiche client", kind: "end" },
      ],
      edges: [
        { from: "s", to: "a" },
        { from: "a", to: "b" },
        { from: "b", to: "e" },
      ],
    },
    sources: ["docs/manuels/05-crm.md", "docs/manuels/06-commercial.md"],
  },
];
