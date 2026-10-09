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
  const existing = await prisma.documentFolder.findUnique({
    where: { path },
    select: { id: true, name: true, code: true, path: true, parentId: true },
  });
  if (existing) return existing;

  return prisma.documentFolder.create({
    data: {
      parentId,
      name,
      code,
      path,
      year,
      createdById: createdById ?? null,
    },
    select: { id: true, name: true, code: true, path: true, parentId: true },
  });
}

/** Bootstrap racines année N — no-op rapide si déjà présent. */
export async function ensureYearTree(
  year = new Date().getFullYear(),
  createdById?: string,
) {
  const yearPath = `/${year}`;
  const existingRoot = await prisma.documentFolder.findUnique({
    where: { path: yearPath },
  });
  // Arbo déjà seedée (racine + au moins Clients) → skip
  if (existingRoot) {
    const clients = await prisma.documentFolder.findUnique({
      where: { path: `${yearPath}/03_CLIENTS` },
      select: { id: true },
    });
    if (clients) {
      return { yearRoot: existingRoot, roots: {} as Record<string, string> };
    }
  }

  const yearRoot = existingRoot
    ? existingRoot
    : await prisma.documentFolder.create({
        data: {
          name: String(year),
          code: String(year),
          path: yearPath,
          year,
          createdById: createdById ?? null,
        },
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
  const personPath = `${collabs.path}/${slug}`;
  const existing = await prisma.documentFolder.findUnique({
    where: { path: personPath },
  });
  if (existing) return existing;

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

/** Fil d’Ariane en 1 query (préfixes de path) au lieu de N round-trips. */
export async function getFolderBreadcrumb(folderId: string) {
  const folder = await prisma.documentFolder.findUnique({
    where: { id: folderId },
    select: { id: true, name: true, path: true },
  });
  if (!folder) return [];

  const segments = folder.path.split("/").filter(Boolean);
  const paths: string[] = [];
  let acc = "";
  for (const seg of segments) {
    acc += `/${seg}`;
    paths.push(acc);
  }

  const rows = await prisma.documentFolder.findMany({
    where: { path: { in: paths } },
    select: { id: true, name: true, path: true },
  });
  const byPath = new Map(rows.map((r) => [r.path, r]));
  return paths
    .map((p) => byPath.get(p))
    .filter((r): r is { id: string; name: string; path: string } => Boolean(r));
}

export async function findModelesFolder(
  type: "Devis" | "Factures",
  year = new Date().getFullYear(),
) {
  const path = `/${year}/04_MODELES/${type}`;
  const existing = await prisma.documentFolder.findUnique({ where: { path } });
  if (existing) return existing;
  await ensureYearTree(year);
  return prisma.documentFolder.findUniqueOrThrow({ where: { path } });
}
