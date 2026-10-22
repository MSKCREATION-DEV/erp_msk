import { guideRoleSchema, type GuideRole } from "./types";

/**
 * Parcours documentaires — ids = codes packs / groupes réels (`rbac/labels`).
 * Descriptions métier alignées packs seed ; limites confirmées par catalogue permissions.
 */
const raw: GuideRole[] = [
  {
    id: "collaborateur",
    label: "Collaborateur",
    kind: "pack",
    mission:
      "Utiliser l’ERP au quotidien : accueil, GED scoped, Mon espace, signature perso.",
    moduleIds: ["accueil", "ged", "espace", "organisation"],
    limits: [
      "Pas d’accès Commercial / RH admin / Compta sans autre pack.",
      "GED limitée aux dossiers métier du pack (sans `ged.browse`).",
    ],
  },
  {
    id: "commercial",
    label: "Commercial",
    kind: "pack",
    mission:
      "Prospecter, relancer, transformer en client, piloter son activité (périmètre own selon droits).",
    moduleIds: ["commercial", "catalogue", "ged", "accueil"],
    limits: [
      "Vue Équipe / import / scripts manage réservés au pack Admin CRM.",
      "Lecture partagée des prospects ; écriture réservée au suivi affecté.",
    ],
  },
  {
    id: "admin_crm",
    label: "Admin CRM",
    kind: "pack",
    mission:
      "Piloter l’équipe commerciale : vue équipe, affectations, import, scripts, catalogue.",
    moduleIds: ["commercial", "catalogue", "ged"],
    limits: [
      "Élargit aussi la GED (browse) — à n’attribuer qu’aux leads.",
    ],
  },
  {
    id: "comptable",
    label: "Comptable",
    kind: "pack",
    mission: "Saisir, valider et consulter la comptabilité et les banques.",
    moduleIds: ["comptabilite", "ged", "commercial"],
    limits: ["Pas de gestion IAM utilisateurs sans pack admin plateforme."],
  },
  {
    id: "admin_compta",
    label: "Admin Compta",
    kind: "pack",
    mission: "Configurer le plan, clôtures, fiscalité et supervision comptable.",
    moduleIds: ["comptabilite"],
    limits: [],
  },
  {
    id: "admin_rh",
    label: "Admin RH",
    kind: "pack",
    mission: "Gérer collaborateurs, contrats, validations congés/heures, paie.",
    moduleIds: ["rh", "espace", "administration"],
    limits: [],
  },
  {
    id: "stock",
    label: "Stock",
    kind: "pack",
    mission: "Gérer articles, mouvements, achats et alertes.",
    moduleIds: ["stocks", "patrimoine", "anomalies"],
    limits: [],
  },
  {
    id: "projets",
    label: "Projets",
    kind: "pack",
    mission: "Suivre les projets et anomalies liées.",
    moduleIds: ["projets", "anomalies"],
    limits: [],
  },
  {
    id: "direction",
    label: "Direction",
    kind: "group",
    mission: "Pilotage transverse : lecture étendue, validations et reports.",
    moduleIds: [
      "accueil",
      "commercial",
      "comptabilite",
      "rh",
      "organisation",
      "ged",
    ],
    limits: [
      "Super Admin réservé (ex. bootstrap) — ne pas confondre avec Direction.",
    ],
  },
  {
    id: "admin_plateforme",
    label: "Admin plateforme",
    kind: "pack",
    mission: "IAM, charte, gabarits, signatures admin, configuration.",
    moduleIds: ["administration", "accueil", "ged"],
    limits: [
      "Ne jamais réécrire le MDP Auth d’un compte ACTIVE hors reset UI.",
    ],
  },
  {
    id: "super_admin",
    label: "Super Admin",
    kind: "special",
    mission: "Bypass total des permissions (hors résolution packs).",
    moduleIds: [],
    limits: ["Usage restreint — pas un profil métier quotidien."],
  },
];

export const GUIDE_ROLES: GuideRole[] = raw.map((r) => guideRoleSchema.parse(r));

export function getGuideRole(id: string): GuideRole | undefined {
  return GUIDE_ROLES.find((r) => r.id === id);
}
