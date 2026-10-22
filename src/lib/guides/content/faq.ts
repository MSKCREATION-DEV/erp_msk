import type { GuideInput } from "../types";

export const faqGuides: GuideInput[] = [
  {
    id: "faq-acces-refuse",
    title: "Accès refusé ou module invisible",
    summary:
      "Comprendre redirections `acces_refuse` et absence d’entrée sidebar.",
    moduleId: "accueil",
    categories: ["faq", "depannage"],
    taskIds: ["depanner"],
    roleIds: [
      "collaborateur",
      "commercial",
      "direction",
      "admin_plateforme",
    ],
    keywords: [
      "accès",
      "refusé",
      "permission",
      "sidebar",
      "droit",
      "pack",
    ],
    prerequisites: [],
    relatedGuideIds: ["demarrage-accueil", "iam-inviter-utilisateur"],
    status: "validated",
    updatedAt: "2026-10-22",
    difficulty: "debutant",
    objective:
      "Diagnostiquer un refus d’accès sans modifier soi-même les permissions.",
    steps: [
      {
        title: "Lire le message",
        instruction:
          "Sur Accueil, un bandeau coral peut indiquer « Accès refusé pour cette zone » après `?error=acces_refuse`.",
        href: "/accueil",
      },
      {
        title: "Comparer avec la sidebar",
        instruction:
          "Seuls les modules dont vous avez la permission apparaissent. Un lien direct vers une URL non autorisée redirige.",
      },
      {
        title: "Faire attribuer le bon pack",
        instruction:
          "Transmettez à un admin : module souhaité + route tentée. L’admin ajuste groupes / packs / overrides — vous ne contournez pas le RBAC.",
      },
    ],
    expectedResult:
      "Soit le module apparaît après correction des droits, soit vous savez que le besoin n’est pas prévu pour votre profil.",
    troubleshooting: [
      {
        problem: "J’avais le module hier, plus aujourd’hui",
        cause: "Override DENY, retrait de pack, ou suspension partielle.",
        check: "Chips Accueil ; demander audit accès à l’admin.",
        solution: "Correction packs/overrides par Admin plateforme.",
        escalate: "Admin plateforme — indiquer date et module.",
      },
    ],
    sources: ["src/lib/auth/session.ts", "src/components/app/sidebar.tsx"],
  },
  {
    id: "faq-mot-de-passe",
    title: "Mot de passe et reset",
    summary:
      "Premier login (invitation), changement obligatoire, et demande de reset.",
    moduleId: "accueil",
    categories: ["faq", "depannage"],
    taskIds: ["depanner", "demander"],
    roleIds: ["collaborateur", "admin_plateforme"],
    keywords: ["mot de passe", "reset", "invitation", "MUST_CHANGE"],
    prerequisites: [],
    relatedGuideIds: ["iam-inviter-utilisateur", "demarrage-accueil"],
    status: "validated",
    updatedAt: "2026-10-22",
    difficulty: "debutant",
    objective:
      "Savoir quel parcours utiliser selon votre statut compte, sans demander un reset Auth hors UI.",
    steps: [
      {
        title: "Premier accès après invitation",
        instruction:
          "Statuts INVITE_PENDING / MUST_CHANGE_PASSWORD : la connexion redirige vers le changement de mot de passe obligatoire.",
        href: "/changer-mot-de-passe",
      },
      {
        title: "Compte déjà actif — oubli",
        instruction:
          "Utilisez le parcours de demande de reset prévu (hors self-service forcé). Raccourci Accueil « Aide mot de passe » → `/demande-reset` si disponible.",
        href: "/demande-reset",
      },
      {
        title: "Admin — reset pour un tiers",
        instruction:
          "Sur la fiche utilisateur → Sécurité → Reset MDP (permission `users.reset_password`). Ne pas réécrire le MDP hors ce parcours pour un compte ACTIVE.",
        caution: "Règle sécurité absolue Auth — jamais via seed après activation.",
      },
    ],
    expectedResult:
      "Accès rétabli via le flux adapté au statut, sans contournement Auth.",
    sources: [
      "docs/manuels/01-iam-droits.md",
      ".cursor/rules/auth-password-safety.mdc",
    ],
  },
];
