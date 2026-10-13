import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { ScriptForm } from "@/components/crm/script-form";

export const metadata: Metadata = { title: "Nouveau script" };

export default async function CrmScriptNouveauPage() {
  const user = await requireUser();
  if (!hasPermission(user, "crm.scripts.manage")) redirect("/crm/scripts");

  return (
    <PageShell>
      <PageHeader
        title="Nouveau script"
        description="Modèle de message ou trame d’appel pour les commerciaux."
        backHref="/crm/scripts"
        backLabel="Retour aux scripts"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Scripts", href: "/crm/scripts" },
          { label: "Nouveau" },
        ]}
      />
      <ScriptForm />
    </PageShell>
  );
}
