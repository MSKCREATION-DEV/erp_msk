import { prisma } from "@/lib/prisma";
import {
  COLLAB_SUBFOLDERS,
  COMPTA_MENSUELLE_CHILDREN,
  MODELES_CHILDREN,
  YEAR_ROOT_FOLDERS,
  collabFolderSlug,
} from "@/lib/ged/constants";

async function ensureChild(
  parentId: string,
  parentPath: string,
  code: string,
  name: string,
  year: number,
  createdById?: string | null,
) {
  const path = `${parentPath}/${code}`;
  return prisma.documentFolder.upsert({
    where: { path },
    create: {
      parentId,
      name,
      code,
      path,
      year,
      createdById: createdById ?? null,
    },
    update: { name },
  });
}

/** Bootstrap racines année N (idempotent). */
export async function ensureYearTree(year = new Date().getFullYear(), createdById?: string) {
  const yearPath = `/${year}`;
  const yearRoot = await prisma.documentFolder.upsert({
    where: { path: yearPath },
    create: {
      name: String(year),
      code: String(year),
      path: yearPath,
      year,
      createdById: createdById ?? null,
    },
    update: {},
  });

  const roots: Record<string, string> = {};
  for (const f of YEAR_ROOT_FOLDERS) {
    const row = await ensureChild(
      yearRoot.id,
      yearRoot.path,
      f.code,
      f.name,
      year,
      createdById,
    );
    roots[f.code] = row.id;
  }

  const modeles = await prisma.documentFolder.findUniqueOrThrow({
    where: { path: `${yearPath}/04_MODELES` },
  });
  for (const c of MODELES_CHILDREN) {
    await ensureChild(modeles.id, modeles.path, c.code, c.name, year, createdById);
  }

  const comptaM = await prisma.documentFolder.findUniqueOrThrow({
    where: { path: `${yearPath}/02_COMPTABILITE_MENSUELLE` },
  });
  for (const c of COMPTA_MENSUELLE_CHILDREN) {
    await ensureChild(comptaM.id, comptaM.path, c.code, c.name, year, createdById);
  }

  return { yearRoot, roots };
}

/** Dossier collaborateur + sous-dossiers de base. */
export async function ensureCollaboratorFolders(
  firstName: string,
  lastName: string,
  year = new Date().getFullYear(),
  createdById?: string,
) {
  await ensureYearTree(year, createdById);
  const collabs = await prisma.documentFolder.findUniqueOrThrow({
    where: { path: `/${year}/05_COLLABORATEURS` },
  });
  const slug = collabFolderSlug(lastName, firstName);
  const person = await ensureChild(
    collabs.id,
    collabs.path,
    slug,
    `${lastName} ${firstName}`,
    year,
    createdById,
  );
  for (const s of COLLAB_SUBFOLDERS) {
    await ensureChild(person.id, person.path, s.code, s.name, year, createdById);
  }
  return person;
}

export async function getFolderBreadcrumb(folderId: string) {
  const crumbs: { id: string; name: string; path: string }[] = [];
  let current = await prisma.documentFolder.findUnique({ where: { id: folderId } });
  while (current) {
    crumbs.unshift({ id: current.id, name: current.name, path: current.path });
    if (!current.parentId) break;
    current = await prisma.documentFolder.findUnique({
      where: { id: current.parentId },
    });
  }
  return crumbs;
}

export async function findModelesFolder(
  type: "Devis" | "Factures",
  year = new Date().getFullYear(),
) {
  await ensureYearTree(year);
  return prisma.documentFolder.findUniqueOrThrow({
    where: { path: `/${year}/04_MODELES/${type}` },
  });
}
