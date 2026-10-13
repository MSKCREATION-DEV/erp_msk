import type { CrmSource } from "@prisma/client";

/** Parité feuille Excel « SCRIPTS » — variables {{…}}. */
export const CRM_SCRIPTS_SEED: {
  code: string;
  channel: CrmSource;
  title: string;
  body: string;
  tips?: string;
  sortOrder: number;
}[] = [
  {
    code: "ig_premier_contact",
    channel: "INSTAGRAM",
    title: "Premier contact Instagram",
    body: `Bonjour {{prenom}} 👋

J’ai vu votre activité dans {{secteur}} — vraiment inspirant ce que vous construisez.

Je m’appelle {{commercial}}, je dirige MSK CREATION, une agence digitale basée à {{ville}}.
On aide des entreprises comme la vôtre à {{resultat}}.

Est-ce que c’est quelque chose qui vous intéresse en ce moment ?`,
    tips: "Adapter : prénom · secteur · résultat concret. Envoyer le matin entre 8h et 10h.",
    sortOrder: 10,
  },
  {
    code: "li_premier_contact",
    channel: "LINKEDIN",
    title: "Premier contact LinkedIn",
    body: `Bonjour {{prenom}},

J’ai vu votre profil et votre parcours dans {{secteur}} m’a beaucoup intéressé.

Je dirige MSK CREATION — agence digitale Mali/Togo/France spécialisée en création de sites web, vidéos et stratégie digitale.

Nous aidons des entreprises comme la vôtre à renforcer leur présence en ligne et à attirer plus de clients.

Seriez-vous disponible pour un échange rapide de 15 minutes cette semaine ?

Bien cordialement,
{{commercial}} — MSK CREATION`,
    tips: "Toujours personnaliser avec le secteur et 1 détail vu sur le profil. Ne pas pitcher immédiatement.",
    sortOrder: 20,
  },
  {
    code: "wa_premier_contact",
    channel: "WHATSAPP",
    title: "Premier contact WhatsApp",
    body: `Bonjour {{prenom}}, c’est {{commercial}} de MSK CREATION 👋

On crée des sites web professionnels et des contenus vidéo pour les entreprises.

J’ai vu votre activité sur {{source}} et je pense qu’on pourrait vous aider à attirer plus de clients en ligne.

Est-ce que vous avez 5 minutes pour en parler ?`,
    tips: "Court et direct. Maximum 5 lignes. Envoyer entre 9h et 11h ou 14h et 16h.",
    sortOrder: 30,
  },
  {
    code: "relance_j3",
    channel: "WHATSAPP",
    title: "Relance 1 — J+3",
    body: `Bonjour {{prenom}},

Je voulais juste m’assurer que vous avez bien reçu mon message de {{jour}}.

Je reste disponible si vous souhaitez qu’on en discute 🙂

Bonne journée !`,
    tips: "Court, neutre, sans pression. Juste un rappel poli.",
    sortOrder: 40,
  },
  {
    code: "relance_j7",
    channel: "LINKEDIN",
    title: "Relance 2 — J+7 (changer de canal)",
    body: `Bonjour {{prenom}},

Je me permets de vous recontacter concernant {{offre}}.

On vient justement de terminer {{exemple}} pour un client dans {{secteur}} — le résultat était vraiment bien.

Je serais ravi de vous montrer ce qu’on pourrait faire pour vous.
Dispo pour un appel de 10 min ?`,
    tips: "Apporter de la valeur : montrer un exemple concret. Changer de canal si possible (ex. IG → WA).",
    sortOrder: 50,
  },
  {
    code: "relance_j14",
    channel: "EMAIL",
    title: "Relance 3 — J+14 (dernière)",
    body: `Bonjour {{prenom}},

Je me permets de vous contacter une dernière fois au sujet de {{offre}}.

Si ce n’est pas le bon moment pour vous, je le comprends tout à fait.
Dans ce cas, n’hésitez pas à me recontacter quand le moment sera venu 🙂

Bonne continuation !`,
    tips: "Dernier contact sans forcer. Laisser la porte ouverte. Mettre en statut Perdu après cet envoi.",
    sortOrder: 60,
  },
  {
    code: "envoi_devis",
    channel: "EMAIL",
    title: "Envoi de devis",
    body: `Bonjour {{prenom}},

Suite à notre échange du {{date}}, je vous transmets le devis pour {{offre}}.

Ce devis comprend les éléments convenus ensemble.

Budget total : {{montant}}
Validité : 30 jours

Je reste disponible pour répondre à toutes vos questions.
Dans l’attente de votre retour,

{{commercial}}
MSK CREATION`,
    tips: "Envoyer dans les 2 heures après l’accord de principe. Toujours rappeler les éléments inclus.",
    sortOrder: 70,
  },
  {
    code: "tel_qualification",
    channel: "TELEPHONE",
    title: "Script appel qualification",
    body: `1. Se présenter + rappel du contexte ({{source}})
2. Besoin actuel de {{entreprise}} ?
3. Budget / délai ?
4. Proposition : {{offre}}
5. Prochaine étape (devis / RDV)`,
    tips: "Noter l’activité immédiatement après l’appel.",
    sortOrder: 80,
  },
];
