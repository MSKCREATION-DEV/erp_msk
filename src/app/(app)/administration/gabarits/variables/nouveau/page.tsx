import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { TemplateVariableCreateForm } from "@/components/admin/template-variable-create-form";

export const metadata: Metadata = { title: "Nouvelle variable" };

export default async function NewTemplateVariablePage() {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.templates")) redirect("/accueil");

  return (
    <PageShell>
      <PageHeader
        title="Nouvelle variable"
        description="Ajouter une variable {{slug}} au catalogue central du Studio documentaire."
        backHref="/administration/gabarits/variables"
        backLabel="Retour au catalogue"
        breadcrumbs={[
          { label: "Administration" },
          { label: "Gabarits", href: "/administration/gabarits" },
          { label: "Variables", href: "/administration/gabarits/variables" },
          { label: "Nouvelle" },
        ]}
      />
      <TemplateVariableCreateForm />
    </PageShell>
  );
}
