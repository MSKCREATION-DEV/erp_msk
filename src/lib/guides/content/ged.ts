import type { GuideInput } from "../types";
import { GUIDE_SHOTS } from "../shots";

export const gedGuides: GuideInput[] = [
  {
    id: "ged-comprendre-acces",
    title: "Comprendre son accès GED",
    summary:
      "Distinguer GED scoped (`view_scoped`) et parcours complet (`browse`).",
    moduleId: "ged",
    categories: ["prise-en-main"],
    taskIds: ["consulter", "naviguer"],
    roleIds: ["collaborateur", "commercial", "comptable", "direction"],
    keywords: ["GED", "dossier", "scoped", "browse", "documents"],
    prerequisites: ["Permission `ged.view_scoped` (ou `ged.browse`)."],
    relatedGuideIds: ["demarrage-accueil", "crm-transformer-client"],
    status: "validated",
    updatedAt: "2026-10-22",
    difficulty: "debutant",
    viewPermission: "ged.view_scoped",
    objective:
      "Savoir pourquoi certains dossiers n’apparaissent pas et quand demander un élargissement de droits.",
    heroVisualId: "ged-hero",
    visuals: [
      {
        id: "ged-hero",
        kind: "screenshot",
        src: GUIDE_SHOTS.ged,
        alt: "Espace GED",
        chromeTitle: "GED",
        highlightNav: "GED",
        callouts: [
          { n: 1, label: "Entrée GED", zone: "sidebar" },
          { n: 2, label: "Dossiers visibles (scope)", zone: "main" },
        ],
      },
    ],
    steps: [
      {
        title: "Ouvrir la GED",
        instruction: "Dans la sidebar, cliquez sur GED.",
        navPath: "Sidebar → GED",
        href: "/ged",
        expected: "Hub dossiers / documents selon votre scope.",
        visualId: "ged-hero",
      },
      {
        title: "Identifier votre mode",
        instruction:
          "Sans `ged.browse`, vous voyez uniquement les dossiers métier liés à votre pack (ex. commercial : Clients/, Commercial/, votre dossier Collaborateurs). Avec `ged.browse`, l’arborescence est complète.",
        caution:
          "Ne pas conclure à un bug si Comptabilité / Modèles sont absents en mode scoped.",
        visualId: "ged-hero",
      },
      {
        title: "Naviguer dans un dossier",
        instruction:
          "Ouvrez un dossier (URL du type `/ged?folder=<id>`). Dépôt et suppression dépendent des droits `ged.upload`, `ged.delete`, etc.",
        href: "/ged",
        visualId: "ged-hero",
      },
    ],
    expectedResult:
      "Vous savez expliquer la différence scoped / browse et ce que votre pack autorise.",
    bestPractices: [
      "Les PDF devis/factures commercial se déposent sous `Clients/{Client}/…` automatiquement quand le flux COM est actif.",
      "Soft-delete → statut TRASH — pas une suppression définitive immédiate.",
    ],
    troubleshooting: [
      {
        problem: "Je ne vois pas un dossier client attendu",
        cause:
          "Scope pack, client non créé, ou dossier non généré / hors racines visibles.",
        check:
          "Vérifier que le client commercial existe et votre pack GED.",
        solution:
          "Ouvrir depuis la fiche client si disponible, ou demander `ged.browse` / correction pack à un admin.",
        escalate: "Admin CRM ou Admin plateforme.",
      },
    ],
    sources: ["docs/manuels/02-ged.md", "src/lib/rbac/catalog.ts"],
  },
];
