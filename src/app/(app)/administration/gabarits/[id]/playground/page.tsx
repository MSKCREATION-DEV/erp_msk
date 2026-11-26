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
import { findCompositeRenderer } from "@/lib/studio/composite";
import { canGenerateExemplaire } from "@/lib/studio/generate-sample-pdf";
import { sampleOfficialPayloadForTemplate } from "@/lib/studio/sample-official-payload";
import { extractVariableSlugs } from "@/lib/studio/variables";
import { parseDocumentChrome } from "@/lib/studio/document-chrome";
import { listActiveCharteLogos } from "@/lib/studio/charte-logos";

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
  const blocks =
    editable && template.publishedVersion
      ? parseBlocks(template.publishedVersion.bodyJson)
      : [];
  const initialBody = editable && blocks.length > 0 ? blocksToText(blocks) : "";
  const hasComposite = Boolean(findCompositeRenderer(blocks));
  const bodySlugs = extractVariableSlugs(initialBody);
  const initialChrome = parseDocumentChrome(template.structureJson);

  const charteLogos = await listActiveCharteLogos();

  let variableDefs: Array<{
    slug: string;
    label: string;
    sampleValue: string | null;
  }>;
  if (bodySlugs.length === 0) {
    variableDefs = await prisma.templateVariableDef.findMany({
      orderBy: [{ category: "asc" }, { slug: "asc" }],
      take: 40,
      select: { slug: true, label: true, sampleValue: true },
    });
  } else {
    const matched = await prisma.templateVariableDef.findMany({
      where: { slug: { in: bodySlugs } },
      orderBy: { slug: "asc" },
      select: { slug: true, label: true, sampleValue: true },
    });
    const found = new Set(matched.map((m) => m.slug));
    const missing = bodySlugs
      .filter((s) => !found.has(s))
      .map((slug) => ({
        slug,
        label: slug,
        sampleValue: null as string | null,
      }));
    variableDefs = [...matched, ...missing];
  }

  return (
    <PageShell>
      <PageHeader
        title="Playground"
        description={`Chrome (en-tête / pied / logo Charte), données test, DSL, preview HTML live et PDF — ${template.name} (${template.code}).`}
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
        templateCode={template.code}
        initialBodyText={initialBody}
        signatureDefaultOff={!template.signatureEnabled}
        editable={editable}
        variableDefs={variableDefs}
        hasComposite={hasComposite}
        samplePayload={sampleOfficialPayloadForTemplate(template)}
        initialChrome={initialChrome}
        charteLogos={charteLogos}
      />
    </PageShell>
  );
}
