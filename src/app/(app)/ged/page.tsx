import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DocStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import {
  ensureYearTree,
  getFolderBreadcrumb,
  isProtectedFolder,
} from "@/lib/ged/tree";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { GedBrowser } from "@/components/ged/ged-browser";

export const metadata: Metadata = { title: "GED" };

export default async function GedPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const user = await requireUser();
  if (!hasAnyPermission(user, ["ged.browse", "ged.view_scoped"])) {
    redirect("/accueil");
  }

  const { folder: folderParam } = await searchParams;
  const year = new Date().getFullYear();
  const folderId = folderParam ?? null;

  // Lecture parallèle ; bootstrap seulement si racine année absente
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

  // /ged sans dossier → ouvrir l’année courante
  if (!folderId && yearRoot) {
    redirect(`/ged?folder=${yearRoot.id}`);
  }

  const current = currentMaybe;
  if (folderId && !current) {
    redirect("/ged");
  }

  const parentForChildren = current?.id ?? null;

  const [breadcrumbs, foldersRaw, documents] = await Promise.all([
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

  const folders = foldersRaw.map((f) => ({
    id: f.id,
    name: f.name,
    code: f.code,
    path: f.path,
    childFolderCount: f._count.children,
    childFileCount: f._count.documents,
    isProtected: isProtectedFolder(f),
  }));

  return (
    <PageShell>
      <PageHeader
        title="GED"
        description="Documents MSK — aperçu, affichage, tri et regroupement."
        breadcrumbs={[
          { label: "Accueil", href: "/accueil" },
          { label: "GED" },
        ]}
      />
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
    </PageShell>
  );
}
