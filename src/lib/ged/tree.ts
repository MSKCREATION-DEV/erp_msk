import { DocStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  COLLAB_SUBFOLDERS,
  COMPTA_MENSUELLE_CHILDREN,
  MODELES_CHILDREN,
  YEAR_ROOT_FOLDERS,
  collabFolderSlug,
} from "@/lib/ged/constants";

export async function ensureChild(
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

  // Toujours assurer les racines (idempotent) — ex. 07_STOCKS_ACHATS ajouté en Phase 7A
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
  type: "Devis" | "Factures" | "Contrats" | "RH",
  year = new Date().getFullYear(),
) {
  const path = `/${year}/04_MODELES/${type}`;
  const existing = await prisma.documentFolder.findUnique({ where: { path } });
  if (existing) return existing;
  await ensureYearTree(year);
  const modeles = await prisma.documentFolder.findUniqueOrThrow({
    where: { path: `/${year}/04_MODELES` },
  });
  const meta = MODELES_CHILDREN.find((c) => c.code === type);
  if (meta) {
    await ensureChild(modeles.id, modeles.path, meta.code, meta.name, year);
  }
  return prisma.documentFolder.findUniqueOrThrow({ where: { path } });
}

/** Sous-dossier collaborateur (ex. 02_CONTRATS, 05_DIPLOMES…). */
export async function ensureCollaboratorSubfolder(
  firstName: string,
  lastName: string,
  subCode: (typeof COLLAB_SUBFOLDERS)[number]["code"],
  year = new Date().getFullYear(),
  createdById?: string,
) {
  const person = await ensureCollaboratorFolders(
    firstName,
    lastName,
    year,
    createdById,
  );
  const meta = COLLAB_SUBFOLDERS.find((s) => s.code === subCode);
  if (!meta) throw new Error(`Sous-dossier collab inconnu: ${subCode}`);
  return ensureChild(
    person.id,
    person.path,
    meta.code,
    meta.name,
    year,
    createdById,
  );
}

/** Code dossier dérivé du nom (unique sous le parent). */
export function folderCodeFromName(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()
    .slice(0, 48);
  return base || "DOSSIER";
}

/**
 * Crée un sous-dossier direct sous `parentId`.
 * `code` / `path` uniques ; collision → suffixe `_2`, `_3`…
 */
export async function createChildFolder(opts: {
  parentId: string;
  name: string;
  createdById?: string | null;
}) {
  const parent = await prisma.documentFolder.findUnique({
    where: { id: opts.parentId },
    select: { id: true, path: true, year: true },
  });
  if (!parent) throw new Error("Dossier parent introuvable");

  const { code, path } = await uniqueChildPath(parent.path, opts.name);

  return prisma.documentFolder.create({
    data: {
      parentId: parent.id,
      name: opts.name.trim(),
      code,
      path,
      year: parent.year,
      createdById: opts.createdById ?? null,
    },
    select: { id: true, name: true, code: true, path: true, parentId: true },
  });
}

/** Dossiers bootstrap / structure — non supprimables ; rename = nom seul. */
export function isProtectedFolder(folder: {
  path: string;
  code: string;
}): boolean {
  const segs = folder.path.split("/").filter(Boolean);
  if (segs.length <= 1) return true;
  if (
    segs.length === 2 &&
    YEAR_ROOT_FOLDERS.some((f) => f.code === folder.code)
  ) {
    return true;
  }
  if (
    MODELES_CHILDREN.some((c) => c.code === folder.code) &&
    segs.includes("04_MODELES")
  ) {
    return true;
  }
  if (
    COMPTA_MENSUELLE_CHILDREN.some((c) => c.code === folder.code) &&
    segs.includes("02_COMPTABILITE_MENSUELLE")
  ) {
    return true;
  }
  if (
    COLLAB_SUBFOLDERS.some((c) => c.code === folder.code) &&
    segs.includes("05_COLLABORATEURS")
  ) {
    return true;
  }
  return false;
}

