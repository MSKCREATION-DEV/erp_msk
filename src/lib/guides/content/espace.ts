import type { GuideInput } from "../types";
import { GUIDE_SHOTS } from "../shots";

export const espaceGuides: GuideInput[] = [
  {
    id: "espace-conges",
    title: "Demander un congé (Mon espace)",
    summary:
      "Soumettre une demande de congé depuis Mon espace — détail des libellés UI à confirmer.",
    moduleId: "espace",
    categories: ["procedure"],
    taskIds: ["demander", "creer"],
    roleIds: ["collaborateur"],
    keywords: ["congé", "leave", "espace", "demande"],
    prerequisites: [
      "Permission `self.leave.request`.",
      "Compte actif.",
    ],
    relatedGuideIds: ["demarrage-accueil"],
    status: "to_validate",
    updatedAt: "2026-10-22",
    difficulty: "debutant",
    viewPermission: "self.leave.request",
    objective:
      "Déposer une demande de congé visible pour la validation RH.",
    heroVisualId: "espace-hero",
    visuals: [
      {
        id: "espace-hero",
        kind: "screenshot",
        src: GUIDE_SHOTS.espace,
        alt: "Mon espace collaborateur",
        chromeTitle: "Mon espace",
        highlightNav: "Mon espace",
        callouts: [
          { n: 1, label: "Mon espace", zone: "sidebar" },
          { n: 2, label: "Congés / self-service", zone: "main" },
        ],
      },
    ],
    steps: [
      {
        title: "Ouvrir Mon espace",
        instruction: "Sidebar → Mon espace.",
        navPath: "Sidebar → Mon espace",
        href: "/espace",
        visualId: "espace-hero",
      },
      {
        title: "Aller sur Congés",
        instruction: "Ouvrez la section Congés.",
        href: "/espace/conges",
        caution:
          "À valider : libellé exact du bouton de soumission et champs obligatoires sur l’écran courant.",
        visualId: "espace-hero",
      },
      {
        title: "Saisir et soumettre",
        instruction:
          "Renseignez la période et les informations demandées, puis soumettez. Un état pending doit être visible pendant l’envoi.",
        expected:
          "Demande enregistrée — validation côté RH selon `rh.leave.validate` (parcours admin RH).",
      },
    ],
    expectedResult:
      "Demande listée dans Mon espace ; statut dépendant du workflow RH (à confirmer sur UI).",
    troubleshooting: [
      {
        problem: "Mon espace absent de la sidebar",
        cause: "Pack sans `self.leave.request`.",
        check: "Chips Accueil / packs attribués.",
        solution: "Demander le pack Collaborateur (ou équivalent).",
        escalate: "Admin plateforme.",
      },
    ],
    sources: [
      "src/lib/nav.ts",
      "src/lib/rbac/catalog.ts",
      "docs/manuels/09-rh.md",
    ],
  },
];
