import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasFullGedBrowse, hasGedAccess } from "@/lib/ged/scope";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { GedBrowserSkeleton } from "@/components/ged/ged-browser-skeleton";
import { GedFolderContent } from "./ged-folder-content";

export const metadata: Metadata = { title: "GED" };

export default async function GedPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const user = await requireUser();
  if (!hasGedAccess(user)) {
    redirect("/accueil");
  }

  const { folder: folderParam } = await searchParams;

  return (
    <PageShell>
      <PageHeader
        title="GED"
        description={
          hasFullGedBrowse(user)
            ? "Documents MSK — aperçu, affichage, tri et regroupement."
            : "Vos dossiers (clients liés + espace collaborateur)."
        }
        breadcrumbs={[
          { label: "Accueil", href: "/accueil" },
          { label: "GED" },
        ]}
      />
      {/*
        key=dossier → au changement de folder, Suspense reaffiche le skeleton
        (le header reste) au lieu d’un flash blanc page entière.
      */}
      <Suspense
        key={folderParam ?? "root"}
        fallback={<GedBrowserSkeleton />}
      >
        <GedFolderContent user={user} folderParam={folderParam} />
      </Suspense>
    </PageShell>
  );
}