async function uniqueChildPath(
  parentPath: string,
  name: string,
  excludeId?: string,
) {
  const baseCode = folderCodeFromName(name);
  let code = baseCode;
  let path = `${parentPath}/${code}`;
  let n = 2;
  while (true) {
    const existing = await prisma.documentFolder.findUnique({
      where: { path },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) break;
    code = `${baseCode}_${n}`;
    path = `${parentPath}/${code}`;
    n += 1;
    if (n > 99) throw new Error("Trop de dossiers similaires");
  }
  return { code, path };
}

/**
 * Renomme un dossier.
 * - Protégé : `name` uniquement (path/code stables).
 * - Libre : `name` + recalcul `code`/`path` + cascade descendants.
 */
export async function renameFolder(opts: { folderId: string; name: string }) {
  const name = opts.name.trim();
  const folder = await prisma.documentFolder.findUnique({
    where: { id: opts.folderId },
    select: {
      id: true,
      name: true,
      code: true,
      path: true,
      parentId: true,
    },
  });
  if (!folder) throw new Error("Dossier introuvable");

  if (isProtectedFolder(folder)) {
    return prisma.documentFolder.update({
      where: { id: folder.id },
      data: { name },
      select: { id: true, name: true, code: true, path: true, parentId: true },
    });
  }

  if (!folder.parentId) {
    return prisma.documentFolder.update({
      where: { id: folder.id },
      data: { name },
      select: { id: true, name: true, code: true, path: true, parentId: true },
    });
  }

  const parent = await prisma.documentFolder.findUniqueOrThrow({
    where: { id: folder.parentId },
    select: { path: true },
  });

  const { code, path: newPath } = await uniqueChildPath(
    parent.path,
    name,
    folder.id,
  );

  if (newPath === folder.path) {
    return prisma.documentFolder.update({
      where: { id: folder.id },
      data: { name, code },
      select: { id: true, name: true, code: true, path: true, parentId: true },
    });
  }

  const oldPath = folder.path;
  const descendants = await prisma.documentFolder.findMany({
    where: { path: { startsWith: `${oldPath}/` } },
    select: { id: true, path: true },
  });

  const all = [
    { id: folder.id, path: oldPath, isRoot: true as const },
    ...descendants.map((d) => ({
      id: d.id,
      path: d.path,
      isRoot: false as const,
    })),
  ].sort((a, b) => b.path.length - a.path.length);

  const stamp = `#rn${Date.now()}`;

  return prisma.$transaction(async (tx) => {
    for (const d of all) {
      await tx.documentFolder.update({
        where: { id: d.id },
        data: { path: `${d.path}${stamp}` },
      });
    }
    for (const d of all) {
      const finalPath = d.isRoot
        ? newPath
        : d.path.replace(oldPath, newPath);
      await tx.documentFolder.update({
        where: { id: d.id },
        data: d.isRoot
          ? { name, code, path: finalPath }
          : { path: finalPath },
      });
    }

    return tx.documentFolder.findUniqueOrThrow({
      where: { id: folder.id },
      select: { id: true, name: true, code: true, path: true, parentId: true },
    });
  });
}

/**
 * Supprime un dossier libre (non protégé) et sa sous-arborescence.
 * Documents du sous-arbre → soft-delete (TRASH) + déplacés vers le parent
 * (évite la perte hard-delete via cascade).
 */
export async function deleteFolderSubtree(folderId: string) {
  const folder = await prisma.documentFolder.findUnique({
    where: { id: folderId },
    select: { id: true, name: true, code: true, path: true, parentId: true },
  });
  if (!folder) throw new Error("Dossier introuvable");
  if (isProtectedFolder(folder)) {
    throw new Error("Ce dossier système ne peut pas être supprimé");
  }
  if (!folder.parentId) {
    throw new Error("La racine année ne peut pas être supprimée");
  }

  const subtree = await prisma.documentFolder.findMany({
    where: {
      OR: [{ id: folder.id }, { path: { startsWith: `${folder.path}/` } }],
    },
    select: { id: true },
  });
  const ids = subtree.map((f) => f.id);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.document.updateMany({
      where: { folderId: { in: ids } },
      data: {
        status: DocStatus.TRASH,
        softDeletedAt: now,
        folderId: folder.parentId!,
      },
    });
    await tx.documentFolder.delete({ where: { id: folder.id } });
  });

  return folder;
}
