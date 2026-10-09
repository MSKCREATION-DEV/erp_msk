import type { CrmSource } from "@prisma/client";

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

Je suis {{commercial}} chez MSK CREATION. J’ai vu le compte de {{entreprise}} — super contenu !

On aide les marques comme la vôtre à structurer leur présence (site, réseaux, image). Seriez-vous dispo pour un échange de 10 min cette semaine ?`,
    tips: "Personnaliser avec un détail réel du feed. Éviter le spam.",
    sortOrder: 10,
  },
  {
    code: "li_premier_contact",
    channel: "LINKEDIN",
    title: "Premier contact LinkedIn",
    body: `Bonjour {{prenom}},

Je suis {{commercial}}, MSK CREATION (Bamako / remote). Nous accompagnons les entreprises sur l’image de marque et la présence digitale.

Concernant {{entreprise}}, je pensais à une offre {{offre}}. Auriez-vous 15 minutes pour en parler ?`,
    tips: "Message InMail court. Relancer J+3 si pas de réponse.",
    sortOrder: 20,
  },
  {
    code: "wa_relance_j3",
    channel: "WHATSAPP",
    title: "Relance WhatsApp J+3",
    body: `Bonjour {{prenom}}, c’est {{commercial}} (MSK CREATION).

Je vous avais contacté au sujet de {{offre}} pour {{entreprise}}. Toujours d’actualité de votre côté ?`,
    tips: "Ton cordial, une seule question claire.",
    sortOrder: 30,
  },
  {
    code: "tel_qualification",
    channel: "TELEPHONE",
    title: "Script appel qualification",
    body: `1. Se présenter + rappel du contexte (source)
2. Besoin actuel de {{entreprise}} ?
3. Budget / délai ?
4. Proposition : {{offre}}
5. Prochaine étape (devis / RDV)`,
    tips: "Noter l’activité immédiatement après l’appel.",
    sortOrder: 40,
  },
];
