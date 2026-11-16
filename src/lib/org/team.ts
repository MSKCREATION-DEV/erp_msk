/**
 * Équipe MSK — source vérité seed + organigramme.
 * Photos : `public/team/*.jpg` (fallback UI) ; source runtime = avatar GED RH.
 * E-mails : `initiale.nom@mskcreation.net`
 * Hiérarchie (nov. 2026) :
 *   L0 Mathieu · Isdalinia
 *   L1 Andile · Ismaël
 *   L2 Guiro
 *   L3 Espoir
 *   L4 Yaye · Fatimatou · Djouldé · Eric
 */
export type TeamMemberDef = {
  key: string;
  fullName: string;
  title: string;
  email: string;
  photoPath: string | null;
  parentKey: string | null;
  sortOrder: number;
  level: number;
};

/** Ordre d’affichage organigramme (niveaux 0→4). */
export const ORG_LEVEL_KEYS: readonly (readonly string[])[] = [
  ["mathieu", "isdalinia"],
  ["andile", "ismael"],
  ["guiro"],
  ["espoir"],
  ["yaye", "fatimatou", "djoulede", "eric"],
] as const;

/** `a.guiro@mskcreation.net` ← première lettre du prénom + nom de famille. */
export function mskEmail(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0] ?? "x";
  const last = parts[parts.length - 1] ?? first;
  const initial = slugify(first).charAt(0) || "x";
  const family = slugify(last) || "msk";
  return `${initial}.${family}@mskcreation.net`;
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export const MSK_TEAM: TeamMemberDef[] = [
  {
    key: "mathieu",
    fullName: "Mathieu Diarra",
    title: "Fondateur",
    email: mskEmail("Mathieu Diarra"),
    photoPath: "/team/mathieu-diarra.jpg",
    parentKey: null,
    sortOrder: 0,
    level: 0,
  },
  {
    key: "isdalinia",
    fullName: "Isdalinia Boisseaux",
    title: "Co-fondatrice & Designer",
    email: mskEmail("Isdalinia Boisseaux"),
    photoPath: "/team/isdalinia-boisseaux.jpg",
    parentKey: null,
    sortOrder: 1,
    level: 0,
  },
  {
    key: "andile",
    fullName: "Andile Boussari",
    title: "Chef de Projet",
    email: mskEmail("Andile Boussari"),
    photoPath: "/team/andile-boussari.jpg",
    parentKey: "mathieu",
    sortOrder: 10,
    level: 1,
  },
  {
    key: "ismael",
    fullName: "Ismaël Oussi",
    title: "Directeur Technique",
    email: mskEmail("Ismaël Oussi"),
    photoPath: "/team/ismael-oussi.jpg",
    parentKey: "isdalinia",
    sortOrder: 11,
    level: 1,
  },
  {
    key: "guiro",
    fullName: "Amadou Samba Guiro",
    title: "Développeur Web & Mobile",
    email: mskEmail("Amadou Samba Guiro"),
    photoPath: "/team/amadou-samba-guiro.jpg",
    parentKey: "andile",
    sortOrder: 20,
    level: 2,
  },
  {
    key: "espoir",
    fullName: "Espoir Lidaou Awesso",
    title: "Monteur Vidéo",
    email: mskEmail("Espoir Lidaou Awesso"),
    photoPath: "/team/lidaou-espoir-awesso.jpg",
    parentKey: "guiro",
    sortOrder: 30,
    level: 3,
  },
  {
    key: "yaye",
    fullName: "Yaye Bah",
    title: "Stagiaire Commerciale",
    email: mskEmail("Yaye Bah"),
    photoPath: "/team/yaye-bah.jpg",
    parentKey: "espoir",
    sortOrder: 40,
    level: 4,
  },
  {
    key: "fatimatou",
    fullName: "Fatimatou Diallo",
    title: "Graphiste",
    email: mskEmail("Fatimatou Diallo"),
    photoPath: "/team/fatimatou-diallo.jpg",
    parentKey: "espoir",
    sortOrder: 41,
    level: 4,
  },
  {
    key: "djoulede",
    fullName: "Djouldé Keita",
    title: "Stagiaire Community",
    email: mskEmail("Djouldé Keita"),
    photoPath: "/team/djoulede-keita.jpg",
    parentKey: "espoir",
    sortOrder: 42,
    level: 4,
  },
  {
    key: "eric",
    fullName: "Eric Wilfried Golo",
    title: "Monteur Vidéo",
    email: mskEmail("Eric Wilfried Golo"),
    photoPath: "/team/eric-wilfried-golo.jpg",
    parentKey: "espoir",
    sortOrder: 43,
    level: 4,
  },
];
