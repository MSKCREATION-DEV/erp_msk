import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DocStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { ensureYearTree, getFolderBreadcrumb } from "@/lib/ged/tree";
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

  // Bootstrap arbo une seule fois si absente (évite N upserts à chaque visite)
  let yearRoot = await prisma.documentFolder.findUnique({
    where: { path: `/${year}` },
  });
  if (!yearRoot) {
    await ensureYearTree(
      year,
      hasPermission(user, "ged.manage_folders") ? user.id : undefined,
    );
    yearRoot = await prisma.documentFolder.findUnique({
      where: { path: `/${year}` },
    });
  }

  const folderId = folderParam ?? null;
  const current = folderId
    ? await prisma.documentFolder.findUnique({ where: { id: folderId } })
    : null;

  const breadcrumbs = current ? await getFolderBreadcrumb(current.id) : [];

  const parentId = current?.id ?? null;
  const folders = await prisma.documentFolder.findMany({
    where: parentId
      ? { parentId }
      : { parentId: null, year },
    orderBy: [{ code: "asc" }, { name: "asc" }],
    select: { id: true, name: true, code: true, path: true },
  });

  // At absolute root (no folder): show year roots only via year folder children
  const listFolders =
    !folderId && yearRoot
      ? await prisma.documentFolder.findMany({
          where: { parentId: yearRoot.id },
          orderBy: { code: "asc" },
          select: { id: true, name: true, code: true, path: true },
        })
      : folders;

  const documents = current
    ? await prisma.document.findMany({
        where: {
          folderId: current.id,
          status: DocStatus.ACTIVE,
          softDeletedAt: null,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          originalName: true,
          mime: true,
          size: true,
          createdAt: true,
        },
      })
    : [];

  return (
    <PageShell>
      <PageHeader
        title="GED"
        description="Documents MSK — navigation type Drive : fil d’Ariane, dossier courant, dépôt latéral."
        breadcrumbs={[
          { label: "Accueil", href: "/accueil" },
          { label: "GED" },
        ]}
      />
      <GedBrowser
        folderId={current?.id ?? null}
        breadcrumbs={breadcrumbs.map((b) => ({ id: b.id, name: b.name }))}
        folders={folderId ? folders : listFolders}
        documents={documents.map((d) => ({
          ...d,
          createdAt: d.createdAt.toISOString(),
        }))}
        canUpload={hasPermission(user, "ged.upload")}
        canDelete={hasPermission(user, "ged.delete")}
        yearRootId={yearRoot?.id ?? null}
      />
    </PageShell>
  );
}
