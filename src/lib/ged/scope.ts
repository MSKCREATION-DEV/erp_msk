import type { SessionUser } from "@/lib/rbac/resolve";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { collabFolderSlug } from "@/lib/ged/constants";
import { folderCodeFromName } from "@/lib/ged/tree";

/** Parcours GED complet (admin / direction / compta…). */
export function hasFullGedBrowse(user: SessionUser): boolean {
  return user.isSuperAdmin || hasPermission(user, "ged.browse");
}

export function hasGedAccess(user: SessionUser): boolean {
  return (
    hasFullGedBrowse(user) || hasPermission(user, "ged.view_scoped")
  );
}

/**
 * Racines année visibles en mode scoped :
 * - Clients COM (filtrés ensuite)
 * - Son dossier Collaborateurs
 * Pas de Comptabilité / Modèles.
 */
const SCOPED_YEAR_ROOT_CODES = new Set(["03_CLIENTS", "05_COLLABORATEURS"]);

function yearFromPath(path: string): number | null {
  const m = path.match(/^\/(\d{4})(?:\/|$)/);
  return m ? Number(m[1]) : null;
}

/** Prefixe autorisé sous Collaborateurs pour cet utilisateur. */
export function ownCollabPathPrefix(
  user: SessionUser,
  year = new Date().getFullYear(),
): string {
  const slug = collabFolderSlug(user.lastName, user.firstName);
  return `/${year}/05_COLLABORATEURS/${slug}`;
}

/**
 * Codes dossiers client autorisés (ComClient own / global reports).
 */
export async function allowedClientFolderCodes(
  user: SessionUser,
): Promise<Set<string>> {
  const where =
    user.isSuperAdmin || hasPermission(user, "com.reports.view")
      ? {}
      : { ownerId: user.id };
  const clients = await prisma.comClient.findMany({
    where,
    select: { name: true },
  });
  return new Set(clients.map((c) => folderCodeFromName(c.name)));
}

export async function canViewFolderPath(
  user: SessionUser,
  path: string,
): Promise<boolean> {
  if (hasFullGedBrowse(user)) return true;
  if (!hasPermission(user, "ged.view_scoped")) return false;

  const year = yearFromPath(path) ?? new Date().getFullYear();
  const yearRoot = `/${year}`;

  // Racine année : OK (liste filtrée ensuite)
  if (path === yearRoot) return true;

  // Clients
  if (path === `${yearRoot}/03_CLIENTS`) return true;
  if (path.startsWith(`${yearRoot}/03_CLIENTS/`)) {
    const seg = path.split("/")[3]; // code client
    if (!seg) return false;
    const allowed = await allowedClientFolderCodes(user);
    return allowed.has(seg);
  }

  // Collaborateurs — soi uniquement
  const own = ownCollabPathPrefix(user, year);
  if (path === `${yearRoot}/05_COLLABORATEURS`) return true;
  if (path === own || path.startsWith(`${own}/`)) return true;

  return false;
}

/** Filtre enfants d’un dossier selon le scope. */
export async function filterVisibleFolders<
  T extends { code: string; path: string },
>(user: SessionUser, parentPath: string | null, folders: T[]): Promise<T[]> {
  if (hasFullGedBrowse(user)) return folders;

  const year = parentPath
    ? (yearFromPath(parentPath) ?? new Date().getFullYear())
    : new Date().getFullYear();
  const yearRoot = `/${year}`;

  // Enfants de la racine année
  if (!parentPath || parentPath === yearRoot) {
    return folders.filter((f) => SCOPED_YEAR_ROOT_CODES.has(f.code));
  }

  // Enfants de 03_CLIENTS
  if (parentPath === `${yearRoot}/03_CLIENTS`) {
    const allowed = await allowedClientFolderCodes(user);
    return folders.filter((f) => allowed.has(f.code));
  }

  // Enfants de 05_COLLABORATEURS
  if (parentPath === `${yearRoot}/05_COLLABORATEURS`) {
    const slug = collabFolderSlug(user.lastName, user.firstName);
    return folders.filter((f) => f.code === slug);
  }

  // Sous un dossier déjà autorisé : tout le sous-arbre OK
  if (await canViewFolderPath(user, parentPath)) {
    return folders;
  }

  return [];
}
