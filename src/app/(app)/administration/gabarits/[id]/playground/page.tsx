import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { TemplatePlaygroundForm } from "@/components/admin/template-playground-form";
import { blocksToText } from "@/lib/studio/dsl";
import { parseBlocks } from "@/lib/studio/types";
import { canGenerateExemplaire } from "@/lib/studio/generate-sample-pdf";

export const metadata: Metadata = { title: "Playground gabarit" };

export default async function GabaritPlaygroundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.templates")) redirect("/accueil");

  const { id } = await params;
  const template = await prisma.documentTemplate.findUnique({
    where: { id },
    include: { publishedVersion: true },
  });
  if (!template) notFound();

  if (!canGenerateExemplaire(template)) {
    redirect(`/administration/gabarits/${id}`);
  }

  const editable = template.generatorKind === "ENGINE_BLOCKS";
  const initialBody =
    editable && template.publishedVersion
      ? blocksToText(parseBlocks(template.publishedVersion.bodyJson))
      : "";

  return (
    <PageShell>
      <PageHeader
        title="Playground"
        description={`Aperçu éditable — ${template.name} (${template.code}). Les changements ne sont pas enregistrés tant que vous ne publiez pas depuis l’éditeur.`}
        backHref={`/administration/gabarits/${id}`}
        backLabel="Retour à la fiche"
        breadcrumbs={[
          { label: "Administration" },
          { label: "Gabarits", href: "/administration/gabarits" },
          { label: template.name, href: `/administration/gabarits/${id}` },
          { label: "Playground" },
        ]}
      />

      <TemplatePlaygroundForm
        templateId={template.id}
        templateName={template.name}
        initialBodyText={initialBody}
        signatureDefaultOff={!template.signatureEnabled}
        editable={editable}
      />
    </PageShell>
  );
}
