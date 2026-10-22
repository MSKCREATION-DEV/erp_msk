import type { GuideInput } from "../types";
import { GUIDE_SHOTS } from "../shots";

export const demarrageGuides: GuideInput[] = [
  {
    id: "demarrage-accueil",
    title: "Premiers pas dans l’ERP",
    summary:
      "Comprendre l’accueil, vos packs/groupes et comment ouvrir le centre de guides.",
    moduleId: "accueil",
    categories: ["prise-en-main"],
    taskIds: ["naviguer", "consulter"],
    roleIds: ["collaborateur", "commercial", "direction", "admin_plateforme"],
    keywords: ["accueil", "onboarding", "packs", "groupes", "guides"],
    prerequisites: [
      "Compte ACTIVE (mot de passe déjà défini après invitation).",
      "Permission `home.view` (présente sur tous les packs standards).",
    ],
    relatedGuideIds: ["ged-comprendre-acces", "faq-acces-refuse"],
    status: "validated",
    updatedAt: "2026-10-22",
    difficulty: "debutant",
    objective:
      "Savoir lire votre identité sur l’accueil, identifier vos capacités (chips) et accéder à l’aide.",
    heroVisualId: "accueil-hero",
    visuals: [
      {
        id: "accueil-hero",
        kind: "screenshot",
        src: GUIDE_SHOTS.accueil,
        alt: "Page Accueil ERP MSK",
        chromeTitle: "Accueil",
        highlightNav: "Accueil",
        callouts: [
          { n: 1, label: "Bonjour + chips packs", zone: "header" },
          { n: 2, label: "Raccourcis", zone: "main" },
        ],
      },
      {
        id: "accueil-guides",
        kind: "screenshot",
        src: GUIDE_SHOTS.guidesHome,
        alt: "Centre de guides",
        chromeTitle: "Guides",
        highlightNav: "Guides",
        callouts: [
          { n: 1, label: "Recherche", zone: "header" },
          { n: 2, label: "Parcours", zone: "main" },
        ],
      },
      {
        id: "accueil-nav",
        kind: "schematic",
        alt: "Sidebar Accueil et Guides",
        chromeTitle: "ERP MSK",
        highlightNav: "Guides",
        callouts: [{ n: 1, label: "Ouvrir Guides", zone: "sidebar" }],
      },
    ],
    steps: [
      {
        title: "Ouvrir l’accueil",
        instruction:
          "Après connexion, vous arrivez sur Accueil. Le titre affiche votre prénom.",
        navPath: "Sidebar → Accueil",
        href: "/accueil",
        expected: "Page Accueil avec fil d’Ariane MSK / Accueil.",
        visualId: "accueil-hero",
      },
      {
        title: "Lire vos rôles affichés",
        instruction:
          "Sous le titre, des pastilles indiquent Super Admin (si applicable), vos groupes, puis les packs directs non déjà hérités du groupe.",
        expected:
          "Vous reconnaissez au moins un groupe ou pack (ex. Collaborateur, Commerciaux).",
        visualId: "accueil-hero",
      },
      {
        title: "Utiliser les raccourcis",
        instruction:
          "La section Raccourcis propose des liens selon vos droits (Utilisateurs si admin, Guides, aide mot de passe).",
        href: "/guides",
        uiTarget: "Centre de guides",
        visualId: "accueil-hero",
      },
      {
        title: "Ouvrir le centre de guides",
        instruction:
          "Dans la barre latérale, cliquez sur Guides, ou utilisez le raccourci Accueil.",
        navPath: "Sidebar → Guides",
        href: "/guides",
        expected: "Page d’accueil du centre de guides avec recherche.",
        visualId: "accueil-guides",
      },
    ],
    expectedResult:
      "Vous savez où voir vos droits affichés et où chercher une procédure sans solliciter l’assistance.",
    bestPractices: [
      "Si un module attendu n’apparaît pas dans la sidebar, vérifier packs/groupes avec un admin (ne pas inventer de droit).",
      "Préférez la recherche Guides par tâche (« créer prospect ») plutôt que de mémoriser toutes les routes.",
    ],
    troubleshooting: [
      {
        problem: "Message « Accès refusé pour cette zone » sur l’accueil",
        cause:
          "Redirection après tentative d’accès à une route sans permission (`?error=acces_refuse`).",
        check: "Vérifier l’URL et les modules visibles dans la sidebar.",
        solution:
          "Revenir à un module autorisé ou demander l’attribution du pack adapté.",
        escalate: "Admin plateforme / Direction — indiquer la route tentée.",
      },
    ],
    sources: ["src/app/(app)/accueil/page.tsx", "src/lib/rbac/labels.ts"],
  },
];
