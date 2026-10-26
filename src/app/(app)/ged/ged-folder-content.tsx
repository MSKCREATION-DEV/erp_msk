import { redirect } from "next/navigation";
import { DocStatus } from "@prisma/client";
import { hasPermission, type SessionUser } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import {
  ensureCollaboratorFolders,
  ensureYearTree,
  getFolderBreadcrumb,
  isProtectedFolder,
} from "@/lib/ged/tree";
import {
  canListDocumentsInFolder,
  canViewFolderPath,
  filterVisibleFolders,
  hasFullGedBrowse,
} from "@/lib/ged/scope";
import { GedBrowser } from "@/components/ged/ged-browser";

/** Données + navigateur d’un dossier — isolé pour Suspense (pas de flash blanc). */
export async function GedFolderContent({
  user,
  folderParam,
}: {
  user: SessionUser;
  folderParam?: string;
}) {
  const year = new Date().getFullYear();
  const folderId = folderParam ?? null;

  const [yearRootMaybe, currentMaybe] = await Promise.all([
    prisma.documentFolder.findUnique({
      where: { path: `/${year}` },
      select: { id: true, path: true },
    }),
    folderId
      ? prisma.documentFolder.findUnique({
          where: { id: folderId },
          select: { id: true, name: true, path: true, parentId: true },
        })
      : Promise.resolve(null),
  ]);

  let yearRoot = yearRootMaybe;
  if (!yearRoot) {
    await ensureYearTree(
      year,
      hasPermission(user, "ged.manage_folders") ? user.id : undefined,
    );
    yearRoot = await prisma.documentFolder.findUnique({
      where: { path: `/${year}` },
      select: { id: true, path: true },
    });
  }

  if (!hasFullGedBrowse(user) && hasPermission(user, "ged.view_scoped")) {
    await ensureCollaboratorFolders(
      user.firstName,
      user.lastName,
      year,
      user.id,
    ).catch(() => null);
  }

  if (!folderId && yearRoot) {
    redirect(`/ged?folder=${yearRoot.id}`);
  }

  const current = currentMaybe;
  if (folderId && !current) {
    redirect("/ged");
  }

  if (current && !(await canViewFolderPath(user, current.path))) {
    if (yearRoot) redirect(`/ged?folder=${yearRoot.id}`);
    redirect("/accueil");
  }

  const parentForChildren = current?.id ?? null;

  const [breadcrumbs, foldersRaw, documentsRaw] = await Promise.all([
    current ? getFolderBreadcrumb(current.id) : Promise.resolve([]),
    parentForChildren
      ? prisma.documentFolder.findMany({
          where: { parentId: parentForChildren },
          orderBy: [{ code: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            code: true,
            path: true,
            _count: {
              select: {
                children: true,
                documents: {
                  where: {
                    status: DocStatus.ACTIVE,
                    softDeletedAt: null,
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
    current
      ? prisma.document.findMany({
          where: {
            folderId: current.id,
            status: DocStatus.ACTIVE,
            softDeletedAt: null,
          },
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true,
            originalName: true,
            mime: true,
            size: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const foldersVisible = await filterVisibleFolders(
    user,
    current?.path ?? null,
    foldersRaw,
  );

  const documents =
    current && (await canListDocumentsInFolder(user, current.path))
      ? documentsRaw
      : [];

  const folders = foldersVisible.map((f) => ({
    id: f.id,
    name: f.name,
    code: f.code,
    path: f.path,
    childFolderCount: f._count.children,
    childFileCount: f._count.documents,
    isProtected: isProtectedFolder(f),
  }));

  return (
    <GedBrowser
      folderId={current?.id ?? null}
      breadcrumbs={breadcrumbs.map((b) => ({ id: b.id, name: b.name }))}
      folders={folders}
      documents={documents.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
      }))}
      canUpload={hasPermission(user, "ged.upload")}
      canDelete={hasPermission(user, "ged.delete")}
      canManageFolders={hasPermission(user, "ged.manage_folders")}
      yearRootId={yearRoot?.id ?? null}
    />
  );
}
