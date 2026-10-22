import { guideTaskSchema, type GuideTask } from "./types";

const raw: GuideTask[] = [
  {
    id: "creer",
    label: "Créer",
    verb: "créer",
    description: "Créer une fiche, un document ou une demande.",
  },
  {
    id: "consulter",
    label: "Consulter",
    verb: "consulter",
    description: "Lire un tableau de bord, une liste ou une fiche.",
  },
  {
    id: "modifier",
    label: "Modifier",
    verb: "modifier",
    description: "Mettre à jour une information existante.",
  },
  {
    id: "suivre",
    label: "Suivre / relancer",
    verb: "suivre",
    description: "Assurer le suivi commercial ou opérationnel.",
  },
  {
    id: "transformer",
    label: "Transformer",
    verb: "transformer",
    description: "Faire évoluer un objet métier (ex. prospect → client).",
  },
  {
    id: "demander",
    label: "Demander",
    verb: "demander",
    description: "Soumettre une demande (congé, reset, suivi…).",
  },
  {
    id: "valider",
    label: "Valider",
    verb: "valider",
    description: "Approuver ou refuser une demande / écriture.",
  },
  {
    id: "envoyer",
    label: "Envoyer",
    verb: "envoyer",
    description: "Émettre un document vers un destinataire.",
  },
  {
    id: "telecharger",
    label: "Télécharger",
    verb: "télécharger",
    description: "Récupérer un fichier (PDF, GED).",
  },
  {
    id: "depanner",
    label: "Dépanner",
    verb: "dépanner",
    description: "Résoudre un blocage d’accès ou d’usage.",
  },
  {
    id: "naviguer",
    label: "Naviguer",
    verb: "naviguer",
    description: "Se repérer dans un module ou le hub.",
  },
];

export const GUIDE_TASKS: GuideTask[] = raw.map((t) => guideTaskSchema.parse(t));

export function getGuideTask(id: string): GuideTask | undefined {
  return GUIDE_TASKS.find((t) => t.id === id);
}
