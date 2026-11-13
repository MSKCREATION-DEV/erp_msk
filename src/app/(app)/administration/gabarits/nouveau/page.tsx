import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { TemplateCreateForm } from "@/components/admin/template-create-form";

export const metadata: Metadata = { title: "Nouveau gabarit" };

export default async function NewTemplatePage() {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.templates")) redirect("/accueil");

  const variables = await prisma.templateVariableDef.findMany({
    select: { slug: true },
  });

  return (
    <PageShell>
      <PageHeader
        title="Nouveau gabarit"
        description="Créé en brouillon — blocs + variables {{slug}}, signature désactivée par défaut. À publier depuis sa fiche pour pouvoir générer un document officiel."
        backHref="/administration/gabarits"
        backLabel="Retour aux gabarits"
        breadcrumbs={[
          { label: "Administration" },
          { label: "Gabarits", href: "/administration/gabarits" },
          { label: "Nouveau" },
        ]}
      />
      <TemplateCreateForm knownVariableSlugs={variables.map((v) => v.slug)} />
    </PageShell>
  );
}
