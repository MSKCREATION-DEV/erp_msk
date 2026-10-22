import type { GuideInput } from "../types";
import { GUIDE_SHOTS } from "../shots";

export const iamGuides: GuideInput[] = [
  {
    id: "iam-inviter-utilisateur",
    title: "Inviter un collaborateur",
    summary:
      "Créer un compte, attribuer groupes/packs et envoyer l’invitation e-mail.",
    moduleId: "administration",
    categories: ["procedure"],
    taskIds: ["creer", "envoyer"],
    roleIds: ["admin_plateforme", "direction"],
    keywords: [
      "invitation",
      "utilisateur",
      "packs",
      "groupes",
      "IAM",
      "Resend",
    ],
    prerequisites: [
      "Permission `users.create` (et `users.view` pour la liste).",
      "Composition packs/groupes connue (voir manuel IAM).",
    ],
    relatedGuideIds: ["demarrage-accueil", "faq-mot-de-passe"],
    status: "validated",
    updatedAt: "2026-10-22",
    difficulty: "intermediaire",
    viewPermission: "users.create",
    objective:
      "Provisionner un compte correctement packagé sans réécrire un mot de passe d’un compte déjà actif.",
    heroVisualId: "users-list",
    visuals: [
      {
        id: "users-list",
        kind: "screenshot",
        src: GUIDE_SHOTS.adminUsers,
        alt: "Liste des utilisateurs",
        chromeTitle: "Utilisateurs",
        highlightNav: "Utilisateurs",
        callouts: [
          { n: 1, label: "Liste comptes", zone: "table" },
          { n: 2, label: "Inviter", zone: "cta" },
        ],
      },
    ],
    steps: [
      {
        title: "Ouvrir la liste utilisateurs",
        instruction: "Accédez à Administration → Utilisateurs.",
        navPath: "Sidebar → Utilisateurs",
        href: "/administration/utilisateurs",
        expected: "Liste des comptes provisionnés.",
        visualId: "users-list",
      },
      {
        title: "Lancer l’invitation",
        instruction: "Ouvrez la page dédiée d’invitation (CTA Nouveau / Inviter).",
        href: "/administration/utilisateurs/inviter",
        uiTarget: "Inviter",
        expected: "Formulaire d’identité + groupes/packs.",
        visualId: "users-list",
      },
      {
        title: "Renseigner identité et droits",
        instruction:
          "Saisissez l’identité, choisissez les groupes (pack défaut) et packs directs nécessaires — pas plus.",
        caution:
          "Un pack `admin_crm` en trop élargit GED et catalogue. Commercial terrain : groupes collaborateur + commerciaux, sans pack admin_crm.",
      },
      {
        title: "Envoyer",
        instruction:
          "Soumettez : compte Auth créé, e-mail d’invitation (Resend), statut INVITE_PENDING.",
        expected:
          "Le collaborateur change son mot de passe au premier login ; dossier GED collaborateur créé automatiquement.",
      },
    ],
    expectedResult:
      "Compte visible en liste avec statut d’invitation / must-change, e-mail parti.",
    workflow: {
      title: "Cycle invitation",
      nodes: [
        { id: "s", label: "Admin invite", kind: "start" },
        { id: "a", label: "Auth + e-mail", kind: "action" },
        { id: "b", label: "INVITE_PENDING", kind: "action" },
        { id: "c", label: "Changer MDP", kind: "action" },
        { id: "e", label: "ACTIVE", kind: "end" },
      ],
      edges: [
        { from: "s", to: "a" },
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "c", to: "e" },
      ],
    },
    bestPractices: [
      "Ne jamais réécrire le MDP Auth d’un compte ACTIVE hors parcours Reset MDP UI.",
      "Documenter la composition packs dans le ticket d’onboarding.",
    ],
    troubleshooting: [
      {
        problem: "L’utilisateur ne reçoit pas l’e-mail",
        cause: "Problème Resend / spam / adresse erronée.",
        check: "Vérifier l’e-mail saisi et les logs d’envoi côté admin.",
        solution: "Corriger l’adresse ou renvoyer via le parcours admin prévu.",
        escalate: "Admin plateforme — sans exposer de secrets SMTP.",
      },
    ],
    sources: ["docs/manuels/01-iam-droits.md"],
  },
];
