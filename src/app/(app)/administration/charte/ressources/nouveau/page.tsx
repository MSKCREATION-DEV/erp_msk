import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { ResourceCreateForm } from "@/components/admin/charte/resource-forms";

export const metadata: Metadata = { title: "Nouvelle ressource brand" };

export default async function NouvelleRessourcePage() {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.brand")) redirect("/accueil");

  return (
    <PageShell>
      <PageHeader
        title="Nouvelle ressource"
        description="Icône, picto, illustration, motif ou fond."
        backHref="/administration/charte/ressources"
        breadcrumbs={[
          { label: "Administration" },
          { label: "Charte", href: "/administration/charte" },
          { label: "Ressources", href: "/administration/charte/ressources" },
          { label: "Nouveau" },
        ]}
      />
      <ResourceCreateForm />
    </PageShell>
  );
}
