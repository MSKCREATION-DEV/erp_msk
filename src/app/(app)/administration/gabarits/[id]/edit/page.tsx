import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { blocksToText } from "@/lib/studio/dsl";
import { parseBlocks } from "@/lib/studio/types";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { TemplateEditForm } from "@/components/admin/template-edit-form";

export const metadata: Metadata = { title: "Éditer le gabarit" };

export default async function GabaritEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.templates")) redirect("/accueil");

  const { id } = await params;
  const template = await prisma.documentTemplate.findUnique({
    where: { id },
    include: {
      publishedVersion: true,
      versions: { orderBy: { version: "desc" }, take: 1 },
    },
  });
  if (!template) notFound();
  if (template.generatorKind !== "ENGINE_BLOCKS") {
    // Gabarit legacy — pas d’éditeur Studio, pas d’intention de casser le
    // générateur code existant.
    redirect(`/administration/gabarits/${id}`);
  }

  const latestDraft = template.versions[0]?.status === "DRAFT" ? template.versions[0] : null;
  const source = latestDraft ?? template.publishedVersion;
  const initialBodyText = source ? blocksToText(parseBlocks(source.bodyJson)) : "";

  const lastVersionNumber = Math.max(
    template.publishedVersion?.version ?? 0,
    latestDraft?.version ?? 0,
  );

  const knownVariables = await prisma.templateVariableDef.findMany({
    select: { slug: true },
    orderBy: { slug: "asc" },
  });

  return (
    <PageShell>
      <PageHeader
        title={`Éditer — ${template.name}`}
        description="Le contenu modifié devient un nouveau brouillon, à publier explicitement."
        backHref={`/administration/gabarits/${id}`}
        backLabel="Retour à la fiche"
        breadcrumbs={[
          { label: "Administration" },
          { label: "Gabarits", href: "/administration/gabarits" },
          { label: template.name, href: `/administration/gabarits/${id}` },
          { label: "Éditer" },
        ]}
      />

      <TemplateEditForm
        templateId={template.id}
        initialBodyText={initialBodyText}
        knownVariableSlugs={knownVariables.map((v) => v.slug)}
        nextVersion={lastVersionNumber + 1}
      />
    </PageShell>
  );
}
