/**
 * Équipe MSK — source vérité seed + organigramme.
 * Photos : `public/team/*.png`
 * E-mails : `initiale.nom@mskcreation.net`
 * Hiérarchie slide 05 (Assetou retiré) :
 *   L1 Mathieu · Isdalinia
 *   L2 Andile · Ismaël
 *   L3 Guiro
 *   L4 Issiaka · Madina
 *   L5 Yaye · Fatimatou · Espoir · Djouldé
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
  ["issiaka", "madina"],
  ["yaye", "fatimatou", "espoir", "djoulede"],
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
    photoPath: "/team/mathieu-diarra.png",
    parentKey: null,
    sortOrder: 0,
    level: 0,
  },
  {
    key: "isdalinia",
    fullName: "Isdalinia Boisseaux",
    title: "Co-fondatrice & Designer",
    email: mskEmail("Isdalinia Boisseaux"),
    photoPath: "/team/isdalinia-boisseaux.png",
    parentKey: null,
    sortOrder: 1,
    level: 0,
  },
  {
    key: "andile",
    fullName: "Andile Boussari",
    title: "Chef de Projet",
    email: mskEmail("Andile Boussari"),
    photoPath: "/team/andile-boussari.png",
    parentKey: "mathieu",
    sortOrder: 10,
    level: 1,
  },
  {
    key: "ismael",
    fullName: "Ismaël Oussi",
    title: "Directeur Technique",
    email: mskEmail("Ismaël Oussi"),
    photoPath: "/team/ismael-oussi.png",
    parentKey: "isdalinia",
    sortOrder: 11,
    level: 1,
  },
  {
    key: "guiro",
    fullName: "Amadou Samba Guiro",
    title: "Responsable Opérationnel – Mali · Développeur Full-Stack",
    email: mskEmail("Amadou Samba Guiro"),
    photoPath: "/team/amadou-samba-guiro.png",
    parentKey: "andile",
    sortOrder: 20,
    level: 2,
  },
  {
    key: "issiaka",
    fullName: "Issiaka Yacouba Traoré",
    title: "Responsable Administratif & Financier",
    email: mskEmail("Issiaka Yacouba Traoré"),
    photoPath: "/team/issiaka-yacouba-traore.png",
    parentKey: "guiro",
    sortOrder: 30,
    level: 3,
  },
  {
    key: "madina",
    fullName: "Madina Tall",
    title: "Assistante de direction",
    email: mskEmail("Madina Tall"),
    photoPath: "/team/madina-tall.png",
    parentKey: "guiro",
    sortOrder: 31,
    level: 3,
  },
  {
    key: "yaye",
    fullName: "Yaye Bah",
    title: "Stagiaire commerciale",
    email: mskEmail("Yaye Bah"),
    photoPath: "/team/yaye-bah.png",
    parentKey: "issiaka",
    sortOrder: 40,
    level: 4,
  },
  {
    key: "fatimatou",
    fullName: "Fatimatou Diallo",
    title: "Graphiste",
    email: mskEmail("Fatimatou Diallo"),
    photoPath: "/team/fatimatou-diallo.png",
    parentKey: "madina",
    sortOrder: 41,
    level: 4,
  },
  {
    key: "espoir",
    fullName: "Espoir Lidaou Awesso",
    title: "Monteur Vidéo",
    email: mskEmail("Espoir Lidaou Awesso"),
    photoPath: "/team/lidaou-espoir-awesso.png",
    parentKey: "madina",
    sortOrder: 42,
    level: 4,
  },
  {
    key: "djoulede",
    fullName: "Djouldé Keita",
    title: "Stagiaire Community",
    email: mskEmail("Djouldé Keita"),
    photoPath: "/team/djoulede-keita.png",
    parentKey: "issiaka",
    sortOrder: 43,
    level: 4,
  },
];
